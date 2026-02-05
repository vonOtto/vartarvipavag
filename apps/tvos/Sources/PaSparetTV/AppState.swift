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
    @Published var voiceOverlayText  : String? = nil
    @Published var hostName          : String? = nil

    // MARK: – connection status
    /// True once the server has sent WELCOME on the current socket.
    /// Set back to false by scheduleReconnect.  Never set optimistically in connect().
    @Published var isConnected : Bool   = false
    @Published var error       : String?
    @Published var sessionReady: Bool   = false   // true after first STATE_SNAPSHOT

    /// Latched to true after the first successful WELCOME.  Used by ConnectingView
    /// to distinguish "Connecting…" (never connected yet) from "Reconnecting…".
    @Published var hasEverConnected: Bool = false

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

        // Do NOT set isConnected here — wait for WELCOME from the server.
        // Setting it optimistically caused a flicker: connect() toggled it true,
        // then the receive loop would throw before WELCOME arrived and
        // scheduleReconnect() would flip it back to false within the same frame.
        error = nil

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
            reconnectAttempt    = 0       // connection is healthy
            isConnected         = true    // authoritative: server acknowledged us
            hasEverConnected    = true
            await sendResume()

        // ── full-state restore (initial join or reconnect) ─────────────
        case "STATE_SNAPSHOT":
            guard let payload  = json["payload"]  as? [String: Any],
                  let stateRaw = payload["state"] as? [String: Any],
                  let stateData = try? JSONSerialization.data(withJSONObject: stateRaw),
                  let state     = try? JSONDecoder().decode(GameState.self, from: stateData)
            else { break }
            // Derive hostName from the raw players array (role field is not in the Player model)
            let rawPlayers = stateRaw["players"] as? [[String: Any]] ?? []
            let snapshotHostName = rawPlayers
                .first(where: { ($0["role"] as? String) == "host" })
                .flatMap { $0["name"] as? String }
            applyState(state, hostName: snapshotHostName)

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
            else {
                print("[DEBUG TV] LOBBY_UPDATED received but payload/players missing — raw: \(raw)")
                break
            }
            print("[DEBUG TV] LOBBY_UPDATED — \(arr.count) player(s): \(arr.map { $0["name"] ?? "?" })")
            players = arr.compactMap { d in
                guard let id   = d["playerId"]    as? String,
                      let name = d["name"]        as? String else { return nil }
                return Player(playerId: id, name: name,
                              isConnected: d["isConnected"] as? Bool ?? true)
            }
            // host is either { "name": "…" } or null / absent
            if let hostDict = payload["host"] as? [String: Any] {
                hostName = hostDict["name"] as? String
            } else {
                hostName = nil
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
            let vol = (payload["volume"] as? Double).map { Float($0) } ?? 1.0
            audio.playVoice(clipId: clipId, url: url, durationMs: durMs, volume: vol)
            if (payload["showText"] as? Bool) == true, let text = payload["text"] as? String {
                voiceOverlayText = text
                Task { [self] in
                    try? await Task.sleep(nanoseconds: UInt64(durMs) * 1_000_000)
                    await MainActor.run { self.voiceOverlayText = nil }
                }
            }

        case "AUDIO_STOP":
            audio.stopVoice()
            voiceOverlayText = nil

        case "VOICE_LINE":
            guard let payload = json["payload"] as? [String: Any],
                  let text    = payload["text"]  as? String else { break }
            if let clipId = payload["clipId"] as? String,
               let urlStr  = payload["url"]    as? String,
               let url     = URL(string: urlStr),
               let durMs    = payload["durationMs"] as? Int {
                // TTS clip available — play audio + show overlay (same as AUDIO_PLAY showText)
                audio.playVoice(clipId: clipId, url: url, durationMs: durMs)
                voiceOverlayText = text
                Task { [self] in
                    try? await Task.sleep(nanoseconds: UInt64(durMs) * 1_000_000)
                    await MainActor.run { self.voiceOverlayText = nil }
                }
            } else {
                // Text-only fallback: overlay only, no audio
                let displayMs = payload["displayDurationMs"] as? Int ?? 3000
                voiceOverlayText = text
                Task { [self] in
                    try? await Task.sleep(nanoseconds: UInt64(displayMs) * 1_000_000)
                    await MainActor.run { self.voiceOverlayText = nil }
                }
            }

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
                "playerId"            : "tv",     // must match backend's actualPlayerId for TV role
                "lastReceivedEventId" : NSNull()
            ] as [String: Any]
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: msg),
              let str  = String(data: data, encoding: .utf8)
        else { return }
        try? await wsTask?.send(.string(str))
    }

    // MARK: – helpers ─────────────────────────────────────────────────────────

    private func applyState(_ state: GameState, hostName: String? = nil) {
        let enteringFinale    = (state.phase == "FINAL_RESULTS"       && phase != "FINAL_RESULTS")
        let enteringFollowup  = (state.phase == "FOLLOWUP_QUESTION"  && phase != "FOLLOWUP_QUESTION")
        let enteringClueLevel = (state.phase == "CLUE_LEVEL"         && phase != "CLUE_LEVEL")
        sessionReady        = true
        phase               = state.phase
        players             = state.players
        self.hostName       = hostName
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

        // Re-issue looping music on reconnect into music-bearing phases.
        if enteringFollowup {
            audio.playMusic(trackId: "music_followup_loop", fadeInMs: 300, loop: true, gainDb: 0)
        } else if enteringClueLevel {
            audio.playMusic(trackId: "music_travel_loop",   fadeInMs: 300, loop: true, gainDb: 0)
        }
    }

    /// Exponential-backoff reconnect (1 s … 10 s, max 10 attempts).
    private func scheduleReconnect() async {
        isConnected      = false
        reconnectAttempt += 1

        guard reconnectAttempt <= Self.maxAttempts, token != nil else {
            error = "Anslutningen förlorad — starta appen igen."
            return
        }

        let delay = min(pow(2.0, Double(reconnectAttempt - 1)), Self.maxDelay)
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        connect()
    }

    // MARK: – reset ───────────────────────────────────────────────────────────

    /// Tear down the current session completely.  RootView will show LaunchView
    /// (because sessionId becomes nil), which auto-creates a fresh session.
    func resetSession() {
        // 1. Kill the WebSocket (receive loop will exit; ignore its scheduleReconnect
        //    because we are about to nil out token/wsUrl so the guard in connect() will
        //    short-return).
        wsTask?.cancel(with: .normalClosure, reason: nil)
        wsTask = nil

        // 2. Wipe connection bookkeeping
        reconnectAttempt  = 0
        isConnected       = false
        hasEverConnected  = false
        sessionReady      = false
        error             = nil

        // 3. Wipe session credentials (makes LaunchView appear via RootView)
        token             = nil
        wsUrl             = nil
        sessionId         = nil

        // 4. Wipe all game state
        phase             = "LOBBY"
        players           = []
        joinCode          = nil
        clueText          = nil
        levelPoints       = nil
        scoreboard        = []
        lockedAnswersCount = 0
        brakeOwnerName    = nil
        destinationName   = nil
        destinationCountry = nil
        results           = []
        followupQuestion  = nil
        followupResults   = nil
        showConfetti      = false
        voiceOverlayText  = nil
        hostName          = nil

        // 5. Stop any audio that is still playing
        audio.stopMusic(fadeOutMs: 0)
        audio.stopVoice()
    }
}
