import Foundation

/// Progress state for content generation.
struct GenerationProgress {
    let currentStep: Int
    let totalSteps: Int
    let stepDescription: String
    let destinationIndex: Int?
    let totalDestinations: Int?

    init(currentStep: Int, totalSteps: Int, stepDescription: String, destinationIndex: Int? = nil, totalDestinations: Int? = nil) {
        self.currentStep = currentStep
        self.totalSteps = totalSteps
        self.stepDescription = stepDescription
        self.destinationIndex = destinationIndex
        self.totalDestinations = totalDestinations
    }

    var progress: Double {
        guard totalSteps > 0, let destIndex = destinationIndex, let totalDests = totalDestinations, totalDests > 0 else {
            // Simple progress if no destination info
            guard totalSteps > 0 else { return 0.0 }
            return Double(currentStep) / Double(totalSteps)
        }

        // Overall progress across all destinations
        let completedDestinations = destIndex - 1
        let currentDestProgress = Double(currentStep) / Double(totalSteps)
        let overallProgress = (Double(completedDestinations) + currentDestProgress) / Double(totalDests)
        return overallProgress
    }
}

/// Observable state for the host app.  Owns the WebSocket lifecycle and
/// publishes every field the host views need.  All mutations are isolated to
/// the main actor via the class-level annotation.
@MainActor
class HostState: ObservableObject {

    // MARK: – session credentials (set after REST create)
    var sessionId     : String? {
        didSet { startBroadcastingIfNeeded() }
    }
    var hostAuthToken : String?
    var wsUrl         : String?
    var joinCode      : String? {
        didSet { startBroadcastingIfNeeded() }
    }
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
    @Published var selectedContentPackId: String?

    // MARK: – game plan state
    @Published var gamePlan       : GamePlan?
    @Published var destinations   : [DestinationSummary] = []
    @Published var isGeneratingPlan: Bool = false
    @Published var generationProgress: GenerationProgress?
    private var generationTask: Task<Void, Never>?

    // MARK: – content management
    var hasContent: Bool {
        return !destinations.isEmpty || gamePlan != nil
    }

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

    // MARK: – Bonjour service
    private let bonjourService: BonjourService = {
        let service = BonjourService()
        return service
    }()
    @Published var isBroadcasting: Bool = false

    // MARK: – initialization
    init() {
        setupBonjourCallback()
    }

    private func setupBonjourCallback() {
        bonjourService.onPublishingStateChanged = { [weak self] isPublishing in
            Task { @MainActor in
                self?.isBroadcasting = isPublishing
                print("[HostState] Broadcasting state changed: \(isPublishing)")
            }
        }
    }

    // MARK: – connect ──────────────────────────────────────────────────────────

    func connect() {
        guard let token = hostAuthToken,
              let ws    = wsUrl,
              let url   = URL(string: "\(ws)?token=\(token)") else { return }

        wsTask?.cancel(with: .normalClosure, reason: nil)

        let task = URLSession.shared.webSocketTask(with: url)
        wsTask   = task
        task.resume()

        // Do NOT set isConnected here — wait for WELCOME from the server.
        // Setting it optimistically caused a flicker: connect() toggled it true,
        // then the receive loop would throw before WELCOME arrived and
        // scheduleReconnect() would flip it back to false within the same frame.
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
            reconnectAttempt    = 0       // connection is healthy
            isConnected         = true    // authoritative: server acknowledged us
            hasEverConnected    = true
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
            let revealDelay = payload["textRevealAfterMs"] as? Int ?? 0
            if let t = payload["clueText"] as? String {
                if revealDelay > 0 {
                    clueText = nil                          // hide until TTS finishes
                    Task { [self] in
                        try? await Task.sleep(nanoseconds: UInt64(revealDelay) * 1_000_000)
                        await MainActor.run { self.clueText = t }
                    }
                } else {
                    clueText = t                            // show immediately (default)
                }
            }
            if let p = payload["clueLevelPoints"] as? Int    { levelPoints = p }
            phase              = "CLUE_LEVEL"
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
            let startAtMs    = payload["startAtServerMs"]     as? Int
            followupQuestion = HostFollowupQuestion(
                questionText:         qText,
                options:              options,
                currentQuestionIndex: currentIdx,
                totalQuestions:       total,
                correctAnswer:        correct,
                timerStartMs:         startAtMs,
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

        case "CONTENT_PACK_SELECTED":
            guard let payload = json["payload"] as? [String: Any] else { break }
            if let packId = payload["contentPackId"] as? String {
                selectedContentPackId = packId
            } else {
                selectedContentPackId = nil
            }

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

    /// Send END_GAME to the server. Host can end game from any phase.
    func sendEndGame() {
        guard let sid = sessionId else { return }
        send([
            "type"        : "END_GAME",
            "sessionId"   : sid,
            "serverTimeMs": Int(Date().timeIntervalSince1970 * 1000),
            "payload"     : [String: Any]()
        ])
    }

    /// Send HOST_SELECT_CONTENT_PACK to the server.
    /// Pass nil to deselect.
    func selectContentPack(_ packId: String?) {
        guard let sid = sessionId else { return }
        let payload: [String: Any]
        if let packId = packId {
            payload = ["contentPackId": packId]
        } else {
            payload = ["contentPackId": NSNull()]
        }
        send([
            "type"        : "HOST_SELECT_CONTENT_PACK",
            "sessionId"   : sid,
            "serverTimeMs": Int(Date().timeIntervalSince1970 * 1000),
            "payload"     : payload
        ])
    }

    /// Generate AI content for this session (called from lobby).
    func generateContentInLobby(numDestinations: Int, regions: [String]?, prompt: String?) async throws {
        guard let sid = sessionId else { return }

        isGeneratingPlan = true
        defer {
            isGeneratingPlan = false
            generationProgress = nil
            generationTask = nil
        }

        do {
            // Show initial progress
            generationProgress = GenerationProgress(
                currentStep: 0,
                totalSteps: 8 * numDestinations,
                stepDescription: "Startar AI-generering...",
                destinationIndex: 1,
                totalDestinations: numDestinations
            )

            // Start a progress simulation task (since the API blocks)
            let progressTask = Task {
                await simulateProgress(totalDestinations: numDestinations)
            }

            // Call the blocking batch API with timeout (120 seconds)
            let planResp = try await withTimeout(seconds: 120) {
                try await HostAPI.createGamePlanAI(
                    sessionId: sid,
                    numDestinations: numDestinations,
                    regions: regions,
                    prompt: prompt
                )
            }

            // Check for cancellation
            try Task.checkCancellation()

            // Cancel progress simulation
            progressTask.cancel()

            // Show completion
            generationProgress = GenerationProgress(
                currentStep: 8 * numDestinations,
                totalSteps: 8 * numDestinations,
                stepDescription: "Klar!",
                destinationIndex: numDestinations,
                totalDestinations: numDestinations
            )

            gamePlan = planResp.gamePlan
            destinations = planResp.destinations

            // Update broadcast with new destination count
            startBroadcastingIfNeeded()
        } catch is CancellationError {
            // Re-throw cancellation errors so caller can handle them
            throw CancellationError()
        } catch {
            throw error
        }
    }

    /// Cancel ongoing content generation.
    func cancelContentGeneration() {
        generationTask?.cancel()
        generationTask = nil
        isGeneratingPlan = false
        generationProgress = nil
    }

    /// Simulates progress updates while batch generation runs.
    /// Shows estimated progress based on time (60-90s per destination).
    private func simulateProgress(totalDestinations: Int) async {
        let stepNames = [
            "Initierar generering",
            "Genererar destination",
            "Genererar ledtrådar",
            "Genererar följdfrågor",
            "Verifierar fakta",
            "Kontrollerar anti-leak",
            "Förbereder TTS",
            "Slutför"
        ]

        let totalSteps = 8 * totalDestinations
        let estimatedTimePerDestination: Double = 75.0 // 75 seconds average
        let updateInterval: Double = 2.0 // Update every 2 seconds

        var currentStep = 0
        var elapsedTime: Double = 0

        while !Task.isCancelled && currentStep < totalSteps {
            try? await Task.sleep(nanoseconds: UInt64(updateInterval * 1_000_000_000))
            elapsedTime += updateInterval

            // Estimate which destination and step we're on based on time
            let estimatedDestIndex = min(Int(elapsedTime / estimatedTimePerDestination), totalDestinations - 1)
            let estimatedStepInDest = Int((elapsedTime.truncatingRemainder(dividingBy: estimatedTimePerDestination)) / (estimatedTimePerDestination / 8.0))
            let actualStep = min((estimatedDestIndex * 8) + estimatedStepInDest, totalSteps - 1)

            currentStep = actualStep

            let destNumber = (currentStep / 8) + 1
            let stepInDest = (currentStep % 8)
            let stepName = stepNames[min(stepInDest, stepNames.count - 1)]

            await MainActor.run {
                self.generationProgress = GenerationProgress(
                    currentStep: currentStep,
                    totalSteps: totalSteps,
                    stepDescription: "Destination \(destNumber)/\(totalDestinations): \(stepName)",
                    destinationIndex: destNumber,
                    totalDestinations: totalDestinations
                )
            }
        }
    }

    /// Import existing content packs (called from lobby).
    /// If replace=true, replaces current content. If false, adds to existing.
    func importContentPacks(_ packIds: [String], replace: Bool = true) async throws {
        guard let sid = sessionId else { return }

        isGeneratingPlan = true
        defer { isGeneratingPlan = false }

        do {
            // If adding to existing, combine with current pack IDs
            let finalPackIds: [String]
            if replace {
                finalPackIds = packIds
            } else {
                // Get current content pack IDs from gamePlan
                let currentPackIds = gamePlan?.destinations.map { $0.contentPackId } ?? []
                finalPackIds = currentPackIds + packIds
            }

            let planResp = try await HostAPI.createGamePlanManual(
                sessionId: sid,
                contentPackIds: finalPackIds
            )
            gamePlan = planResp.gamePlan
            destinations = planResp.destinations

            // Update broadcast with new destination count
            startBroadcastingIfNeeded()
        } catch {
            throw error
        }
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

        // Start Bonjour broadcasting once we have session data
        startBroadcastingIfNeeded()
    }

    private func scheduleReconnect() async {
        isConnected      = false
        reconnectAttempt += 1

        guard reconnectAttempt <= Self.maxAttempts, hostAuthToken != nil else {
            error = "Anslutningen förlorad — starta appen igen."
            return
        }

        let delay = min(pow(2.0, Double(reconnectAttempt - 1)), Self.maxDelay)
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        connect()
    }

    /// Tear down the current session completely. RootView will show LaunchView
    /// (because sessionId becomes nil).
    func resetSession() {
        // 1. Stop Bonjour broadcasting
        bonjourService.stopBroadcasting()
        isBroadcasting = false

        // 2. Close WebSocket
        wsTask?.cancel(with: .normalClosure, reason: nil)
        wsTask = nil

        // 3. Reset reconnect state
        reconnectAttempt = 0
        isConnected = false
        hasEverConnected = false
        sessionReady = false
        error = nil

        // 4. Clear session credentials
        sessionId = nil
        hostAuthToken = nil
        wsUrl = nil
        joinCode = nil
        joinURL = nil

        // 5. Clear game state
        phase = "LOBBY"
        players = []
        clueText = nil
        levelPoints = nil
        scoreboard = []
        lockedAnswers = []
        destinationName = nil
        destinationCountry = nil
        brakeOwnerPlayerId = nil
        results = []
        followupQuestion = nil
        followupResults = nil
        selectedContentPackId = nil

        // 6. Clear game plan state
        gamePlan = nil
        destinations = []
        isGeneratingPlan = false
        generationProgress = nil
    }

    /// Start Bonjour broadcasting if we have all required data and aren't already broadcasting.
    func startBroadcastingIfNeeded() {
        guard !isBroadcasting else {
            print("[HostState] Already broadcasting, skipping")
            return
        }

        guard let sid = sessionId,
              let code = joinCode else {
            print("[HostState] Cannot start broadcasting - missing credentials. sessionId: \(sessionId != nil), joinCode: \(joinCode != nil)")
            return
        }

        let destCount = destinations.count
        print("[HostState] Starting broadcast for session \(sid) with code \(code), \(destCount) destinations")
        bonjourService.startBroadcasting(sessionId: sid, joinCode: code, destinationCount: destCount)
        // isBroadcasting will be set via callback when publishing succeeds
    }

    /// Fire-and-forget JSON send.
    private func send(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let str  = String(data: data, encoding: .utf8)
        else { return }
        Task { try? await self.wsTask?.send(.string(str)) }
    }
}
