import Foundation

/// Observable state for the host app.  Owns the WebSocket lifecycle and
/// publishes every field the host views need.  All mutations are isolated to
/// the main actor via the class-level annotation.
@MainActor
class HostState: ObservableObject {

    // MARK: – session credentials (set after REST create)
    var sessionId     : String?
    var hostAuthToken : String?
    var wsUrl         : String?
    var joinCode      : String?
    /// Resolved join URL template with {joinCode} replaced.
    var joinURL       : String?

    // MARK: – published game state
    @Published var phase              : String            = "LOBBY"
    @Published var players            : [Player]          = []
    @Published var clueText           : String?
    @Published var levelPoints        : Int?
    @Published var scoreboard         : [ScoreboardEntry] = []
    @Published var lockedAnswers      : [LockedAnswer]    = []
    @Published var destinationName    : String?
    @Published var destinationCountry : String?
    @Published var brakeOwnerPlayerId : String?
    @Published var results            : [PlayerResult]    = []
    @Published var followupQuestion   : HostFollowupQuestion?
    @Published var followupResults    : (correctAnswer: String, rows: [HostFollowupResultRow])?

    // MARK: – connection status
    @Published var isConnected     : Bool   = false
    @Published var hasEverConnected: Bool   = false
    @Published var sessionReady    : Bool   = false
    @Published var error           : String?

    // MARK: – reconnect bookkeeping
    private var wsTask          : URLSessionWebSocketTask?
    private var reconnectAttempt: Int  = 0
    private static let maxAttempts    = 10
    private static let maxDelay       = 10.0

    // MARK: – connect ──────────────────────────────────────────────────────────

    func connect() {
        guard let token = hostAuthToken,
              let ws    = wsUrl,
              let url   = URL(string: "\(ws)?token=\(token)") else { return }

        wsTask?.cancel(with: .normalClosure, reason: nil)

        let task = URLSession.shared.webSocketTask(with: url)
        wsTask   = task
        task.resume()

        isConnected     = true
        hasEverConnected = true
        error           = nil

        Task.detached { [weak self] in
            await self?.receiveLoop(task)
        }
    }

    // MARK: – receive loop ─────────────────────────────────────────────────────

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
            await scheduleReconnect()
        }
    }

    // MARK: – message dispatch ─────────────────────────────────────────────────

    private func dispatch(_ raw: String) async {
        guard let data = raw.data(using: .utf8),
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let type = json["type"] as? String
        else { return }

        switch type {

        case "WELCOME":
            reconnectAttempt = 0
            await sendResume()

        case "STATE_SNAPSHOT":
            guard let payload  = json["payload"]  as? [String: Any],
                  let stateRaw = payload["state"] as? [String: Any],
                  let stateData = try? JSONSerialization.data(withJSONObject: stateRaw),
                  let state     = try? JSONDecoder().decode(HostGameState.self, from: stateData)
            else { break }
            applyState(state)

        case "CLUE_PRESENT":
            guard let payload = json["payload"] as? [String: Any] else { break }
            if let t = payload["clueText"]        as? String { clueText    = t }
            if let p = payload["clueLevelPoints"] as? Int    { levelPoints = p }
            phase          = "CLUE_LEVEL"
            brakeOwnerPlayerId = nil

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
            brakeOwnerPlayerId = payload["playerId"] as? String
            phase              = "PAUSED_FOR_BRAKE"

        case "BRAKE_ANSWER_LOCKED":
            guard let payload = json["payload"] as? [String: Any] else { break }
            // HOST projection includes answerText
            if let pid  = payload["playerId"]            as? String,
               let ans  = payload["answerText"]          as? String,
               let lvl  = payload["lockedAtLevelPoints"] as? Int {
                lockedAnswers.append(
                    LockedAnswer(playerId: pid, answerText: ans,
                                 lockedAtLevelPoints: lvl, lockedAtMs: Int(Date().timeIntervalSince1970 * 1000))
                )
            }
            brakeOwnerPlayerId = nil
            phase              = "CLUE_LEVEL"

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
                      let sc   = d["score"]    as? Int
                else { return nil }
                return ScoreboardEntry(playerId: pid, name: name, totalScore: sc)
            }

        case "FOLLOWUP_QUESTION_PRESENT":
            guard let payload = json["payload"] as? [String: Any],
                  let qText   = payload["questionText"] as? String
            else { break }
            let options      = payload["options"]              as? [String]
            let currentIdx   = payload["currentQuestionIndex"] as? Int ?? 0
            let total        = payload["totalQuestions"]       as? Int ?? 1
            let correct      = payload["correctAnswer"]        as? String ?? ""
            let duration     = payload["timerDurationMs"]      as? Int
            followupQuestion = HostFollowupQuestion(
                questionText:         qText,
                options:              options,
                currentQuestionIndex: currentIdx,
                totalQuestions:       total,
                correctAnswer:        correct,
                timerStartMs:         Int(Date().timeIntervalSince1970 * 1000),
                timerDurationMs:      duration)
            followupResults  = nil
            phase            = "FOLLOWUP_QUESTION"

        case "FOLLOWUP_ANSWERS_LOCKED":
            guard let payload = json["payload"] as? [String: Any] else { break }
            // HOST projection: answersByPlayer array present
            if let raw = payload["answersByPlayer"] as? [[String: Any]] {
                let answers = raw.compactMap { d -> HostFollowupAnswerByPlayer? in
                    guard let pid  = d["playerId"]   as? String,
                          let name = d["playerName"] as? String,
                          let ans  = d["answerText"] as? String
                    else { return nil }
                    return HostFollowupAnswerByPlayer(playerId: pid, playerName: name, answerText: ans)
                }
                followupQuestion?.answersByPlayer = answers
            }

        case "FOLLOWUP_RESULTS":
            guard let payload = json["payload"] as? [String: Any],
                  let correct = payload["correctAnswer"] as? String,
                  let raw     = payload["results"]       as? [[String: Any]]
            else { break }
            let rows = raw.compactMap { d -> HostFollowupResultRow? in
                guard let pid  = d["playerId"]      as? String,
                      let name = d["playerName"]    as? String,
                      let ok   = d["isCorrect"]     as? Bool,
                      let pts  = d["pointsAwarded"] as? Int
                else { return nil }
                return HostFollowupResultRow(playerId: pid, playerName: name, isCorrect: ok, pointsAwarded: pts)
            }
            followupResults = (correctAnswer: correct, rows: rows)

        default:
            break
        }
    }

    // MARK: – host commands ────────────────────────────────────────────────────

    /// Send HOST_START_GAME to the server.
    func sendStartGame() {
        guard let sid = sessionId else { return }
        send([
            "type"        : "HOST_START_GAME",
            "sessionId"   : sid,
            "serverTimeMs": Int(Date().timeIntervalSince1970 * 1000),
            "payload"     : [String: Any]()
        ])
    }

    /// Send HOST_NEXT_CLUE to the server.  Works in both CLUE_LEVEL and
    /// PAUSED_FOR_BRAKE (server releases brake automatically).
    func sendNextClue() {
        guard let sid = sessionId else { return }
        send([
            "type"        : "HOST_NEXT_CLUE",
            "sessionId"   : sid,
            "serverTimeMs": Int(Date().timeIntervalSince1970 * 1000),
            "payload"     : [String: Any]()
        ])
    }

    // MARK: – resume handshake ─────────────────────────────────────────────────

    private func sendResume() async {
        guard let sid = sessionId else { return }
        let msg: [String: Any] = [
            "type"        : "RESUME_SESSION",
            "sessionId"   : sid,
            "serverTimeMs": Int(Date().timeIntervalSince1970 * 1000),
            "payload"     : [
                "playerId"            : "",
                "lastReceivedEventId" : NSNull()
            ] as [String: Any]
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: msg),
              let str  = String(data: data, encoding: .utf8)
        else { return }
        try? await wsTask?.send(.string(str))
    }

    // MARK: – helpers ──────────────────────────────────────────────────────────

    private func applyState(_ state: HostGameState) {
        sessionReady        = true
        phase               = state.phase
        players             = state.players
        clueText            = state.clueText
        levelPoints         = state.levelPoints
        scoreboard          = state.scoreboard
        lockedAnswers       = state.lockedAnswers
        destinationName     = state.destinationName
        destinationCountry  = state.destinationCountry
        brakeOwnerPlayerId  = state.brakeOwnerPlayerId
        if let jc           = state.joinCode { joinCode = jc }
        followupQuestion    = state.followupQuestion
        if state.phase != "FOLLOWUP_QUESTION" { followupResults = nil }
    }

    private func scheduleReconnect() async {
        isConnected      = false
        reconnectAttempt += 1

        guard reconnectAttempt <= Self.maxAttempts, hostAuthToken != nil else {
            error = "Connection lost — restart the app."
            return
        }

        let delay = min(pow(2.0, Double(reconnectAttempt - 1)), Self.maxDelay)
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        connect()
    }

    /// Fire-and-forget JSON send.
    private func send(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let str  = String(data: data, encoding: .utf8)
        else { return }
        Task { try? await self.wsTask?.send(.string(str)) }
    }
}
