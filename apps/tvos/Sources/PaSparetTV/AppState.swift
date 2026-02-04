import Foundation

/// Observable state container that owns the WebSocket lifecycle and publishes
/// game state for SwiftUI views.  All stored-property mutations are isolated
/// to the main actor via the class-level annotation.
@MainActor
class AppState: ObservableObject {

    // MARK: – published game state
    @Published var phase       : String            = "LOBBY"
    @Published var players     : [Player]          = []
    @Published var clueText    : String?
    @Published var levelPoints : Int?
    @Published var scoreboard        : [ScoreboardEntry] = []
    @Published var joinCode          : String?
    @Published var lockedAnswersCount: Int     = 0
    @Published var brakeOwnerName    : String?
    @Published var destinationName   : String?
    @Published var destinationCountry: String?
    @Published var results           : [PlayerResult] = []
    @Published var followupQuestion  : FollowupQuestionInfo?
    @Published var followupResults   : (correctAnswer: String, rows: [FollowupResultRow])?
    @Published var showConfetti      : Bool = false

    // MARK: – connection status
    @Published var isConnected : Bool   = false
    @Published var error       : String?
    @Published var sessionReady: Bool   = false   // true after first STATE_SNAPSHOT

    // MARK: – session credentials (populated after REST join)
    var token     : String?
    var wsUrl     : String?
    var sessionId : String?

    // MARK: – audio
    let audio = AudioManager()

    // MARK: – reconnect bookkeeping
    private var wsTask          : URLSessionWebSocketTask?
    private var reconnectAttempt: Int  = 0
    private static let maxAttempts    = 10
    private static let maxDelay       = 10.0   // seconds (backoff cap)

    // MARK: – connect ────────────────────────────────────────────────────────

    /// Open (or re-open) the WebSocket.  Safe to call repeatedly.
    func connect() {
        guard let token    = token,
              let wsUrl    = wsUrl,
              let url      = URL(string: "\(wsUrl)?token=\(token)") else { return }

        wsTask?.cancel(with: .normalClosure, reason: nil)

        let task = URLSession.shared.webSocketTask(with: url)
        wsTask   = task
        task.resume()

        isConnected = true
        error       = nil

        // Fire-and-forget receive loop; hops back to @MainActor per message.
        Task.detached { [weak self] in
            await self?.receiveLoop(task)
        }
    }

    // MARK: – receive loop ───────────────────────────────────────────────────

    /// Runs inside a detached task.  Each `await task.receive()` suspends and
    /// releases the main actor; message handling re-acquires it.
    private func receiveLoop(_ task: URLSessionWebSocketTask) async {
        do {
            while true {
                let msg  = try await task.receive()
                let text : String

                switch msg {
                case .string(let s): text = s
                case .data(let d)  : text = String(data: d, encoding: .utf8) ?? ""
                @unknown default   : continue
                }

                await dispatch(text)
            }
        } catch {
            // Connection closed or errored — schedule a reconnect.
            await scheduleReconnect()
        }
    }

    // MARK: – message dispatch ───────────────────────────────────────────────

    private func dispatch(_ raw: String) async {
        guard let data = raw.data(using: .utf8),
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let type = json["type"] as? String
        else { return }

        switch type {

        // ── auth handshake ──────────────────────────────────────────────
        case "WELCOME":
            reconnectAttempt = 0          // connection is healthy
            await sendResume()

        // ── full-state restore (initial join or reconnect) ─────────────
        case "STATE_SNAPSHOT":
            guard let payload  = json["payload"]  as? [String: Any],
                  let stateRaw = payload["state"] as? [String: Any],
                  let stateData = try? JSONSerialization.data(withJSONObject: stateRaw),
                  let state     = try? JSONDecoder().decode(GameState.self, from: stateData)
            else { break }
            applyState(state)

        // ── incremental updates ─────────────────────────────────────────
        case "CLUE_PRESENT":
            guard let payload = json["payload"] as? [String: Any] else { break }
            if let t = payload["clueText"]        as? String { clueText    = t }
            if let p = payload["clueLevelPoints"] as? Int    { levelPoints = p }
            phase          = "CLUE_LEVEL"
            brakeOwnerName = nil

        case "LOBBY_UPDATED":
            guard let payload = json["payload"]  as? [String: Any],
                  let arr     = payload["players"] as? [[String: Any]]
            else { break }
            players = arr.compactMap { d in
                guard let id   = d["playerId"]    as? String,
                      let name = d["name"]        as? String else { return nil }
                return Player(playerId: id, name: name,
                              isConnected: d["isConnected"] as? Bool ?? true)
            }

        case "BRAKE_ACCEPTED":
            guard let payload = json["payload"] as? [String: Any] else { break }
            brakeOwnerName = payload["playerName"] as? String
            phase          = "PAUSED_FOR_BRAKE"

        case "BRAKE_ANSWER_LOCKED":
            lockedAnswersCount += 1
            brakeOwnerName      = nil
            phase               = "CLUE_LEVEL"

        case "DESTINATION_REVEAL":
            guard let payload = json["payload"] as? [String: Any] else { break }
            destinationName    = payload["destinationName"] as? String
            destinationCountry = payload["country"]         as? String
            phase              = "REVEAL_DESTINATION"

        case "DESTINATION_RESULTS":
            guard let payload = json["payload"]  as? [String: Any],
                  let raw     = payload["results"] as? [[String: Any]]
            else { break }
            results = raw.compactMap { d in
                guard let pid  = d["playerId"]            as? String,
                      let name = d["playerName"]          as? String,
                      let ans  = d["answerText"]          as? String,
                      let ok   = d["isCorrect"]           as? Bool,
                      let pts  = d["pointsAwarded"]       as? Int,
                      let lvl  = d["lockedAtLevelPoints"] as? Int
                else { return nil }
                return PlayerResult(playerId: pid, playerName: name,
                                    answerText: ans, isCorrect: ok,
                                    pointsAwarded: pts, lockedAtLevelPoints: lvl)
            }
            phase = "SCOREBOARD"

        case "SCOREBOARD_UPDATE":
            guard let payload = json["payload"] as? [String: Any],
                  let raw     = payload["scoreboard"] as? [[String: Any]]
            else { break }
            scoreboard = raw.compactMap { d in
                guard let pid  = d["playerId"] as? String,
                      let name = d["name"]     as? String,
                      let score = d["score"]   as? Int
                else { return nil }
                return ScoreboardEntry(playerId: pid, name: name, totalScore: score)
            }

        case "FOLLOWUP_QUESTION_PRESENT":
            guard let payload = json["payload"] as? [String: Any],
                  let qText   = payload["questionText"] as? String
            else { break }
            let options              = payload["options"]              as? [String]
            let currentIdx           = payload["currentQuestionIndex"] as? Int ?? 0
            let total                = payload["totalQuestions"]       as? Int ?? 1
            let duration             = payload["timerDurationMs"]      as? Int
            // Server does not send startAtServerMs in the event; use current time as approx start
            followupQuestion = FollowupQuestionInfo(
                questionText: qText, options: options,
                currentQuestionIndex: currentIdx, totalQuestions: total,
                timerStartMs: Int(Date().timeIntervalSince1970 * 1000), timerDurationMs: duration)
            followupResults  = nil
            phase            = "FOLLOWUP_QUESTION"

        case "FOLLOWUP_RESULTS":
            guard let payload = json["payload"] as? [String: Any],
                  let correct = payload["correctAnswer"] as? String,
                  let raw     = payload["results"]       as? [[String: Any]]
            else { break }
            let rows = raw.compactMap { d -> FollowupResultRow? in
                guard let pid  = d["playerId"]      as? String,
                      let name = d["playerName"]    as? String,
                      let ok   = d["isCorrect"]     as? Bool,
                      let pts  = d["pointsAwarded"] as? Int
                else { return nil }
                return FollowupResultRow(playerId: pid, playerName: name, isCorrect: ok, pointsAwarded: pts)
            }
            followupResults = (correctAnswer: correct, rows: rows)

        // ── audio events (contracts/audio_timeline.md) ────────────────────
        case "MUSIC_SET":
            guard let payload = json["payload"] as? [String: Any],
                  let trackId = payload["trackId"] as? String else { break }
            audio.playMusic(
                trackId:  trackId,
                fadeInMs: payload["fadeInMs"] as? Int    ?? 300,
                loop:     (payload["mode"]    as? String ?? "loop") == "loop",
                gainDb:   (payload["gainDb"]  as? Double).map(Float.init) ?? 0)

        case "MUSIC_STOP":
            let fadeOutMs = (json["payload"] as? [String: Any])?["fadeOutMs"] as? Int ?? 600
            audio.stopMusic(fadeOutMs: fadeOutMs)

        case "MUSIC_GAIN_SET":
            guard let payload = json["payload"] as? [String: Any],
                  let db      = payload["gainDb"] as? Double else { break }
            audio.setMusicGain(gainDb: Float(db))

        case "SFX_PLAY":
            guard let payload = json["payload"] as? [String: Any],
                  let sfxId   = payload["sfxId"] as? String else { break }
            audio.playSFX(sfxId: sfxId,
                          volume: (payload["volume"] as? Double).map(Float.init) ?? 1.0)

        case "AUDIO_PLAY":
            guard let payload = json["payload"]  as? [String: Any],
                  let clipId  = payload["clipId"]     as? String,
                  let urlStr  = payload["url"]        as? String,
                  let url     = URL(string: urlStr),
                  let durMs   = payload["durationMs"] as? Int else { break }
            audio.playVoice(clipId: clipId, url: url, durationMs: durMs)

        case "AUDIO_STOP":
            audio.stopVoice()

        case "UI_EFFECT_TRIGGER":
            guard let payload  = json["payload"] as? [String: Any],
                  let effectId = payload["effectId"] as? String else { break }
            if effectId == "confetti" { showConfetti = true }

        case "TTS_PREFETCH":
            guard let payload = json["payload"] as? [String: Any],
                  let clips   = payload["clips"] as? [[String: Any]] else { break }
            audio.prefetch(clips: clips.compactMap { c -> (id: String, url: URL)? in
                guard let id  = c["clipId"] as? String,
                      let str = c["url"]    as? String,
                      let url = URL(string: str) else { return nil }
                return (id: id, url: url)
            })

        case "FINAL_RESULTS_PRESENT":
            phase = "FINAL_RESULTS"
            if !showConfetti {
                audio.playSFX(sfxId: "sfx_winner_fanfare")
                showConfetti = true
            }

        default:
            break
        }
    }

    // MARK: – resume handshake ───────────────────────────────────────────────

    /// Send RESUME_SESSION after WELCOME — mirrors the web client's useWebSocket.
    private func sendResume() async {
        let msg: [String: Any] = [
            "type"        : "RESUME_SESSION",
            "sessionId"   : sessionId ?? "",
            "serverTimeMs": Int(Date().timeIntervalSince1970 * 1000),
            "payload"     : [
                "playerId"            : "",       // TV role has no playerId
                "lastReceivedEventId" : NSNull()
            ] as [String: Any]
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: msg),
              let str  = String(data: data, encoding: .utf8)
        else { return }
        try? await wsTask?.send(.string(str))
    }

    // MARK: – helpers ─────────────────────────────────────────────────────────

    private func applyState(_ state: GameState) {
        let enteringFinale  = (state.phase == "FINAL_RESULTS" && phase != "FINAL_RESULTS")
        sessionReady        = true
        phase               = state.phase
        players             = state.players
        clueText            = state.clueText
        levelPoints         = state.levelPoints
        scoreboard          = state.scoreboard
        lockedAnswersCount  = state.lockedAnswersCount
        brakeOwnerName      = state.brakeOwnerName
        destinationName     = state.destinationName
        destinationCountry  = state.destinationCountry
        if let jc           = state.joinCode { joinCode = jc }
        followupQuestion    = state.followupQuestion
        if state.phase != "FOLLOWUP_QUESTION" { followupResults = nil }

        // Fallback: fanfare + confetti on FINAL_RESULTS entry.
        // Covers reconnect mid-finale when the SFX event sequence is missed.
        if enteringFinale && !showConfetti {
            audio.playSFX(sfxId: "sfx_winner_fanfare")
            showConfetti = true
        }
    }

    /// Exponential-backoff reconnect (1 s … 10 s, max 10 attempts).
    private func scheduleReconnect() async {
        isConnected      = false
        reconnectAttempt += 1

        guard reconnectAttempt <= Self.maxAttempts, token != nil else {
            error = "Connection lost — restart the app."
            return
        }

        let delay = min(pow(2.0, Double(reconnectAttempt - 1)), Self.maxDelay)
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        connect()
    }
}
