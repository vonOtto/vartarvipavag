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
            // Background: BG-0
            Color.bg0.ignoresSafeArea()

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
    @State private var heroScale: CGFloat = 1.0
    @State private var heroOffset: CGFloat = 0

    var body: some View {
        ZStack {
            // Twinkling stars background
            TwinklingStarsView()

            VStack(spacing: Layout.space6) {
                Spacer()

                // Hero image with floating animation
                Image("hero")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 240)
                    .scaleEffect(heroScale)
                    .offset(y: heroOffset)
                    .onAppear {
                        withAnimation(
                            .easeInOut(duration: 2.5)
                            .repeatForever(autoreverses: true)
                        ) {
                            heroScale = 1.05
                            heroOffset = -8
                        }
                    }
                    .padding(.bottom, Layout.space2)

                // Title section
                VStack(spacing: Layout.space1) {
                    Text("tripto")
                        .font(.h1)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.accOrange, .accMint],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .shadow(color: .accOrange.opacity(0.5), radius: 16)

                    Text("Big world. Small couch.")
                        .font(.body)
                        .foregroundColor(.txt2)
                }
                .padding(.bottom, Layout.space3)

            // Buttons
            VStack(spacing: Layout.space2) {
                // Primary: Create game
                Button {
                    #if os(iOS)
                    hapticImpact(.medium)
                    #endif
                    Task { await createSession() }
                } label: {
                    HStack(spacing: Layout.space2) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 20, weight: .semibold))
                        Text("Skapa nytt spel")
                    }
                }
                .buttonStyle(.primary)
                .disabled(busy)
                .shadow(color: .accOrange.opacity(0.4), radius: Layout.shadowRadius)

                // Secondary: Join game
                Button {
                    #if os(iOS)
                    hapticImpact(.light)
                    #endif
                    showJoinSheet = true
                } label: {
                    HStack(spacing: Layout.space2) {
                        Image(systemName: "arrow.right.circle")
                            .font(.system(size: 20, weight: .medium))
                        Text("Gå med i spel")
                    }
                }
                .buttonStyle(.secondary)
                .disabled(busy)
            }
            .padding(.horizontal, Layout.space2)

            // Error message
            if let err = errorMessage {
                Text(err)
                    .font(.body)
                    .foregroundColor(.stateBad)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Layout.space2)
                    .transition(.opacity.combined(with: .scale))
            }

                Spacer()
            }
            .padding(.vertical, Layout.space3)
            .sheet(isPresented: $showJoinSheet) {
                JoinGameSheet(onJoin: { code in
                    showJoinSheet = false
                    Task { await joinSession(code: code) }
                })
            }
        }
    }

    // MARK: – Actions

    private func createSession() async {
        busy = true
        errorMessage = nil

        defer { busy = false }

        do {
            // Step 1: Create session
            let resp = try await HostAPI.createSession()

            state.sessionId     = resp.sessionId
            state.hostAuthToken = resp.hostAuthToken
            state.wsUrl         = resp.wsUrl
            state.joinCode      = resp.joinCode
            state.joinURL       = resp.joinUrlTemplate.replacingOccurrences(
                                      of: "{joinCode}", with: resp.joinCode)

            // Step 2: Auto-generate game plan (3 AI destinations)
            state.isGeneratingPlan = true
            do {
                let planResp = try await HostAPI.createGamePlanAI(
                    sessionId: resp.sessionId,
                    numDestinations: 3
                )
                state.gamePlan = planResp.gamePlan
                state.destinations = planResp.destinations
            } catch {
                // Log error but continue - game can work without multi-destination
                print("Failed to generate game plan: \(error)")
            }
            state.isGeneratingPlan = false

            // Step 3: Connect to WebSocket
            state.connect()

            #if os(iOS)
            hapticNotification(.success)
            #endif
        } catch {
            errorMessage = error.localizedDescription
            state.isGeneratingPlan = false
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
            VStack(spacing: Layout.space4) {
                // Header
                VStack(spacing: Layout.space2) {
                    Image(systemName: "qrcode.viewfinder")
                        .font(.system(size: 56, weight: .light))
                        .foregroundColor(.accMint)

                    Text("Ange join-kod")
                        .font(.h2)
                        .foregroundColor(.txt1)

                    Text("Koden visas på TV:n eller i värdens app")
                        .font(.body)
                        .foregroundColor(.txt2)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, Layout.space4)

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
                    .padding(.vertical, Layout.space3)
                    .background(
                        RoundedRectangle(cornerRadius: Layout.radiusM)
                            .fill(Color.bg1)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: Layout.radiusM)
                            .stroke(code.count == 6 ? Color.accMint : Color.line, lineWidth: 2)
                    )
                    .padding(.horizontal, Layout.space2)
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
                HStack(spacing: Layout.space1) {
                    ForEach(0..<6, id: \.self) { index in
                        Circle()
                            .fill(index < code.count ? Color.accMint : Color.line)
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
                }
                .buttonStyle(.primary)
                .disabled(code.count != 6)
                .opacity(code.count == 6 ? 1.0 : 0.5)
                .padding(.horizontal, Layout.space2)
                .padding(.bottom, Layout.space4)
            }
            .background(Color.bg0)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Avbryt") {
                        hapticImpact(.light)
                        dismiss()
                    }
                    .foregroundColor(.txt1)
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
            VStack(spacing: Layout.space3) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .accMint))
                    .scaleEffect(1.5)

                Text(state.hasEverConnected ? "Återansluter…" : "Ansluter…")
                    .font(.body)
                    .foregroundColor(.txt2)

                if let err = state.error {
                    Text(err)
                        .foregroundColor(.stateBad)
                        .font(.body)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Layout.space2)
                }
            }
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                #if os(iOS)
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        hapticImpact(.light)
                        state.resetSession()
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "chevron.left")
                            Text("Tillbaka")
                        }
                        .foregroundColor(.txt1)
                    }
                }
                #endif
            }
        }
    }
}

// MARK: – lobby host screen ──────────────────────────────────────────────────

/// QR code + join code on top; live player list below; Start Game button.
/// Enhanced with tabs for Lobby and Content management.
struct LobbyHostView: View {
    @EnvironmentObject var state: HostState
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            lobbyTab
                .tabItem {
                    Label("Lobby", systemImage: "person.3.fill")
                }
                .tag(0)

            ContentLibraryView()
                .environmentObject(state)
                .tabItem {
                    Label("Innehåll", systemImage: "tray.fill")
                }
                .tag(1)
        }
        .accentColor(.accOrange)
    }

    // MARK: – Lobby Tab ──────────────────────────────────────────────────────────

    private var lobbyTab: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {
                    // ── QR + join code card ──
                    VStack(spacing: Layout.space2) {
                        if let url = state.joinURL {
                            QRCodeView(url: url, size: 200)
                                .padding(Layout.space2)
                                .background(Color.white)
                                .cornerRadius(Layout.radiusM)
                                .shadow(color: .black.opacity(0.1), radius: 10)
                        }
                        if let code = state.joinCode {
                            Text(code)
                                .font(.system(size: 42, weight: .bold, design: .monospaced))
                                .tracking(4)
                                .foregroundColor(.accMint)
                        }
                        Text("Skanna för att ansluta")
                            .font(.body)
                            .foregroundColor(.txt2)
                    }
                    .padding(.top, Layout.space4)
                    .padding(.bottom, Layout.space3)

                Divider()
                    .background(Color.line)
                    .padding(.vertical, Layout.space2)

                // ── game plan status ──
                if state.isGeneratingPlan {
                    VStack(spacing: Layout.space2) {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .accMint))
                            .scaleEffect(1.2)
                        Text("Genererar resmål...")
                            .font(.body)
                            .foregroundColor(.txt2)
                    }
                    .padding(.vertical, Layout.space4)
                } else if let _ = state.gamePlan, !state.destinations.isEmpty {
                    VStack(alignment: .leading, spacing: Layout.space2) {
                        HStack {
                            Image(systemName: "map.fill")
                                .font(.system(size: 16))
                                .foregroundColor(.accMint)
                            Text("Redo med \(state.destinations.count) resmål")
                                .font(.body)
                                .fontWeight(.semibold)
                                .foregroundColor(.txt1)
                            Spacer()
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 18))
                                .foregroundColor(.stateOk)
                        }

                        // Show destination preview
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: Layout.space1) {
                                ForEach(Array(state.destinations.enumerated()), id: \.offset) { index, dest in
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("\(index + 1). \(dest.name)")
                                            .font(.small)
                                            .fontWeight(.medium)
                                            .foregroundColor(.txt1)
                                        Text(dest.country)
                                            .font(.system(size: 11))
                                            .foregroundColor(.txt2)
                                    }
                                    .padding(.horizontal, Layout.space2)
                                    .padding(.vertical, Layout.space1)
                                    .background(Color.bg2)
                                    .cornerRadius(Layout.radiusS)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, Layout.space2)
                    .padding(.bottom, Layout.space2)
                }

                Divider()
                    .background(Color.line)
                    .padding(.vertical, Layout.space2)

                // ── player list header ──
                HStack {
                    Text("Spelare (\(state.players.count))")
                        .font(.h2)
                        .foregroundColor(.txt1)
                    Spacer()
                    if !state.players.isEmpty {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.stateOk)
                    }
                }
                .padding(.horizontal, Layout.space2)

                // ── player cards ──
                if state.players.isEmpty {
                    VStack(spacing: Layout.space3) {
                        // Friendly waiting state
                        ZStack {
                            Circle()
                                .fill(Color.accOrange.opacity(0.1))
                                .frame(width: 80, height: 80)

                            Image(systemName: "hand.wave.fill")
                                .font(.system(size: 40, weight: .regular))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [Color.accOrange, Color.accMint],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .rotationEffect(.degrees(-15))
                        }

                        Text("Väntar på spelare...")
                            .font(.body)
                            .foregroundColor(.txt2)
                    }
                    .padding(.vertical, Layout.space6)
                } else {
                    VStack(spacing: Layout.space2) {
                        ForEach(state.players) { player in
                            PlayerCard(player: player)
                                .transition(.scale.combined(with: .opacity))
                        }
                    }
                    .padding(.horizontal, Layout.space2)
                    .padding(.top, Layout.space2)
                }

                Spacer(minLength: Layout.space4)

                // ── start button ──
                Button {
                    #if os(iOS)
                    hapticImpact(.heavy)
                    #endif
                    state.sendStartGame()
                } label: {
                    HStack(spacing: Layout.space2) {
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 24, weight: .bold))
                        Text(state.isGeneratingPlan ? "Förbereder spel..." : "Starta spelet")
                    }
                }
                .buttonStyle(.primary)
                .disabled(state.players.isEmpty || state.isGeneratingPlan)
                .opacity((state.players.isEmpty || state.isGeneratingPlan) ? 0.5 : 1.0)
                .padding(.horizontal, Layout.space2)
                .padding(.bottom, Layout.space4)
                .shadow(color: (state.players.isEmpty || state.isGeneratingPlan) ? .clear : .accOrange.opacity(0.4), radius: Layout.shadowRadius)
                }
                .animation(.spring(response: 0.4, dampingFraction: 0.75), value: state.players.count)
            }
            .overlay(alignment: .top) {
                if !state.isConnected { reconnectBanner }
            }
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                #if os(iOS)
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        hapticImpact(.light)
                        state.resetSession()
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "chevron.left")
                            Text("Tillbaka")
                        }
                        .foregroundColor(.txt1)
                    }
                }
                ToolbarItem(placement: .principal) {
                    Text("Lobby")
                        .font(.headline)
                        .foregroundColor(.txt1)
                }
                #endif
            }
        }
    }

    private var reconnectBanner: some View {
        HStack(spacing: Layout.space1) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(0.7)
            Text("Återansluter…")
                .font(.small)
                .foregroundColor(.white)
        }
        .padding(.horizontal, Layout.space2)
        .padding(.vertical, Layout.space1)
        .background(Color.stateBad)
        .cornerRadius(20)
        .padding(.top, Layout.space2)
    }
}

// MARK: – player card ────────────────────────────────────────────────────────

struct PlayerCard: View {
    let player: Player

    var body: some View {
        HStack(spacing: Layout.space2) {
            Circle()
                .fill(player.isConnected ? Color.stateOk : Color.txt3)
                .frame(width: 10, height: 10)
            Text(player.name)
                .font(.body)
                .foregroundColor(.txt1)
            Spacer()
        }
        .padding(.horizontal, Layout.space2)
        .padding(.vertical, Layout.space2)
        .background(
            RoundedRectangle(cornerRadius: Layout.radiusM)
                .fill(Color.bg1)
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
            .padding(.horizontal, Layout.space2)
            .padding(.top, Layout.space2)

            Divider()
                .background(Color.line)
                .padding(.top, Layout.space2)

            ScrollView {
                VStack(alignment: .leading, spacing: Layout.space3) {

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
                .padding(Layout.space2)
            }

            Spacer()

            // ── next-clue button ──
            Button {
                #if os(iOS)
                hapticImpact(.medium)
                #endif
                state.sendNextClue()
            } label: {
                HStack(spacing: Layout.space2) {
                    Text("Nästa ledtråd")
                    Image(systemName: "arrow.right.circle.fill")
                        .font(.system(size: 20, weight: .semibold))
                }
            }
            .buttonStyle(.primary)
            .padding(.horizontal, Layout.space2)
            .padding(.bottom, Layout.space4)
            .shadow(color: .accOrange.opacity(0.4), radius: Layout.shadowRadius)
        }
        .overlay(alignment: .top) {
            if !state.isConnected { reconnectBanner }
        }
    }

    // ── sub-views ──────────────────────────────────────────────────────────

    private var levelBadge: some View {
        Text(state.levelPoints.map { "\($0) p" } ?? "–")
            .font(.system(size: 16, weight: .bold))
            .padding(.horizontal, Layout.space2)
            .padding(.vertical, Layout.space1)
            .background(Color.stateWarn)
            .foregroundColor(.bg0)
            .cornerRadius(20)
    }

    private var statusBadge: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(state.isConnected ? Color.stateOk : Color.stateBad)
                .frame(width: 8, height: 8)
            Text(state.isConnected ? "Ansluten" : "Återansluter…")
                .font(.small)
                .foregroundColor(state.isConnected ? .stateOk : .stateBad)
        }
    }

    private func secretCard(_ name: String) -> some View {
        VStack(alignment: .leading, spacing: Layout.space1) {
            Label("Destinationen (hemligt)", systemImage: "eye.slash.fill")
                .font(.small)
                .foregroundColor(.txt2)
                .textCase(.uppercase)
            Text(name)
                .font(.h2)
                .foregroundColor(.txt1)
            if let country = state.destinationCountry {
                Text(country)
                    .font(.body)
                    .foregroundColor(.txt2)
            }
        }
        .padding(Layout.space3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.stateWarn.opacity(0.15))
        .cornerRadius(Layout.radiusL)
    }

    private func clueCard(_ clue: String) -> some View {
        VStack(alignment: .leading, spacing: Layout.space1) {
            Label("Aktuell ledtråd", systemImage: "text.bubble")
                .font(.small)
                .foregroundColor(.txt2)
                .textCase(.uppercase)
            Text(clue)
                .font(.body)
                .foregroundColor(.txt1)
        }
        .padding(Layout.space3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.bg1)
        .cornerRadius(Layout.radiusL)
    }

    private func brakeNotice(_ name: String) -> some View {
        HStack(spacing: Layout.space1) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 16, weight: .semibold))
            Text("\(name) bromsade")
                .font(.body)
                .fontWeight(.semibold)
        }
        .foregroundColor(.white)
        .padding(.horizontal, Layout.space2)
        .padding(.vertical, Layout.space2)
        .background(Color.stateBad)
        .cornerRadius(Layout.radiusM)
    }

    @ViewBuilder
    private var lockedAnswersSection: some View {
        VStack(alignment: .leading, spacing: Layout.space2) {
            Label("Låsta svar (\(state.lockedAnswers.count))", systemImage: "lock.fill")
                .font(.small)
                .foregroundColor(.txt2)
                .textCase(.uppercase)

            ForEach(state.lockedAnswers) { a in
                let playerName = state.players.first(where: { $0.playerId == a.playerId })?.name ?? a.playerId
                HStack {
                    Text(playerName)
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundColor(.txt1)
                    Spacer()
                    Text("\"\(a.answerText)\"")
                        .font(.body)
                        .foregroundColor(.txt2)
                    Text("@ \(a.lockedAtLevelPoints)")
                        .font(.small)
                        .foregroundColor(.stateWarn)
                }
                .padding(.vertical, Layout.space1)
                .padding(.horizontal, Layout.space2)
                .background(Color.bg1)
                .cornerRadius(Layout.radiusS)
            }
        }
    }

    private var reconnectBanner: some View {
        HStack(spacing: Layout.space1) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(0.7)
            Text("Återansluter…")
                .font(.small)
                .foregroundColor(.white)
        }
        .padding(.horizontal, Layout.space2)
        .padding(.vertical, Layout.space1)
        .background(Color.stateBad)
        .cornerRadius(20)
        .padding(.top, Layout.space2)
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
                        .font(.h2)
                        .foregroundColor(.txt1)
                    if let c = state.destinationCountry {
                        Text("(\(c))")
                            .font(.body)
                            .foregroundColor(.txt2)
                    }
                }
                .padding(.top, Layout.space3)
            }

            Divider()
                .background(Color.line)
                .padding(.vertical, Layout.space2)

            // ── results + scoreboard ──
            GeometryReader { geo in
                if geo.size.width > 500 {
                    // iPad / landscape: side by side
                    HStack(spacing: Layout.space3) {
                        resultsColumn
                        Divider()
                            .background(Color.line)
                        standingsColumn
                    }
                    .padding(Layout.space2)
                } else {
                    // iPhone / portrait: stacked
                    ScrollView {
                        VStack(alignment: .leading, spacing: Layout.space3) {
                            resultsColumn
                            Divider()
                                .background(Color.line)
                            standingsColumn
                        }
                        .padding(Layout.space2)
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
        VStack(alignment: .leading, spacing: Layout.space2) {
            Text("Resultat")
                .font(.h2)
                .foregroundColor(.txt1)

            if state.results.isEmpty {
                Text("Inga resultat än…")
                    .font(.body)
                    .foregroundColor(.txt2)
            } else {
                ForEach(state.results) { r in
                    HStack(spacing: Layout.space2) {
                        Image(systemName: r.isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(r.isCorrect ? .stateOk : .stateBad)
                            .frame(width: 22)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(r.playerName)
                                .font(.body)
                                .fontWeight(.semibold)
                                .foregroundColor(.txt1)
                            Text(r.answerText)
                                .font(.small)
                                .foregroundColor(.txt2)
                        }
                        Spacer()
                        Text("+\(r.pointsAwarded)")
                            .font(.body)
                            .fontWeight(.bold)
                            .foregroundColor(.stateWarn)
                    }
                    .padding(.vertical, Layout.space1)
                    .padding(.horizontal, Layout.space2)
                    .background(r.isCorrect ? Color.stateOk.opacity(0.1) : Color.bg1)
                    .cornerRadius(Layout.radiusS)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // ── standings ────────────────────────────────────────────────────────────

    @ViewBuilder
    private var standingsColumn: some View {
        VStack(alignment: .leading, spacing: Layout.space2) {
            Text("Poängtabell")
                .font(.h2)
                .foregroundColor(.txt1)

            if state.scoreboard.isEmpty {
                Text("Inga poäng än…")
                    .font(.body)
                    .foregroundColor(.txt2)
            } else {
                ForEach(state.scoreboard.enumerated().map({ $0 }), id: \.offset) { idx, entry in
                    HStack(spacing: Layout.space2) {
                        ZStack {
                            Circle()
                                .fill(rankColor(idx + 1))
                                .frame(width: 28, height: 28)
                            Text("\(idx + 1)")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.bg0)
                        }
                        Text(entry.name)
                            .font(.body)
                            .foregroundColor(.txt1)
                        Spacer()
                        Text("\(entry.totalScore)")
                            .font(.body)
                            .fontWeight(.bold)
                            .foregroundColor(.txt1)
                    }
                    .padding(.vertical, Layout.space1)
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
        default: return .txt3
        }
    }

    private var reconnectBanner: some View {
        HStack(spacing: Layout.space1) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(0.7)
            Text("Återansluter…")
                .font(.small)
                .foregroundColor(.white)
        }
        .padding(.horizontal, Layout.space2)
        .padding(.vertical, Layout.space1)
        .background(Color.stateBad)
        .cornerRadius(20)
        .padding(.top, Layout.space2)
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
                        .foregroundColor(.txt1)
                }
                Spacer()
                statusBadge
            }
            .padding(.horizontal, Layout.space2)
            .padding(.top, Layout.space2)

            Divider()
                .background(Color.line)
                .padding(.top, Layout.space2)

            ScrollView {
                VStack(alignment: .leading, spacing: Layout.space3) {

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
                .padding(Layout.space2)
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
                .fill(state.isConnected ? Color.stateOk : Color.stateBad)
                .frame(width: 8, height: 8)
            Text(state.isConnected ? "Ansluten" : "Återansluter…")
                .font(.small)
                .foregroundColor(state.isConnected ? .stateOk : .stateBad)
        }
    }

    /// Green card: the correct answer — visible to HOST immediately.
    private func correctAnswerCard(_ answer: String) -> some View {
        VStack(alignment: .leading, spacing: Layout.space1) {
            Label("RÄTT SVAR (hemligt)", systemImage: "checkmark.seal.fill")
                .font(.small)
                .foregroundColor(.txt2)
                .textCase(.uppercase)
            Text(answer)
                .font(.h2)
                .foregroundColor(.stateOk)
        }
        .padding(Layout.space3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.stateOk.opacity(0.15))
        .cornerRadius(Layout.radiusL)
    }

    /// Gray card: the question text.
    private func questionCard(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: Layout.space1) {
            Label("Fråga", systemImage: "questionmark.circle")
                .font(.small)
                .foregroundColor(.txt2)
                .textCase(.uppercase)
            Text(text)
                .font(.body)
                .foregroundColor(.txt1)
        }
        .padding(Layout.space3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.bg1)
        .cornerRadius(Layout.radiusL)
    }

    /// Horizontal row of option badges (read-only display).
    private func optionsBadges(_ options: [String]) -> some View {
        VStack(alignment: .leading, spacing: Layout.space1) {
            Label("Alternativ", systemImage: "list.bullet")
                .font(.small)
                .foregroundColor(.txt2)
                .textCase(.uppercase)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Layout.space1) {
                    ForEach(options, id: \.self) { opt in
                        Text(opt)
                            .font(.small)
                            .fontWeight(.medium)
                            .foregroundColor(.txt1)
                            .padding(.horizontal, Layout.space2)
                            .padding(.vertical, Layout.space1)
                            .background(Color.bg2)
                            .cornerRadius(20)
                    }
                }
            }
        }
    }

    /// Live countdown derived from server timestamps.  Ticks via TimelineView.
    private func timerCard(_ fq: HostFollowupQuestion) -> some View {
        VStack(alignment: .leading, spacing: Layout.space1) {
            Label("Timer", systemImage: "timer")
                .font(.small)
                .foregroundColor(.txt2)
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

                    HStack(spacing: Layout.space2) {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.line).frame(height: 8)
                                Capsule()
                                    .fill(urgent ? Color.stateBad : Color.accMint)
                                    .frame(width: geo.size.width * fraction, height: 8)
                            }
                        }
                        .frame(height: 8)

                        Text("\(secs) s")
                            .font(.body)
                            .fontWeight(.bold)
                            .foregroundColor(urgent ? .stateBad : .txt1)
                            .frame(width: 38, alignment: .trailing)
                    }
                }
            } else {
                Text("—").foregroundColor(.txt2)
            }
        }
        .padding(Layout.space3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.bg1)
        .cornerRadius(Layout.radiusL)
    }

    /// Per-player answers as they trickle in (HOST-only, pre-results).
    private func answersSection(_ answers: [HostFollowupAnswerByPlayer]) -> some View {
        VStack(alignment: .leading, spacing: Layout.space2) {
            Label("Svar (\(answers.count))", systemImage: "text.bubble")
                .font(.small)
                .foregroundColor(.txt2)
                .textCase(.uppercase)
            ForEach(answers) { a in
                HStack {
                    Text(a.playerName)
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundColor(.txt1)
                    Spacer()
                    Text("\"\(a.answerText)\"")
                        .font(.body)
                        .foregroundColor(.txt2)
                }
                .padding(.vertical, Layout.space1)
                .padding(.horizontal, Layout.space2)
                .background(Color.bg1)
                .cornerRadius(Layout.radiusS)
            }
        }
    }

    /// Results overlay: correct answer recap + per-player ✓/✗ + points.
    private func resultsSection(_ res: (correctAnswer: String, rows: [HostFollowupResultRow])) -> some View {
        VStack(alignment: .leading, spacing: Layout.space2) {
            HStack(spacing: Layout.space1) {
                Text("Rätt svar:")
                    .font(.body)
                    .foregroundColor(.txt2)
                Text(res.correctAnswer)
                    .font(.body)
                    .fontWeight(.bold)
                    .foregroundColor(.stateOk)
            }
            .padding(.vertical, Layout.space1)
            .padding(.horizontal, Layout.space2)
            .background(Color.stateOk.opacity(0.1))
            .cornerRadius(Layout.radiusS)

            Label("Resultat", systemImage: "list.star")
                .font(.small)
                .foregroundColor(.txt2)
                .textCase(.uppercase)
            ForEach(res.rows) { row in
                HStack(spacing: Layout.space2) {
                    Image(systemName: row.isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(row.isCorrect ? .stateOk : .stateBad)
                        .frame(width: 20)
                    Text(row.playerName)
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundColor(.txt1)
                    Spacer()
                    Text("+\(row.pointsAwarded)")
                        .font(.body)
                        .fontWeight(.bold)
                        .foregroundColor(.stateWarn)
                }
                .padding(.vertical, Layout.space1)
                .padding(.horizontal, Layout.space2)
                .background(row.isCorrect ? Color.stateOk.opacity(0.1) : Color.bg1)
                .cornerRadius(Layout.radiusS)
            }
        }
    }

    private var reconnectBanner: some View {
        HStack(spacing: Layout.space1) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(0.7)
            Text("Återansluter…")
                .font(.small)
                .foregroundColor(.white)
        }
        .padding(.horizontal, Layout.space2)
        .padding(.vertical, Layout.space1)
        .background(Color.stateBad)
        .cornerRadius(20)
        .padding(.top, Layout.space2)
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

// MARK: – twinkling stars animation ──────────────────────────────────────────

/// Subtle twinkling stars background with floating movement for LaunchView.
struct TwinklingStarsView: View {
    @State private var isAnimating = false

    struct MovingParticle: Identifiable {
        let id = UUID()
        let startX: CGFloat
        let startY: CGFloat
        let size: CGFloat
        let color: Color
        let moveX: CGFloat
        let moveY: CGFloat
        let duration: Double
        let delay: Double
    }

    var body: some View {
        GeometryReader { geo in
            let width = geo.size.width
            let height = geo.size.height
            let particles = generateParticles(width: width, height: height)

            ZStack {
                ForEach(particles) { particle in
                    Circle()
                        .fill(particle.color)
                        .frame(width: particle.size, height: particle.size)
                        .blur(radius: 1)
                        .offset(
                            x: particle.startX + (isAnimating ? particle.moveX : 0),
                            y: particle.startY + (isAnimating ? particle.moveY : 0)
                        )
                        .opacity(isAnimating ? 0.7 : 0.3)
                        .animation(
                            .easeInOut(duration: particle.duration)
                            .repeatForever(autoreverses: true)
                            .delay(particle.delay),
                            value: isAnimating
                        )
                }
            }
            .frame(width: width, height: height)
            .onAppear {
                isAnimating = true
            }
        }
    }

    private func generateParticles(width: CGFloat, height: CGFloat) -> [MovingParticle] {
        let colors: [Color] = [.accMint, .accMint, .accMint, .accMint, .accOrange, .accBlue]

        return (0..<20).map { i in
            MovingParticle(
                startX: CGFloat.random(in: -width/2...width/2),
                startY: CGFloat.random(in: -height/2...height/2),
                size: CGFloat.random(in: 2...5),
                color: colors.randomElement()!,
                moveX: CGFloat.random(in: -30...30),
                moveY: CGFloat.random(in: -30...30),
                duration: Double.random(in: 3...5),
                delay: Double(i) * 0.2
            )
        }
    }
}
