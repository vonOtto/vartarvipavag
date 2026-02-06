import SwiftUI

// MARK: – entry point ────────────────────────────────────────────────────────

@main
struct PaSparetHostApp: App {
    @StateObject private var state = HostState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(state)
                .preferredColorScheme(.dark)
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
        ZStack {
            // Background gradient
            Color.bgBase.ignoresSafeArea()

            if state.sessionId == nil {
                LaunchView()
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
}

// MARK: – launch screen ──────────────────────────────────────────────────────

/// Polished launch screen with create/join options matching tvOS design.
struct LaunchView: View {
    @EnvironmentObject var state: HostState
    @State private var showJoinSheet = false
    @State private var joinCode = ""
    @State private var busy = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 48) {
            Spacer()

            // Title with gradient
            VStack(spacing: 8) {
                Text("PÅ SPÅRET")
                    .font(.gameShowHeading)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.accentBlueBright, .accentBlue],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .shadow(color: .accentBlue.opacity(0.5), radius: 16)

                Text("PARTY EDITION")
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .tracking(3)
                    .foregroundColor(.white.opacity(0.6))
            }
            .padding(.bottom, 24)

            // Buttons
            VStack(spacing: 16) {
                // Primary: Create game
                Button {
                    #if os(iOS)
                    hapticImpact(.medium)
                    #endif
                    Task { await createSession() }
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 22, weight: .semibold))
                        Text("Skapa nytt spel")
                            .font(.buttonPrimary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        RoundedRectangle(cornerRadius: Layout.cornerRadiusLarge)
                            .fill(Color.accentBlueBright)
                    )
                    .foregroundColor(.white)
                }
                .disabled(busy)
                .shadow(color: .accentBlue.opacity(0.4), radius: Layout.shadowRadius)

                // Secondary: Join game
                Button {
                    #if os(iOS)
                    hapticImpact(.light)
                    #endif
                    showJoinSheet = true
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "arrow.right.circle")
                            .font(.system(size: 22, weight: .medium))
                        Text("Gå med i spel")
                            .font(.buttonSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        RoundedRectangle(cornerRadius: Layout.cornerRadiusLarge)
                            .fill(Color.bgCard)
                            .overlay(
                                RoundedRectangle(cornerRadius: Layout.cornerRadiusLarge)
                                    .stroke(Color.white.opacity(0.2), lineWidth: 1.5)
                            )
                    )
                    .foregroundColor(.white)
                }
                .disabled(busy)
            }
            .padding(.horizontal, Layout.horizontalPadding)

            // Error message
            if let err = errorMessage {
                Text(err)
                    .font(.bodyRegular)
                    .foregroundColor(.errorRedBright)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Layout.horizontalPadding)
                    .transition(.opacity.combined(with: .scale))
            }

            Spacer()
        }
        .padding(.vertical, Layout.verticalPadding)
        .sheet(isPresented: $showJoinSheet) {
            JoinGameSheet(onJoin: { code in
                showJoinSheet = false
                Task { await joinSession(code: code) }
            })
        }
    }

    // MARK: – Actions

    private func createSession() async {
        busy = true
        errorMessage = nil

        defer { busy = false }

        do {
            let resp = try await HostAPI.createSession()

            state.sessionId     = resp.sessionId
            state.hostAuthToken = resp.hostAuthToken
            state.wsUrl         = resp.wsUrl
            state.joinCode      = resp.joinCode
            state.joinURL       = resp.joinUrlTemplate.replacingOccurrences(
                                      of: "{joinCode}", with: resp.joinCode)
            state.connect()

            #if os(iOS)
            hapticNotification(.success)
            #endif
        } catch {
            errorMessage = error.localizedDescription
            #if os(iOS)
            hapticNotification(.error)
            #endif
        }
    }

    private func joinSession(code: String) async {
        busy = true
        errorMessage = nil

        defer { busy = false }

        do {
            // Step 1: Lookup session by code
            let lookup = try await HostAPI.lookupByCode(code)

            // Step 2: Join as HOST
            let join = try await HostAPI.joinSession(sessionId: lookup.sessionId)

            // Step 3: Set credentials and connect
            state.sessionId     = lookup.sessionId
            state.hostAuthToken = join.playerAuthToken
            state.wsUrl         = join.wsUrl
            state.joinCode      = lookup.joinCode
            state.joinURL       = nil  // Will be populated by STATE_SNAPSHOT
            state.connect()

            #if os(iOS)
            hapticNotification(.success)
            #endif
        } catch APIError.hostRoleTaken {
            errorMessage = "Sessionen har redan en värd. Anslut som spelare via webben."
            #if os(iOS)
            hapticNotification(.error)
            #endif
        } catch {
            errorMessage = error.localizedDescription
            #if os(iOS)
            hapticNotification(.error)
            #endif
        }
    }
}

// MARK: – join game sheet ────────────────────────────────────────────────────

struct JoinGameSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var code = ""
    let onJoin: (String) -> Void

    var body: some View {
        NavigationView {
            VStack(spacing: 32) {
                // Header
                VStack(spacing: 12) {
                    Image(systemName: "qrcode.viewfinder")
                        .font(.system(size: 56, weight: .light))
                        .foregroundColor(.accentBlueBright)

                    Text("Ange join-kod")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.primary)

                    Text("Koden visas på TV:n eller i värdens app")
                        .font(.bodyRegular)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 32)

                // Code input
                TextField("", text: $code)
                    .font(.system(size: 48, weight: .bold, design: .monospaced))
                    .multilineTextAlignment(.center)
                    .textCase(.uppercase)
                    #if os(iOS)
                    .autocapitalization(.allCharacters)
                    .keyboardType(.asciiCapable)
                    #endif
                    .disableAutocorrection(true)
                    .padding(.vertical, 20)
                    .background(
                        RoundedRectangle(cornerRadius: Layout.cornerRadiusMedium)
                            .fill(Color.gray.opacity(0.1))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: Layout.cornerRadiusMedium)
                            .stroke(code.count == 6 ? Color.accentBlueBright : Color.clear, lineWidth: 2)
                    )
                    .padding(.horizontal, Layout.horizontalPadding)
                    .onChange(of: code) { newValue in
                        let filtered = newValue
                            .uppercased()
                            .filter { $0.isLetter || $0.isNumber }
                            .prefix(6)
                        if filtered != newValue {
                            code = String(filtered)
                        }
                    }

                // Progress indicator
                HStack(spacing: 8) {
                    ForEach(0..<6, id: \.self) { index in
                        Circle()
                            .fill(index < code.count ? Color.accentBlueBright : Color.gray.opacity(0.3))
                            .frame(width: 10, height: 10)
                    }
                }

                Spacer()

                // Join button
                Button {
                    #if os(iOS)
                    hapticImpact(.medium)
                    #endif
                    onJoin(code)
                } label: {
                    Text("Gå med")
                        .font(.buttonPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: Layout.cornerRadiusLarge)
                                .fill(code.count == 6 ? Color.accentBlueBright : Color.gray.opacity(0.3))
                        )
                        .foregroundColor(.white)
                }
                .disabled(code.count != 6)
                .padding(.horizontal, Layout.horizontalPadding)
                .padding(.bottom, 32)
            }
            .background(Color.white)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Avbryt") {
                        hapticImpact(.light)
                        dismiss()
                    }
                }
            }
            #endif
        }
    }
}

// MARK: – connecting screen ──────────────────────────────────────────────────

struct ConnectingView: View {
    @EnvironmentObject var state: HostState

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .accentBlueBright))
                    .scaleEffect(1.5)

                Text(state.hasEverConnected ? "Återansluter…" : "Ansluter…")
                    .font(.bodyLarge)
                    .foregroundColor(.secondary)

                if let err = state.error {
                    Text(err)
                        .foregroundColor(.errorRedBright)
                        .font(.bodyRegular)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Layout.horizontalPadding)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        #if os(iOS)
                        hapticImpact(.light)
                        #endif
                        state.resetSession()
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "chevron.left")
                            Text("Tillbaka")
                        }
                        .foregroundColor(.accentBlueBright)
                    }
                }
            }
        }
    }
}

// MARK: – lobby host screen ──────────────────────────────────────────────────

/// QR code + join code on top; live player list below; Start Game button.
struct LobbyHostView: View {
    @EnvironmentObject var state: HostState

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {
                    // ── QR + join code ──
                    VStack(spacing: 16) {
                        if let url = state.joinURL {
                            QRCodeView(url: url, size: 200)
                                .padding(16)
                                .background(Color.white)
                                .cornerRadius(Layout.cornerRadiusMedium)
                                .shadow(color: .black.opacity(0.1), radius: 10)
                        }
                        if let code = state.joinCode {
                            Text(code)
                                .font(.system(size: 42, weight: .bold, design: .monospaced))
                                .tracking(4)
                                .foregroundColor(.accentBlueBright)
                        }
                        Text("Skanna för att ansluta")
                            .font(.bodyRegular)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top, 32)
                    .padding(.bottom, 24)

                Divider()
                    .background(Color.white.opacity(0.2))
                    .padding(.vertical, 16)

                // ── player list header ──
                HStack {
                    Text("Spelare (\(state.players.count))")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(.white.opacity(0.9))
                    Spacer()
                    if !state.players.isEmpty {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.successGreen)
                    }
                }
                .padding(.horizontal, Layout.horizontalPadding)

                // ── player cards ──
                if state.players.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "person.2.badge.gearshape")
                            .font(.system(size: 56, weight: .light))
                            .foregroundColor(.white.opacity(0.2))
                        Text("Väntar på spelare...")
                            .font(.bodyLarge)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 48)
                } else {
                    VStack(spacing: 12) {
                        ForEach(state.players) { player in
                            PlayerCard(player: player)
                                .transition(.scale.combined(with: .opacity))
                        }
                    }
                    .padding(.horizontal, Layout.horizontalPadding)
                    .padding(.top, 12)
                }

                Spacer(minLength: 32)

                // ── start button ──
                Button {
                    #if os(iOS)
                    hapticImpact(.heavy)
                    #endif
                    state.sendStartGame()
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 24, weight: .bold))
                        Text("Starta spelet")
                            .font(.buttonPrimary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(
                        RoundedRectangle(cornerRadius: Layout.cornerRadiusLarge)
                            .fill(state.players.isEmpty ? Color.gray : Color.successGreen)
                    )
                    .foregroundColor(.white)
                }
                .disabled(state.players.isEmpty)
                .padding(.horizontal, Layout.horizontalPadding)
                .padding(.bottom, 32)
                .shadow(color: state.players.isEmpty ? .clear : .successGreen.opacity(0.4), radius: Layout.shadowRadius)
                }
                .animation(.spring(response: 0.4, dampingFraction: 0.75), value: state.players.count)
            }
            .overlay(alignment: .top) {
                if !state.isConnected { reconnectBanner }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        #if os(iOS)
                        hapticImpact(.light)
                        #endif
                        state.resetSession()
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "chevron.left")
                            Text("Tillbaka")
                        }
                        .foregroundColor(.accentBlueBright)
                    }
                }
                ToolbarItem(placement: .principal) {
                    Text("Lobby")
                        .font(.headline)
                        .foregroundColor(.white)
                }
            }
        }
    }

    private var reconnectBanner: some View {
        HStack(spacing: 8) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(0.7)
            Text("Återansluter…")
                .font(.caption)
                .foregroundColor(.white)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color.errorRed)
        .cornerRadius(20)
        .padding(.top, 12)
    }
}

// MARK: – player card ────────────────────────────────────────────────────────

struct PlayerCard: View {
    let player: Player

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(player.isConnected ? Color.successGreen : Color.gray)
                .frame(width: 10, height: 10)
            Text(player.name)
                .font(.bodyLarge)
                .foregroundColor(.white)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: Layout.cornerRadiusMedium)
                .fill(Color.bgCard)
        )
        .opacity(player.isConnected ? 1.0 : 0.6)
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
            .padding(.horizontal, Layout.horizontalPadding)
            .padding(.top, 16)

            Divider()
                .background(Color.white.opacity(0.2))
                .padding(.top, 12)

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
                .padding(Layout.horizontalPadding)
            }

            Spacer()

            // ── next-clue button ──
            Button {
                #if os(iOS)
                hapticImpact(.medium)
                #endif
                state.sendNextClue()
            } label: {
                HStack(spacing: 12) {
                    Text("Nästa ledtråd")
                        .font(.buttonPrimary)
                    Image(systemName: "arrow.right.circle.fill")
                        .font(.system(size: 20, weight: .semibold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.accentBlueBright)
                .foregroundColor(.white)
                .cornerRadius(Layout.cornerRadiusLarge)
            }
            .padding(.horizontal, Layout.horizontalPadding)
            .padding(.bottom, 28)
            .shadow(color: .accentBlue.opacity(0.4), radius: Layout.shadowRadius)
        }
        .overlay(alignment: .top) {
            if !state.isConnected { reconnectBanner }
        }
    }

    // ── sub-views ──────────────────────────────────────────────────────────

    private var levelBadge: some View {
        Text(state.levelPoints.map { "\($0) p" } ?? "–")
            .font(.system(size: 16, weight: .bold))
            .padding(.horizontal, 14)
            .padding(.vertical, 6)
            .background(Color.goldYellow)
            .foregroundColor(.black)
            .cornerRadius(20)
    }

    private var statusBadge: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(state.isConnected ? Color.successGreen : Color.errorRed)
                .frame(width: 8, height: 8)
            Text(state.isConnected ? "Ansluten" : "Återansluter…")
                .font(.caption)
                .foregroundColor(state.isConnected ? .successGreen : .errorRed)
        }
    }

    private func secretCard(_ name: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Destinationen (hemligt)", systemImage: "eye.slash.fill")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            Text(name)
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.primary)
            if let country = state.destinationCountry {
                Text(country)
                    .font(.bodyRegular)
                    .foregroundColor(.secondary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.goldYellow.opacity(0.12))
        .cornerRadius(Layout.cornerRadiusMedium)
    }

    private func clueCard(_ clue: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Aktuell ledtråd", systemImage: "text.bubble")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            Text(clue)
                .font(.bodyLarge)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.bgCard)
        .cornerRadius(Layout.cornerRadiusMedium)
    }

    private func brakeNotice(_ name: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 16, weight: .semibold))
            Text("\(name) bromsade")
                .font(.bodyRegular)
                .fontWeight(.semibold)
        }
        .foregroundColor(.white)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.errorRed)
        .cornerRadius(Layout.cornerRadiusMedium)
    }

    @ViewBuilder
    private var lockedAnswersSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Låsta svar (\(state.lockedAnswers.count))", systemImage: "lock.fill")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)

            ForEach(state.lockedAnswers) { a in
                let playerName = state.players.first(where: { $0.playerId == a.playerId })?.name ?? a.playerId
                HStack {
                    Text(playerName)
                        .font(.bodyRegular)
                        .fontWeight(.semibold)
                    Spacer()
                    Text("\"\(a.answerText)\"")
                        .font(.bodyRegular)
                        .foregroundColor(.secondary)
                    Text("@ \(a.lockedAtLevelPoints)")
                        .font(.caption)
                        .foregroundColor(.goldYellow)
                }
                .padding(.vertical, 8)
                .padding(.horizontal, 12)
                .background(Color.bgCard)
                .cornerRadius(Layout.cornerRadiusSmall)
            }
        }
    }

    private var reconnectBanner: some View {
        HStack(spacing: 8) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(0.7)
            Text("Återansluter…")
                .font(.caption)
                .foregroundColor(.white)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color.errorRed)
        .cornerRadius(20)
        .padding(.top, 12)
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
                .padding(.top, 20)
            }

            Divider()
                .background(Color.white.opacity(0.2))
                .padding(.vertical, 12)

            // ── results + scoreboard ──
            GeometryReader { geo in
                if geo.size.width > 500 {
                    // iPad / landscape: side by side
                    HStack(spacing: 24) {
                        resultsColumn
                        Divider()
                            .background(Color.white.opacity(0.2))
                        standingsColumn
                    }
                    .padding()
                } else {
                    // iPhone / portrait: stacked
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) {
                            resultsColumn
                            Divider()
                                .background(Color.white.opacity(0.2))
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
                        Image(systemName: r.isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(r.isCorrect ? .successGreen : .errorRed)
                            .frame(width: 22)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(r.playerName).font(.bodyRegular).fontWeight(.semibold)
                            Text(r.answerText).font(.bodySmall).foregroundColor(.secondary)
                        }
                        Spacer()
                        Text("+\(r.pointsAwarded)")
                            .font(.bodyRegular)
                            .fontWeight(.bold)
                            .foregroundColor(.goldYellow)
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 12)
                    .background(r.isCorrect ? Color.successGreen.opacity(0.1) : Color.bgCard)
                    .cornerRadius(Layout.cornerRadiusSmall)
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
                            .font(.bodyRegular)
                        Spacer()
                        Text("\(entry.totalScore)")
                            .font(.bodyRegular)
                            .fontWeight(.bold)
                    }
                    .padding(.vertical, 6)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func rankColor(_ rank: Int) -> Color {
        switch rank {
        case 1: return .goldYellow
        case 2: return .silverGray
        case 3: return .bronzeOrange
        default: return .gray.opacity(0.4)
        }
    }

    private var reconnectBanner: some View {
        HStack(spacing: 8) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(0.7)
            Text("Återansluter…")
                .font(.caption)
                .foregroundColor(.white)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color.errorRed)
        .cornerRadius(20)
        .padding(.top, 12)
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
                        .font(.system(size: 16, weight: .semibold))
                }
                Spacer()
                statusBadge
            }
            .padding(.horizontal, Layout.horizontalPadding)
            .padding(.top, 16)

            Divider()
                .background(Color.white.opacity(0.2))
                .padding(.top, 12)

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
                .padding(Layout.horizontalPadding)
            }

            Spacer()
        }
        .overlay(alignment: .top) {
            if !state.isConnected { reconnectBanner }
        }
    }

    // ── sub-views ──────────────────────────────────────────────────────────

    private var statusBadge: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(state.isConnected ? Color.successGreen : Color.errorRed)
                .frame(width: 8, height: 8)
            Text(state.isConnected ? "Ansluten" : "Återansluter…")
                .font(.caption)
                .foregroundColor(state.isConnected ? .successGreen : .errorRed)
        }
    }

    /// Green card: the correct answer — visible to HOST immediately.
    private func correctAnswerCard(_ answer: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("RÄTT SVAR (hemligt)", systemImage: "checkmark.seal.fill")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            Text(answer)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.successGreen)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.successGreen.opacity(0.1))
        .cornerRadius(Layout.cornerRadiusMedium)
    }

    /// Gray card: the question text.
    private func questionCard(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Fråga", systemImage: "questionmark.circle")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            Text(text)
                .font(.bodyLarge)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.bgCard)
        .cornerRadius(Layout.cornerRadiusMedium)
    }

    /// Horizontal row of option badges (read-only display).
    private func optionsBadges(_ options: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Alternativ", systemImage: "list.bullet")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(options, id: \.self) { opt in
                        Text(opt)
                            .font(.bodySmall)
                            .fontWeight(.medium)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.bgCard)
                            .cornerRadius(20)
                    }
                }
            }
        }
    }

    /// Live countdown derived from server timestamps.  Ticks via TimelineView.
    private func timerCard(_ fq: HostFollowupQuestion) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Timer", systemImage: "timer")
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
                                    .fill(urgent ? Color.errorRed : Color.accentBlueBright)
                                    .frame(width: geo.size.width * fraction, height: 8)
                            }
                        }
                        .frame(height: 8)

                        Text("\(secs) s")
                            .font(.bodyRegular)
                            .fontWeight(.bold)
                            .foregroundColor(urgent ? .errorRed : .primary)
                            .frame(width: 38, alignment: .trailing)
                    }
                }
            } else {
                Text("—").foregroundColor(.secondary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.bgCard)
        .cornerRadius(Layout.cornerRadiusMedium)
    }

    /// Per-player answers as they trickle in (HOST-only, pre-results).
    private func answersSection(_ answers: [HostFollowupAnswerByPlayer]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Svar (\(answers.count))", systemImage: "text.bubble")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            ForEach(answers) { a in
                HStack {
                    Text(a.playerName)
                        .font(.bodyRegular)
                        .fontWeight(.semibold)
                    Spacer()
                    Text("\"\(a.answerText)\"")
                        .font(.bodyRegular)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 8)
                .padding(.horizontal, 12)
                .background(Color.bgCard)
                .cornerRadius(Layout.cornerRadiusSmall)
            }
        }
    }

    /// Results overlay: correct answer recap + per-player ✓/✗ + points.
    private func resultsSection(_ res: (correctAnswer: String, rows: [HostFollowupResultRow])) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Text("Rätt svar:")
                    .font(.bodyRegular)
                    .foregroundColor(.secondary)
                Text(res.correctAnswer)
                    .font(.bodyRegular)
                    .fontWeight(.bold)
                    .foregroundColor(.successGreen)
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(Color.successGreen.opacity(0.08))
            .cornerRadius(Layout.cornerRadiusSmall)

            Label("Resultat", systemImage: "list.star")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            ForEach(res.rows) { row in
                HStack(spacing: 10) {
                    Image(systemName: row.isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(row.isCorrect ? .successGreen : .errorRed)
                        .frame(width: 20)
                    Text(row.playerName)
                        .font(.bodyRegular)
                        .fontWeight(.semibold)
                    Spacer()
                    Text("+\(row.pointsAwarded)")
                        .font(.bodyRegular)
                        .fontWeight(.bold)
                        .foregroundColor(.goldYellow)
                }
                .padding(.vertical, 8)
                .padding(.horizontal, 12)
                .background(row.isCorrect ? Color.successGreen.opacity(0.1) : Color.bgCard)
                .cornerRadius(Layout.cornerRadiusSmall)
            }
        }
    }

    private var reconnectBanner: some View {
        HStack(spacing: 8) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(0.7)
            Text("Återansluter…")
                .font(.caption)
                .foregroundColor(.white)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color.errorRed)
        .cornerRadius(20)
        .padding(.top, 12)
    }
}

// MARK: – haptic feedback ────────────────────────────────────────────────────

#if os(iOS)
import UIKit

func hapticImpact(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
    UIImpactFeedbackGenerator(style: style).impactOccurred()
}

func hapticNotification(_ type: UINotificationFeedbackGenerator.FeedbackType) {
    UINotificationFeedbackGenerator().notificationOccurred(type)
}

enum HapticStyle {
    case light, medium, heavy
    var feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle {
        switch self {
        case .light: return .light
        case .medium: return .medium
        case .heavy: return .heavy
        }
    }
}

enum HapticNotificationType {
    case success, error, warning
    var feedbackType: UINotificationFeedbackGenerator.FeedbackType {
        switch self {
        case .success: return .success
        case .error: return .error
        case .warning: return .warning
        }
    }
}
#else
func hapticImpact(_ style: Any) {}
func hapticNotification(_ type: Any) {}

enum HapticStyle { case light, medium, heavy }
enum HapticNotificationType { case success, error, warning }
#endif
