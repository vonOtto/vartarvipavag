import SwiftUI

// MARK: – entry point ────────────────────────────────────────────────────────

@main
struct PaSparetTVApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
        }
    }
}

// MARK: – root router ────────────────────────────────────────────────────────

struct RootView: View {
    @EnvironmentObject var appState: AppState

    private static let lobbyPhases     : Set<String> = ["LOBBY", "PREPARING_ROUND"]
    private static let cluePhases      : Set<String> = ["CLUE_LEVEL", "PAUSED_FOR_BRAKE"]
    private static let scoreboardPhases: Set<String> = ["SCOREBOARD", "ROUND_END", "FINAL_RESULTS"]

    var body: some View {
        ZStack {
            if appState.sessionId == nil {
                LaunchView()
            } else if !appState.sessionReady {
                ConnectingView()
            } else if Self.lobbyPhases.contains(appState.phase) {
                LobbyView()
            } else if appState.phase == "NEXT_DESTINATION" {
                // Show transition screen between destinations
                if let name = appState.destinationName,
                   let country = appState.destinationCountry,
                   let index = appState.destinationIndex,
                   let total = appState.totalDestinations {
                    NextDestinationView(
                        destinationName: name,
                        destinationCountry: country,
                        destinationIndex: index,
                        totalDestinations: total
                    )
                    .transition(.opacity)
                } else {
                    // Fallback if data is missing
                    LiveView()
                }
            } else if appState.phase == "ROUND_INTRO" {
                RoundIntroView()
            } else if Self.cluePhases.contains(appState.phase) {
                TVClueView()
            } else if appState.phase == "REVEAL_DESTINATION" {
                TVRevealView()
            } else if appState.phase == "FOLLOWUP_QUESTION" {
                TVFollowupView()
            } else if Self.scoreboardPhases.contains(appState.phase) {
                TVScoreboardView()
            } else {
                LiveView()
            }

            if let overlayText = appState.voiceOverlayText {
                VoiceOverlay(text: overlayText)
            }

            if appState.showConfetti {
                ConfettiView { appState.showConfetti = false }
            }
        }
        .animation(.easeInOut(duration: 0.5), value: appState.phase)
    }
}

// MARK: – voice overlay ──────────────────────────────────────────────────────

/// Semi-transparent text banner that surfaces during TTS playback or
/// text-only VOICE_LINE events.  Hit-testing is disabled so that it
/// never steals focus from the underlying game view.
private struct VoiceOverlay: View {
    let text: String

    var body: some View {
        VStack {
            Spacer()
            Text(text)
                .font(.tvBody)  // 34pt
                .foregroundColor(.txt1)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Layout.space48)
                .padding(.vertical, Layout.space24)
                .background(
                    RoundedRectangle(cornerRadius: Layout.radiusL, style: .continuous)
                        .fill(Color.bg1)
                )
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .allowsHitTesting(false)
    }
}

// MARK: – launch screen ──────────────────────────────────────────────────────

/// First screen after app launch.  Offers three options:
/// 1) Create a new session (becomes TV, shows QR for players)
/// 2) Join a discovered session via Bonjour/mDNS (auto-discover on LAN)
/// 3) Join an existing session by entering a join code manually
struct LaunchView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var bonjourDiscovery = BonjourDiscovery()
    @State private var joinCode: String = ""
    @State private var busy = false
    @State private var errorMessage: String?
    @State private var heroScale: CGFloat = 1.0
    @State private var heroOffset: CGFloat = 0

    var body: some View {
        ZStack {
            Color.bg0.ignoresSafeArea()

            // Moving particles background
            MovingParticlesView()

            VStack(spacing: Layout.space48) {
                // Hero image with floating animation
                Image("hero")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 350)
                    .scaleEffect(heroScale)
                    .offset(y: heroOffset)
                    .onAppear {
                        withAnimation(.easeInOut(duration: 2.5).repeatForever(autoreverses: true)) {
                            heroScale = 1.05
                            heroOffset = -10
                        }
                    }

                // Title
                VStack(spacing: Layout.space16) {
                    Text("tripto")
                        .font(.tvH1)  // 72pt Semibold
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.accOrange, .accMint],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .textCase(.lowercase)

                    Text("Big world. Small couch.")
                        .font(.tvMeta)  // 28pt
                        .tracking(6)
                        .foregroundColor(.txt2)
                }

                // Create button (primary action)
                PrimaryButton(
                    title: busy ? "Skapar spel..." : "Skapa nytt spel",
                    action: { Task { await createSession() } },
                    isLoading: busy
                )
                .disabled(busy)

                // Divider with "eller" (or)
                HStack(spacing: Layout.space24) {
                    Rectangle()
                        .fill(Color.txt3.opacity(0.3))
                        .frame(height: 2)
                        .frame(maxWidth: 200)
                    Text("eller")
                        .font(.tvMeta)  // 28pt
                        .foregroundColor(.txt3)
                    Rectangle()
                        .fill(Color.txt3.opacity(0.3))
                        .frame(height: 2)
                        .frame(maxWidth: 200)
                }
                .padding(.vertical, Layout.space16)

                // Discovered sessions section (Bonjour)
                if !bonjourDiscovery.discoveredSessions.isEmpty {
                    discoveredSessionsSection
                }

                // Join code input (secondary action)
                VStack(spacing: Layout.space24) {
                    Text("Ange join-kod från värden")
                        .font(.tvBody)  // 34pt
                        .foregroundColor(.txt1)

                    FocusableTextField(text: $joinCode, busy: busy)

                    if joinCode.isEmpty {
                        Text("Koden är 6 tecken")
                            .font(.tvMeta)  // 28pt
                            .foregroundColor(.txt3)
                    } else {
                        Text("\(joinCode.count) / 6")
                            .font(.tvMeta)  // 28pt
                            .foregroundColor(joinCode.count == 6 ? .accMint : .txt3)
                    }
                }

                // Error message
                if let error = errorMessage {
                    Text(error)
                        .font(.tvMeta)  // 28pt
                        .foregroundColor(.statusBad)
                        .padding(.horizontal, 60)
                        .multilineTextAlignment(.center)
                }

                // Join button
                PrimaryButton(
                    title: busy ? "Ansluter..." : "Hoppa in!",
                    action: { Task { await joinSession() } },
                    isLoading: busy
                )
                .disabled(joinCode.count != 6 || busy)
                .opacity(joinCode.count == 6 ? 1.0 : 0.5)
            }
            .padding(60)
        }
        .onAppear {
            bonjourDiscovery.startDiscovery()
        }
        .onDisappear {
            bonjourDiscovery.stopDiscovery()
        }
    }

    // MARK: – Discovered Sessions Section

    @ViewBuilder
    private var discoveredSessionsSection: some View {
        VStack(spacing: Layout.space24) {
            Text("Sessioner i närheten")
                .font(.tvBody)  // 34pt
                .foregroundColor(.txt1)

            VStack(spacing: Layout.space16) {
                ForEach(bonjourDiscovery.discoveredSessions) { session in
                    DiscoveredSessionRow(session: session) {
                        Task { await joinDiscoveredSession(session) }
                    }
                    .disabled(busy)
                }
            }
        }
        .transition(.opacity.combined(with: .scale))
    }

    // MARK: – Create Session

    private func createSession() async {
        busy = true
        errorMessage = nil

        do {
            // Create new session via REST API
            let response = try await SessionAPI.createSession()

            // Set credentials and connect as TV
            appState.sessionId = response.sessionId
            appState.joinCode  = response.joinCode
            appState.token     = response.tvJoinToken
            appState.wsUrl     = response.wsUrl
            appState.connect()

        } catch {
            errorMessage = "Kunde inte skapa session: \(error.localizedDescription)"
            busy = false
        }
    }

    // MARK: – Join Session

    private func joinSession() async {
        guard joinCode.count == 6 else { return }

        busy = true
        errorMessage = nil

        do {
            // Step 1: Lookup session by code
            let lookup = try await SessionAPI.lookupByCode(joinCode)

            // Step 2: Join as TV
            let joinResponse = try await SessionAPI.joinAsTV(sessionId: lookup.sessionId)

            // Step 3: Set credentials and connect
            appState.sessionId = lookup.sessionId
            appState.joinCode  = lookup.joinCode
            appState.token     = joinResponse.tvAuthToken
            appState.wsUrl     = joinResponse.wsUrl
            appState.connect()

        } catch {
            errorMessage = "Kunde inte ansluta: \(error.localizedDescription)"
            busy = false
        }
    }

    // MARK: – Join Discovered Session

    private func joinDiscoveredSession(_ session: DiscoveredSession) async {
        busy = true
        errorMessage = nil

        do {
            // Step 1: Lookup session by code
            let lookup = try await SessionAPI.lookupByCode(session.joinCode)

            // Step 2: Join as TV
            let joinResponse = try await SessionAPI.joinAsTV(sessionId: lookup.sessionId)

            // Step 3: Set credentials and connect
            appState.sessionId = lookup.sessionId
            appState.joinCode  = lookup.joinCode
            appState.token     = joinResponse.tvAuthToken
            appState.wsUrl     = joinResponse.wsUrl
            appState.connect()

        } catch {
            errorMessage = "Kunde inte ansluta till \(session.joinCode): \(error.localizedDescription)"
            busy = false
        }
    }
}

// MARK: – Discovered Session Row

/// Row displaying a discovered Bonjour session with join button.
private struct DiscoveredSessionRow: View {
    let session: DiscoveredSession
    let onJoin: () -> Void

    @Environment(\.isFocused) private var isFocused

    var body: some View {
        Button(action: onJoin) {
            HStack(spacing: Layout.space24) {
                // Session icon
                Image(systemName: "antenna.radiowaves.left.and.right")
                    .font(.system(size: 36, weight: .semibold))
                    .foregroundColor(.accMint)

                VStack(alignment: .leading, spacing: 4) {
                    // Join code
                    Text(session.joinCode.uppercased())
                        .font(.system(size: 42, weight: .bold, design: .monospaced))
                        .foregroundColor(.txt1)

                    // Session info
                    if session.destinationCount > 0 {
                        Text("\(session.destinationCount) destinationer")
                            .font(.tvMeta)  // 28pt
                            .foregroundColor(.txt2)
                    }
                }

                Spacer()

                // Join arrow
                Image(systemName: "arrow.right.circle.fill")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(isFocused ? .accOrange : .txt3)
            }
            .padding(.horizontal, Layout.cardPadding)
            .padding(.vertical, Layout.space24)
            .background(
                RoundedRectangle(cornerRadius: Layout.radiusM, style: .continuous)
                    .fill(isFocused ? Color.bg1.opacity(0.9) : Color.bg1)
                    .overlay(
                        RoundedRectangle(cornerRadius: Layout.radiusM, style: .continuous)
                            .stroke(
                                isFocused ? Color.accMint.opacity(0.5) : Color.clear,
                                lineWidth: 2
                            )
                    )
                    .shadow(color: isFocused ? Color.accMint.opacity(0.3) : .clear, radius: 12, x: 0, y: 0)
            )
            .scaleEffect(isFocused ? 1.05 : 1.0)
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.2), value: isFocused)
    }
}

// MARK: – focusable text field ───────────────────────────────────────────────

/// Custom text field with subtle focus state for tvOS.
private struct FocusableTextField: View {
    @Binding var text: String
    let busy: Bool
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        TextField("", text: $text)
            .font(.system(size: 64, weight: .bold, design: .monospaced))
            .multilineTextAlignment(.center)
            .textCase(.uppercase)
            .frame(width: 500)
            .padding(.vertical, Layout.space24)
            .background(
                RoundedRectangle(cornerRadius: Layout.radiusM, style: .continuous)
                    .fill(isFocused ? Color.bg1.opacity(0.9) : Color.bg1)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Layout.radiusM, style: .continuous)
                    .stroke(
                        isFocused ? Color.accMint.opacity(0.3) : Color.accMint.opacity(0.5),
                        lineWidth: 2
                    )
                    .shadow(
                        color: isFocused ? Color.accMint.opacity(0.3) : .clear,
                        radius: 8
                    )
            )
            .scaleEffect(isFocused ? 1.05 : 1.0)
            .disabled(busy)
            .onChange(of: text) { newValue in
                let filtered = newValue
                    .uppercased()
                    .filter { $0.isLetter || $0.isNumber }
                    .prefix(6)
                if filtered != newValue {
                    text = String(filtered)
                }
            }
            .animation(.easeInOut(duration: 0.2), value: isFocused)
    }
}

// MARK: – connecting screen ─────────────────────────────────────────────────

struct ConnectingView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.bg0.ignoresSafeArea()

            VStack(spacing: Layout.space32) {
                Text(appState.hasEverConnected ? "Återansluter…" : "Ansluter…")
                    .font(.tvBody)  // 34pt
                    .foregroundColor(.txt2)
                if let err = appState.error {
                    Text(err)
                        .foregroundColor(.statusBad)
                        .font(.tvMeta)  // 28pt
                }
            }

            // Back button
            BackButton()
                .padding(40)
        }
    }
}

// MARK: – lobby screen ───────────────────────────────────────────────────────

/// Origin used inside the QR code.  Must be reachable from the player's phone.
/// On LAN set to http://<LAN-IP>:3000  (same value as backend PUBLIC_BASE_URL).
private let PUBLIC_BASE_URL = ProcessInfo.processInfo.environment["PUBLIC_BASE_URL"]
                              ?? "http://localhost:3000"

struct LobbyView: View {
    @EnvironmentObject var appState: AppState

    // Animation states
    @State private var titleScale: CGFloat = 1.0
    @State private var titleOpacity: Double = 1.0
    @State private var lastPlayerCount = 0
    @State private var showJoinSparkles = false

    var body: some View {
        ZStack(alignment: .top) {
            Color.bg0.ignoresSafeArea()

            // Content
            VStack(spacing: Layout.space48) {
                gameShowTitle

                HStack(spacing: 80) {
                    qrColumn
                    playerColumn
                }

                Spacer()

                statusIndicator
            }
            .padding(60)

            if !appState.isConnected { reconnectBanner }

            // "Tillbaka till start" button — top-left corner
            VStack {
                HStack {
                    BackButton()
                    Spacer()
                }
                Spacer()
            }
            .padding(40)

            // "Nytt spel" button — bottom-right corner, subtle secondary style
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    NewGameButton()
                }
            }
            .padding(40)

            // Join sparkles overlay
            if showJoinSparkles {
                JoinSparklesView {
                    showJoinSparkles = false
                }
            }
        }
        .onAppear {
            startTitleAnimation()
            lastPlayerCount = appState.players.count
        }
        .onChange(of: appState.players.count) { newCount in
            if newCount > lastPlayerCount {
                showJoinSparkles = true
            }
            lastPlayerCount = newCount
        }
    }

    // ── Game show title ──
    @ViewBuilder
    private var gameShowTitle: some View {
        VStack(spacing: Layout.space16) {
            Text("tripto")
                .font(.tvH1)  // 72pt Semibold
                .foregroundStyle(
                    LinearGradient(
                        colors: [.accOrange, .accMint],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .textCase(.lowercase)
                .scaleEffect(titleScale)
                .opacity(titleOpacity)

            Text("Big world. Small couch.")
                .font(.tvMeta)  // 28pt
                .tracking(6)
                .foregroundColor(.txt2)
        }
    }

    private func startTitleAnimation() {
        withAnimation(
            .easeInOut(duration: 2.0)
            .repeatForever(autoreverses: true)
        ) {
            titleScale = 1.05
            titleOpacity = 0.85
        }
    }

    // ── QR + join code (enhanced) ──
    @ViewBuilder
    private var qrColumn: some View {
        VStack(spacing: Layout.space24) {
            // Enhanced card with proper styling
            VStack(spacing: Layout.space24) {
                QRCodeView(url: joinURL)
                    .padding(Layout.space24)
                    .background(Color.white)
                    .cornerRadius(Layout.radiusM)

                Text("Skanna för att ansluta")
                    .font(.tvMeta)  // 28pt
                    .foregroundColor(.txt2)
            }
            .padding(Layout.cardPadding)  // 32pt for TV
            .background(Color.bg1)
            .cornerRadius(Layout.radiusL)  // 24pt

            // Join code
            if let code = appState.joinCode {
                Text(code.uppercased().map { String($0) }.joined(separator: "  "))
                    .font(.system(size: 52, weight: .bold, design: .monospaced))
                    .tracking(8)
                    .foregroundColor(.accMint)
            }
        }
    }

    // ── player list (enhanced) ──
    @ViewBuilder
    private var playerColumn: some View {
        VStack(alignment: .leading, spacing: Layout.space24) {
            // Section header with pulse
            HStack(spacing: Layout.space16) {
                if !appState.players.isEmpty {
                    Circle()
                        .fill(Color.statusOk)
                        .frame(width: 12, height: 12)
                        .overlay(
                            Circle()
                                .stroke(Color.statusOk, lineWidth: 2)
                                .scaleEffect(1.4)
                                .opacity(0)
                                .animation(
                                    .easeOut(duration: 1.2)
                                    .repeatForever(autoreverses: false),
                                    value: appState.players.count
                                )
                        )
                }

                Text("SPELARE")
                    .font(.tvMeta)  // 28pt
                    .tracking(2)
                    .foregroundColor(.txt3)

                Text("(\(appState.players.count))")
                    .font(.tvMeta)  // 28pt
                    .foregroundColor(.accMint)
            }

            // Host row (enhanced)
            if let host = appState.hostName {
                HStack(spacing: Layout.space16) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.accOrange)

                    Text(host)
                        .font(.tvBody)  // 34pt
                        .foregroundColor(.accOrange)

                    Text("VÄRD")
                        .font(.tvMeta)  // 28pt
                        .tracking(1)
                        .foregroundColor(.accOrange)
                        .padding(.horizontal, Layout.space16)
                        .padding(.vertical, 4)
                        .background(
                            Capsule()
                                .fill(Color.accOrange.opacity(0.15))
                        )
                }
                .padding(.horizontal, Layout.space24)
                .padding(.vertical, Layout.space16)
                .background(Color.bg2)
                .cornerRadius(Layout.radiusM)
                .padding(.bottom, Layout.space16)
            }

            // Player cards
            ForEach(Array(appState.players.enumerated()), id: \.element.id) { index, player in
                EnhancedPlayerRow(player: player, number: index + 1)
                    .transition(.scale.combined(with: .opacity))
            }

            // Empty state
            if appState.players.isEmpty {
                VStack(spacing: Layout.space24) {
                    // Friendly waiting state for TV
                    ZStack {
                        Circle()
                            .fill(Color.accOrange.opacity(0.08))
                            .frame(width: 160, height: 160)

                        Image(systemName: "hand.wave.fill")
                            .font(.system(size: 72, weight: .regular))
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
                        .font(.tvMeta)  // 28pt
                        .italic()
                        .foregroundColor(.txt3)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 40)
            }
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.7), value: appState.players.count)
    }

    // ── Status indicator ──
    @ViewBuilder
    private var statusIndicator: some View {
        let hasPlayers = !appState.players.isEmpty

        HStack(spacing: Layout.space16) {
            if hasPlayers {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.statusOk)
            } else {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .txt3))
                    .scaleEffect(1.2)
            }

            Text(hasPlayers ? "Redo att starta! Värden startar spelet." : "Väntar på spelare att ansluta...")
                .font(.tvMeta)  // 28pt
                .foregroundColor(hasPlayers ? .txt1 : .txt2)
        }
        .padding(.horizontal, 40)
        .padding(.vertical, Layout.space24)
        .background(
            Capsule()
                .fill(hasPlayers ? Color.statusOk.opacity(0.15) : Color.bg1)
                .overlay(
                    Capsule()
                        .stroke(hasPlayers ? Color.statusOk.opacity(0.3) : Color.clear, lineWidth: 2)
                )
        )
    }

    private var joinURL: String {
        "\(PUBLIC_BASE_URL)/join/\(appState.joinCode ?? "")"
    }

    private var reconnectBanner: some View {
        HStack(spacing: Layout.space16) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .txt1))
                .scaleEffect(0.6)

            Text("Återansluter...")
                .font(.tvMeta)  // 28pt
                .foregroundColor(.txt1)
        }
        .padding(.horizontal, Layout.cardPadding)
        .padding(.vertical, Layout.space16)
        .background(
            Capsule()
                .fill(Color.statusBad.opacity(0.9))
        )
        .padding(.top, Layout.space24)
    }
}

// MARK: – Enhanced Player Row ────────────────────────────────────────────────

struct EnhancedPlayerRow: View {
    let player: Player
    let number: Int

    @State private var pulseScale: CGFloat = 1.0

    var body: some View {
        HStack(spacing: Layout.space16) {
            // Player number badge
            Text("#\(number)")
                .font(.tvMeta)  // 28pt
                .foregroundColor(.accMint)
                .frame(minWidth: 48)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(Color.accMint.opacity(0.15))
                )

            // Connection indicator with pulse
            ZStack {
                // Pulse ring
                if player.isConnected {
                    Circle()
                        .stroke(Color.statusOk.opacity(0.6), lineWidth: 2)
                        .frame(width: 24, height: 24)
                        .scaleEffect(pulseScale)
                        .opacity(2 - pulseScale)
                }

                // Connection dot
                Circle()
                    .fill(player.isConnected ? Color.statusOk : Color.txt3)
                    .frame(width: 16, height: 16)
            }
            .onAppear {
                if player.isConnected {
                    withAnimation(
                        .easeOut(duration: 1.2)
                        .repeatForever(autoreverses: false)
                    ) {
                        pulseScale = 1.4
                    }
                }
            }

            // Player name
            Text(player.name)
                .font(.tvBody)  // 34pt
                .foregroundColor(.txt1)

            Spacer()
        }
        .padding(.horizontal, Layout.space24)
        .padding(.vertical, Layout.space16)
        .background(
            RoundedRectangle(cornerRadius: Layout.radiusM, style: .continuous)
                .fill(Color.bg2)
                .overlay(
                    RoundedRectangle(cornerRadius: Layout.radiusM, style: .continuous)
                        .stroke(
                            player.isConnected ? Color.statusOk.opacity(0.3) : Color.clear,
                            lineWidth: 2
                        )
                )
        )
        .opacity(player.isConnected ? 1.0 : 0.7)
    }
}

// MARK: – Join Sparkles Effect ───────────────────────────────────────────────

struct JoinSparklesView: View {
    let onComplete: () -> Void

    var body: some View {
        ZStack {
            ForEach(0..<15, id: \.self) { index in
                SparklePiece(index: index)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .allowsHitTesting(false)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                onComplete()
            }
        }
    }
}

struct SparklePiece: View {
    let index: Int

    @State private var scale: CGFloat = 0
    @State private var opacity: Double = 1
    @State private var offset: CGSize = .zero

    private var color: Color {
        let colors: [Color] = [.accentBlueBright, .successGreenBright, .goldYellow, .white]
        return colors[index % colors.count]
    }

    var body: some View {
        GeometryReader { geometry in
            Circle()
                .fill(color)
                .frame(width: 12, height: 12)
                .scaleEffect(scale)
                .opacity(opacity)
                .offset(offset)
                .position(x: geometry.size.width * 0.7, y: geometry.size.height * 0.5)
        }
        .onAppear {
            // Use simple LCG for deterministic random values
            let seed = index * 48271 % 2147483647
            let angle = Double(seed % 360) * .pi / 180
            let distance = CGFloat(80 + (seed % 120))

            let duration = 0.6 + Double(index % 6) * 0.1

            withAnimation(.easeOut(duration: duration)) {
                scale = 1.5
                opacity = 0
                offset = CGSize(
                    width: cos(angle) * distance,
                    height: sin(angle) * distance
                )
            }
        }
    }
}

// MARK: – Shared Navigation Buttons ─────────────────────────────────────────

/// "Tillbaka till start" button — Secondary style with proper tvOS focus states.
struct BackButton: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        Button(action: {
            appState.resetSession()
        }) {
            HStack(spacing: Layout.space16) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 28, weight: .semibold))
                Text("Tillbaka till start")
                    .font(.tvMeta)  // 28pt
            }
            .foregroundColor(.txt1)
            .padding(.horizontal, Layout.cardPadding)
            .padding(.vertical, Layout.space16)
            .frame(height: Layout.buttonHeight)  // 72pt
            .background(
                RoundedRectangle(cornerRadius: Layout.radiusM, style: .continuous)
                    .fill(isFocused ? Color.bg2.opacity(0.8) : Color.bg2)
                    .overlay(
                        RoundedRectangle(cornerRadius: Layout.radiusM, style: .continuous)
                            .stroke(
                                isFocused ? Color.accMint.opacity(0.5) : Color.clear,
                                lineWidth: 2
                            )
                    )
                    .shadow(color: isFocused ? Color.accMint.opacity(0.3) : .clear, radius: 12, x: 0, y: 0)
            )
            .scaleEffect(isFocused ? 1.05 : 1.0)
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.2), value: isFocused)
    }
}

/// "Nytt spel" button — Secondary style.
struct NewGameButton: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        Button(action: {
            appState.resetSession()
        }) {
            HStack(spacing: Layout.space16) {
                Image(systemName: "arrow.counterclockwise")
                    .font(.system(size: 28, weight: .semibold))
                Text("Nytt spel")
                    .font(.tvMeta)  // 28pt
            }
            .foregroundColor(.txt1)
            .padding(.horizontal, Layout.cardPadding)
            .padding(.vertical, Layout.space16)
            .frame(height: Layout.buttonHeight)  // 72pt
            .background(
                RoundedRectangle(cornerRadius: Layout.radiusM, style: .continuous)
                    .fill(isFocused ? Color.bg2.opacity(0.8) : Color.bg2)
                    .overlay(
                        RoundedRectangle(cornerRadius: Layout.radiusM, style: .continuous)
                            .stroke(
                                isFocused ? Color.accMint.opacity(0.5) : Color.clear,
                                lineWidth: 2
                            )
                    )
                    .shadow(color: isFocused ? Color.accMint.opacity(0.3) : .clear, radius: 12, x: 0, y: 0)
            )
            .scaleEffect(isFocused ? 1.05 : 1.0)
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.2), value: isFocused)
    }
}


// MARK: – live game screen (placeholder — expanded in TASK 503–504) ──────────

struct LiveView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack {
            Color.bg0.ignoresSafeArea()

            VStack(spacing: Layout.space24) {
                HStack {
                    Text("Phase:")
                    Text(appState.phase).fontWeight(.bold)
                }
                .font(.tvH2)  // 48pt
                .foregroundColor(.accMint)

                statusBadge

                if let clue = appState.clueText {
                    Text(clue)
                        .font(.tvBody)  // 34pt
                        .foregroundColor(.txt1)
                }
                if let pts = appState.levelPoints {
                    Text("\(pts) pts")
                        .font(.tvH2)  // 48pt
                        .foregroundColor(.accOrange)
                }
                if !appState.players.isEmpty {
                    Text("Players: \(appState.players.map { $0.name }.joined(separator: ", "))")
                        .font(.tvBody)  // 34pt
                        .foregroundColor(.txt1)
                }
                if let err = appState.error {
                    Text(err)
                        .foregroundColor(.statusBad)
                        .font(.tvMeta)  // 28pt
                }
            }
            .padding(Layout.verticalPadding)
        }
    }

    @ViewBuilder
    private var statusBadge: some View {
        Text(appState.isConnected ? "● Connected" : "○ Reconnecting…")
            .foregroundColor(appState.isConnected ? .statusOk : .statusBad)
            .font(.tvBody)  // 34pt
    }
}

// MARK: – Primary Button (Orange) ────────────────────────────────────────────

/// Primary button — Orange accent, 72pt height, 16pt radius, proper focus states.
struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    var isLoading: Bool = false

    @Environment(\.isFocused) private var isFocused

    var body: some View {
        Button(action: action) {
            HStack(spacing: Layout.space16) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .txt1))
                }
                Text(title)
                    .font(.tvBody)  // 34pt
            }
            .foregroundColor(.txt1)
            .frame(minWidth: 400)
            .frame(height: Layout.buttonHeight)  // 72pt
            .padding(.horizontal, Layout.cardPadding)
            .background(
                RoundedRectangle(cornerRadius: Layout.radiusM, style: .continuous)  // 16pt
                    .fill(isFocused ? Color.accOrange.opacity(0.9) : Color.accOrange)
                    .shadow(color: isFocused ? Color.accMint.opacity(0.4) : .clear, radius: 16, x: 0, y: 0)
            )
            .scaleEffect(isFocused ? 1.05 : 1.0)
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.2), value: isFocused)
    }
}

// MARK: – Moving Particles Background ───────────────────────────────────────

/// Animated particles for LaunchView background — adds life and energy to the screen.
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

struct MovingParticlesView: View {
    @State private var isAnimating = false
    let particles: [MovingParticle]

    init() {
        // 25 particles for TV (larger screen than mobile)
        particles = (0..<25).map { i in
            // Use simple LCG for deterministic pseudo-random values
            let seed = i * 48271 % 2147483647
            let colors: [Color] = [.accMint, .accMint, .accMint, .accMint, .accOrange, .accBlue]

            return MovingParticle(
                startX: CGFloat((seed * 17) % 1600 - 800),
                startY: CGFloat((seed * 23) % 1200 - 600),
                size: CGFloat(4 + ((seed * 13) % 5)),  // 4-8pt for TV
                color: colors[(seed * 7) % colors.count],
                moveX: CGFloat(((seed * 29) % 80) - 40),  // -40 to 40
                moveY: CGFloat(((seed * 31) % 80) - 40),  // -40 to 40
                duration: Double(3 + ((seed * 11) % 3)),  // 3-5 seconds
                delay: Double(i) * 0.15
            )
        }
    }

    var body: some View {
        ZStack {
            ForEach(particles) { particle in
                Circle()
                    .fill(particle.color)
                    .frame(width: particle.size, height: particle.size)
                    .blur(radius: 2)
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
        .allowsHitTesting(false)
        .onAppear { isAnimating = true }
    }
}
