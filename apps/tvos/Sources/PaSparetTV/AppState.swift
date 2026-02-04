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
    @Published var scoreboard  : [ScoreboardEntry] = []
    @Published var joinCode    : String?

    // MARK: – connection status
    @Published var isConnected : Bool   = false
    @Published var error       : String?

    // MARK: – session credentials (populated after REST join)
    var token     : String?
    var wsUrl     : String?
    var sessionId : String?

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
            phase = "CLUE_LEVEL"

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
        phase       = state.phase
        players     = state.players
        clueText    = state.clueText
        levelPoints = state.levelPoints
        scoreboard  = state.scoreboard
        if let jc   = state.joinCode { joinCode = jc }
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
