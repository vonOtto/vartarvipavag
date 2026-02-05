import SwiftUI

// MARK: – entry point ────────────────────────────────────────────────────────

@main
struct PaSparetHostApp: App {
    @StateObject private var state = HostState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(state)
        }
    }
}

// MARK: – root router ────────────────────────────────────────────────────────

struct RootView: View {
    @EnvironmentObject var state: HostState

    private static let cluePhases      : Set<String> = ["CLUE_LEVEL", "PAUSED_FOR_BRAKE"]
    private static let scoreboardPhases: Set<String> = ["SCOREBOARD", "ROUND_END", "FINAL_RESULTS",
                                                        "REVEAL_DESTINATION"]

    var body: some View {
        if state.sessionId == nil {
            CreateSessionView()
        } else if !state.sessionReady {
            ConnectingView()
        } else if state.phase == "LOBBY" || state.phase == "PREPARING_ROUND" || state.phase == "ROUND_INTRO" {
            LobbyHostView()
        } else if Self.cluePhases.contains(state.phase) {
            GameHostView()
        } else if state.phase == "FOLLOWUP_QUESTION" {
            FollowupHostView()
        } else if Self.scoreboardPhases.contains(state.phase) {
            ScoreboardHostView()
        } else {
            GameHostView()   // fallback
        }
    }
}

// MARK: – create-session screen ──────────────────────────────────────────────

/// Taps "Create Game" → calls REST → connects WS → navigates to lobby.
struct CreateSessionView: View {
    @EnvironmentObject var state: HostState
    @State private var busy = false

    /// Origin embedded in the QR code.  Must be reachable from player phones.
    private static let publicBaseURL = ProcessInfo.processInfo.environment["PUBLIC_BASE_URL"]
                                        ?? "http://localhost:3000"

    var body: some View {
        VStack(spacing: 48) {
            Spacer()

            Text("På Spåret")
                .font(.system(size: 48, weight: .bold))

            Text("Värd")
                .font(.system(size: 24))
                .foregroundColor(.secondary)

            Button("Skapa spel") {
                Task { await createSession() }
            }
            .font(.system(size: 28, weight: .medium))
            .padding(.horizontal, 40)
            .padding(.vertical, 16)
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(14)
            .disabled(busy)

            if let err = state.error {
                Text(err).foregroundColor(.red).font(.title3)
            }

            Spacer()
        }
        .padding()
    }

    private func createSession() async {
        busy = true
        defer { busy = false }
        state.error = nil

        do {
            let resp = try await HostAPI.createSession()

            state.sessionId     = resp.sessionId
            state.hostAuthToken = resp.hostAuthToken
            state.wsUrl         = resp.wsUrl
            state.joinCode      = resp.joinCode
            // Build join URL: replace {joinCode} placeholder
            state.joinURL       = resp.joinUrlTemplate.replacingOccurrences(
                                      of: "{joinCode}", with: resp.joinCode)
            state.connect()
        } catch {
            state.error = error.localizedDescription
        }
    }
}

// MARK: – connecting screen ──────────────────────────────────────────────────

struct ConnectingView: View {
    @EnvironmentObject var state: HostState

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Text(state.isConnected ? "Ansluter…" : "Återansluter…")
                .font(.system(size: 36, weight: .light))
                .foregroundColor(.secondary)
            if let err = state.error {
                Text(err).foregroundColor(.red).font(.title3)
            }
            Spacer()
        }
    }
}

// MARK: – lobby host screen ──────────────────────────────────────────────────

/// QR code + join code on top; live player list below; Start Game button.
struct LobbyHostView: View {
    @EnvironmentObject var state: HostState

    var body: some View {
        VStack(spacing: 0) {
            // ── QR + join code ──
            VStack(spacing: 12) {
                if let url = state.joinURL {
                    QRCodeView(url: url, size: 200)
                }
                if let code = state.joinCode {
                    Text(code)
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(.primary)
                }
                Text("Skanna för att ansluta")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
            }
            .padding(.top, 24)

            Divider().padding(.vertical, 16)

            // ── player list ──
            Text("Spelare (\(state.players.count))")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)

            List(state.players) { player in
                HStack(spacing: 10) {
                    Circle()
                        .fill(player.isConnected ? Color.green : Color.gray)
                        .frame(width: 10, height: 10)
                    Text(player.name)
                        .font(.system(size: 17))
                }
            }
            .listStyle(.plain)

            Spacer()

            // ── start button ──
            Button("Starta spelet") {
                state.sendStartGame()
            }
            .font(.system(size: 22, weight: .semibold))
            .padding(.horizontal, 48)
            .padding(.vertical, 14)
            .background(state.players.isEmpty ? Color.gray : Color.green)
            .foregroundColor(.white)
            .cornerRadius(14)
            .disabled(state.players.isEmpty)
            .padding(.bottom, 32)
        }
        .overlay(alignment: .top) {
            if !state.isConnected { reconnectBanner }
        }
    }

    private var reconnectBanner: some View {
        Text("○ Återansluter…")
            .font(.caption)
            .foregroundColor(.red)
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(Color.black.opacity(0.6))
            .cornerRadius(6)
            .padding(.top, 8)
    }
}

// MARK: – game host (pro) screen ──────────────────────────────────────────────

/// The main host view during CLUE_LEVEL / PAUSED_FOR_BRAKE.
/// Shows: current clue, destination (secret!), locked answers with text,
/// player count, and a "Next Clue" button.
struct GameHostView: View {
    @EnvironmentObject var state: HostState

    var body: some View {
        VStack(spacing: 0) {
            // ── header bar ──
            HStack {
                levelBadge
                Spacer()
                statusBadge
            }
            .padding(.horizontal)
            .padding(.top, 12)

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {

                    // ── destination (HOST-only secret) ──
                    if let name = state.destinationName {
                        secretCard(name)
                    }

                    // ── current clue ──
                    if let clue = state.clueText {
                        clueCard(clue)
                    }

                    // ── brake status ──
                    if state.phase == "PAUSED_FOR_BRAKE", let ownerId = state.brakeOwnerPlayerId {
                        let name = state.players.first(where: { $0.playerId == ownerId })?.name ?? ownerId
                        brakeNotice(name)
                    }

                    // ── locked answers (HOST sees answer text) ──
                    if !state.lockedAnswers.isEmpty {
                        lockedAnswersSection
                    }
                }
                .padding()
            }

            Spacer()

            // ── next-clue button ──
            Button("Nästa ledtråd") {
                state.sendNextClue()
            }
            .font(.system(size: 20, weight: .semibold))
            .padding(.horizontal, 44)
            .padding(.vertical, 14)
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(14)
            .padding(.bottom, 28)
        }
        .overlay(alignment: .top) {
            if !state.isConnected { reconnectBanner }
        }
    }

    // ── sub-views ──────────────────────────────────────────────────────────

    private var levelBadge: some View {
        Text(state.levelPoints.map { "\($0) p" } ?? "–")
            .font(.system(size: 18, weight: .bold))
            .padding(.horizontal, 14)
            .padding(.vertical, 6)
            .background(Color.yellow)
            .foregroundColor(.black)
            .cornerRadius(20)
    }

    private var statusBadge: some View {
        Text(state.isConnected ? "● Ansluten" : "○ Återansluter…")
            .font(.caption)
            .foregroundColor(state.isConnected ? .green : .red)
    }

    private func secretCard(_ name: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("DESTINATION (hemligt)")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            Text(name)
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.primary)
            if let country = state.destinationCountry {
                Text(country)
                    .font(.system(size: 16))
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.yellow.opacity(0.12))
        .cornerRadius(12)
    }

    private func clueCard(_ clue: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Aktuell ledtråd")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            Text(clue)
                .font(.system(size: 18))
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(12)
    }

    private func brakeNotice(_ name: String) -> some View {
        Text("● \(name) bromsade")
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.red.opacity(0.85))
            .cornerRadius(10)
    }

    @ViewBuilder
    private var lockedAnswersSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Låsta svar (\(state.lockedAnswers.count))")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)

            ForEach(state.lockedAnswers) { a in
                let playerName = state.players.first(where: { $0.playerId == a.playerId })?.name ?? a.playerId
                HStack {
                    Text(playerName)
                        .font(.system(size: 15, weight: .semibold))
                    Spacer()
                    Text("\"\(a.answerText)\"")
                        .font(.system(size: 15))
                        .foregroundColor(.secondary)
                    Text("@ \(a.lockedAtLevelPoints)")
                        .font(.caption)
                        .foregroundColor(.yellow)
                }
                .padding(.vertical, 6)
                .padding(.horizontal, 10)
                .background(Color.secondary.opacity(0.08))
                .cornerRadius(8)
            }
        }
    }

    private var reconnectBanner: some View {
        Text("○ Återansluter…")
            .font(.caption)
            .foregroundColor(.red)
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(Color.black.opacity(0.6))
            .cornerRadius(6)
            .padding(.top, 8)
    }
}

// MARK: – scoreboard host screen ─────────────────────────────────────────────

/// Shown after reveal.  Left: per-player results.  Right: standings.
/// On compact (iPhone) they stack vertically.
struct ScoreboardHostView: View {
    @EnvironmentObject var state: HostState

    var body: some View {
        VStack(spacing: 0) {
            // ── destination header (now revealed) ──
            if let name = state.destinationName {
                HStack {
                    Text("Svar: \(name)")
                        .font(.system(size: 20, weight: .bold))
                    if let c = state.destinationCountry {
                        Text("(\(c))")
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.top, 16)
            }

            Divider().padding(.vertical, 8)

            // ── results + scoreboard ──
            GeometryReader { geo in
                if geo.size.width > 500 {
                    // iPad / landscape: side by side
                    HStack(spacing: 24) {
                        resultsColumn
                        Divider()
                        standingsColumn
                    }
                    .padding()
                } else {
                    // iPhone / portrait: stacked
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) {
                            resultsColumn
                            Divider()
                            standingsColumn
                        }
                        .padding()
                    }
                }
            }

            Spacer()
        }
        .overlay(alignment: .top) {
            if !state.isConnected { reconnectBanner }
        }
    }

    // ── results ──────────────────────────────────────────────────────────────

    @ViewBuilder
    private var resultsColumn: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Resultat")
                .font(.system(size: 18, weight: .semibold))

            if state.results.isEmpty {
                Text("Inga resultat än…").foregroundColor(.secondary)
            } else {
                ForEach(state.results) { r in
                    HStack(spacing: 10) {
                        Text(r.isCorrect ? "✓" : "✗")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(r.isCorrect ? .green : .red)
                            .frame(width: 22)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(r.playerName).font(.system(size: 15, weight: .semibold))
                            Text(r.answerText).font(.system(size: 13)).foregroundColor(.secondary)
                        }
                        Spacer()
                        Text("+\(r.pointsAwarded)")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.yellow)
                    }
                    .padding(.vertical, 6)
                    .padding(.horizontal, 10)
                    .background(Color.secondary.opacity(r.isCorrect ? 0.1 : 0.04))
                    .cornerRadius(8)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // ── standings ────────────────────────────────────────────────────────────

    @ViewBuilder
    private var standingsColumn: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Poängtabell")
                .font(.system(size: 18, weight: .semibold))

            if state.scoreboard.isEmpty {
                Text("Inga poäng än…").foregroundColor(.secondary)
            } else {
                ForEach(state.scoreboard.enumerated().map({ $0 }), id: \.offset) { idx, entry in
                    HStack(spacing: 10) {
                        ZStack {
                            Circle()
                                .fill(rankColor(idx + 1))
                                .frame(width: 28, height: 28)
                            Text("\(idx + 1)")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.black)
                        }
                        Text(entry.name)
                            .font(.system(size: 15))
                        Spacer()
                        Text("\(entry.totalScore)")
                            .font(.system(size: 15, weight: .bold))
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func rankColor(_ rank: Int) -> Color {
        switch rank {
        case 1: return Color(red: 0.95, green: 0.8,  blue: 0.1)
        case 2: return Color(red: 0.7,  green: 0.75, blue: 0.8)
        case 3: return Color(red: 0.8,  green: 0.5,  blue: 0.2)
        default: return .gray.opacity(0.4)
        }
    }

    private var reconnectBanner: some View {
        Text("○ Återansluter…")
            .font(.caption)
            .foregroundColor(.red)
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(Color.black.opacity(0.6))
            .cornerRadius(6)
            .padding(.top, 8)
    }
}

// MARK: – followup host (pro) screen ─────────────────────────────────────────

/// Host pro-view during FOLLOWUP_QUESTION phase.
/// Shows: question text, correct answer (HOST-only), live timer countdown,
/// options (if MC), incoming answers as they arrive, and the results overlay
/// once the server scores the round.  The followup loop is fully server-driven;
/// this view is read-only.
struct FollowupHostView: View {
    @EnvironmentObject var state: HostState

    var body: some View {
        VStack(spacing: 0) {
            // ── header: progress + status ──
            HStack {
                if let fq = state.followupQuestion {
                    Text("Fråga \(fq.currentQuestionIndex + 1) / \(fq.totalQuestions)")
                        .font(.system(size: 17, weight: .semibold))
                }
                Spacer()
                statusBadge
            }
            .padding(.horizontal)
            .padding(.top, 12)

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {

                    // ── correct-answer card (HOST secret) ──
                    if let fq = state.followupQuestion {
                        correctAnswerCard(fq.correctAnswer)
                    }

                    // ── question text ──
                    if let fq = state.followupQuestion {
                        questionCard(fq.questionText)
                    }

                    // ── options badges (MC only) ──
                    if let fq = state.followupQuestion, let opts = fq.options {
                        optionsBadges(opts)
                    }

                    // ── live timer ──
                    if let fq = state.followupQuestion {
                        timerCard(fq)
                    }

                    // ── results overlay (replaces answers once scored) ──
                    if let res = state.followupResults {
                        resultsSection(res)
                    } else if let fq = state.followupQuestion, !fq.answersByPlayer.isEmpty {
                        // ── incoming answers (HOST-only, pre-results) ──
                        answersSection(fq.answersByPlayer)
                    }
                }
                .padding()
            }

            Spacer()
        }
        .overlay(alignment: .top) {
            if !state.isConnected { reconnectBanner }
        }
    }

    // ── sub-views ──────────────────────────────────────────────────────────

    private var statusBadge: some View {
        Text(state.isConnected ? "● Ansluten" : "○ Återansluter…")
            .font(.caption)
            .foregroundColor(state.isConnected ? .green : .red)
    }

    /// Green card: the correct answer — visible to HOST immediately.
    private func correctAnswerCard(_ answer: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("RÄTT SVAR (hemligt)")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            Text(answer)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.green)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.green.opacity(0.1))
        .cornerRadius(12)
    }

    /// Gray card: the question text.
    private func questionCard(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Fråga")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            Text(text)
                .font(.system(size: 18))
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(12)
    }

    /// Horizontal row of option badges (read-only display).
    private func optionsBadges(_ options: [String]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Alternativ")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            HStack(spacing: 8) {
                ForEach(options, id: \.self) { opt in
                    Text(opt)
                        .font(.system(size: 14, weight: .medium))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.secondary.opacity(0.12))
                        .cornerRadius(20)
                }
            }
        }
    }

    /// Live countdown derived from server timestamps.  Ticks via TimelineView.
    private func timerCard(_ fq: HostFollowupQuestion) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Timer")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            if let startMs = fq.timerStartMs, let durMs = fq.timerDurationMs {
                let deadline  = Date(timeIntervalSince1970: Double(startMs + durMs) / 1000.0)
                let duration  = Double(durMs) / 1000.0
                let startDate = Date(timeIntervalSince1970: Double(startMs) / 1000.0)
                TimelineView(.periodic(from: Date(), by: 0.5)) { timeline in
                    let elapsed  = timeline.date.timeIntervalSince(startDate)
                    let fraction = max(0, min(1, 1 - elapsed / duration))
                    let secs     = max(0, Int(deadline.timeIntervalSince(timeline.date)))
                    let urgent   = fraction < 0.2

                    HStack(spacing: 12) {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.secondary.opacity(0.15)).frame(height: 8)
                                Capsule()
                                    .fill(urgent ? Color.red : Color.blue)
                                    .frame(width: geo.size.width * fraction, height: 8)
                            }
                        }
                        .frame(height: 8)

                        Text("\(secs) s")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(urgent ? .red : .primary)
                            .frame(width: 38, alignment: .trailing)
                    }
                }
            } else {
                Text("—").foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.secondary.opacity(0.06))
        .cornerRadius(12)
    }

    /// Per-player answers as they trickle in (HOST-only, pre-results).
    private func answersSection(_ answers: [HostFollowupAnswerByPlayer]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Svar (\(answers.count))")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            ForEach(answers) { a in
                HStack {
                    Text(a.playerName)
                        .font(.system(size: 15, weight: .semibold))
                    Spacer()
                    Text("\"\(a.answerText)\"")
                        .font(.system(size: 15))
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 6)
                .padding(.horizontal, 10)
                .background(Color.secondary.opacity(0.08))
                .cornerRadius(8)
            }
        }
    }

    /// Results overlay: correct answer recap + per-player ✓/✗ + points.
    private func resultsSection(_ res: (correctAnswer: String, rows: [HostFollowupResultRow])) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Text("Rätt svar:")
                    .font(.system(size: 15))
                    .foregroundColor(.secondary)
                Text(res.correctAnswer)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.green)
            }
            .padding(.vertical, 6)
            .padding(.horizontal, 10)
            .background(Color.green.opacity(0.08))
            .cornerRadius(8)

            Text("Resultat")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            ForEach(res.rows) { row in
                HStack(spacing: 10) {
                    Text(row.isCorrect ? "✓" : "✗")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(row.isCorrect ? .green : .red)
                        .frame(width: 20)
                    Text(row.playerName)
                        .font(.system(size: 15, weight: .semibold))
                    Spacer()
                    Text("+\(row.pointsAwarded)")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.yellow)
                }
                .padding(.vertical, 6)
                .padding(.horizontal, 10)
                .background(Color.secondary.opacity(row.isCorrect ? 0.1 : 0.04))
                .cornerRadius(8)
            }
        }
    }

    private var reconnectBanner: some View {
        Text("○ Återansluter…")
            .font(.caption)
            .foregroundColor(.red)
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(Color.black.opacity(0.6))
            .cornerRadius(6)
            .padding(.top, 8)
    }
}
