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
                .font(.bodyLarge)
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .shadow(color: .black.opacity(Layout.textShadowOpacity), radius: Layout.textShadowRadius)
                .padding(.horizontal, 48)
                .padding(.vertical, 24)
                .background(
                    RoundedRectangle(cornerRadius: Layout.cornerRadiusLarge, style: .continuous)
                        .fill(Color.black.opacity(0.55))
                )
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .allowsHitTesting(false)
    }
}

// MARK: – launch screen ──────────────────────────────────────────────────────

/// First screen after app launch.  Creates a session automatically via REST
/// and connects as TV — no keyboard input required on the Apple TV.
struct LaunchView: View {
    @EnvironmentObject var appState: AppState
    @State private var busy = true

    var body: some View {
        VStack(spacing: 32) {
            Text("På Spåret")
                .font(.gameShowHeading)
                .foregroundColor(.accentBlueBright)
                .shadow(color: .accentBlue.opacity(0.4), radius: Layout.shadowRadius / 2)

            if busy {
                Text("Startar…")
                    .font(.bodyLarge)
                    .foregroundColor(.white.opacity(0.7))
            }

            if let err = appState.error {
                Text(err)
                    .foregroundColor(.errorRedBright)
                    .font(.bodyRegular)

                Button("Försök igen") {
                    Task { await createAndConnect() }
                }
                .font(.bodyRegular)
                .padding(.top, Layout.tightSpacing)
            }
        }
        .onAppear {
            Task { await createAndConnect() }
        }
    }

    private func createAndConnect() async {
        busy = true
        appState.error = nil
        do {
            let session = try await SessionAPI.createSession()
            appState.sessionId = session.sessionId
            appState.joinCode  = session.joinCode
            appState.token     = session.tvJoinToken
            appState.wsUrl     = session.wsUrl
            appState.connect()
        } catch {
            appState.error = error.localizedDescription
            busy = false
        }
    }
}

// MARK: – connecting screen ─────────────────────────────────────────────────

struct ConnectingView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(spacing: 32) {
            Text(appState.hasEverConnected ? "Återansluter…" : "Ansluter…")
                .font(.gameShowSubheading)
                .foregroundColor(.white.opacity(0.7))
            if let err = appState.error {
                Text(err)
                    .foregroundColor(.errorRedBright)
                    .font(.bodyRegular)
            }
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
            // Content
            VStack(spacing: 48) {
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
        VStack(spacing: 8) {
            Text("PÅ SPÅRET")
                .font(.system(size: 96, weight: .black, design: .rounded))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.accentBlueBright, .accentBlue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .shadow(color: .accentBlue.opacity(0.6), radius: 40)
                .shadow(color: .accentBlue.opacity(0.4), radius: 20)
                .scaleEffect(titleScale)
                .opacity(titleOpacity)

            Text("PARTY EDITION")
                .font(.system(size: 28, weight: .semibold, design: .rounded))
                .tracking(4)
                .foregroundColor(.white.opacity(0.7))
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
        VStack(spacing: 24) {
            // Enhanced card with glow
            VStack(spacing: 20) {
                QRCodeView(url: joinURL)
                    .padding(24)
                    .background(Color.white)
                    .cornerRadius(16)

                Text("Skanna för att ansluta")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundColor(.white.opacity(0.8))
            }
            .padding(32)
            .background(Color.bgCard)
            .cornerRadius(20)
            .shadow(color: .accentBlue.opacity(0.4), radius: 30)
            .shadow(color: .accentBlue.opacity(0.2), radius: 60)

            // Join code
            if let code = appState.joinCode {
                Text(code.uppercased().map { String($0) }.joined(separator: "  "))
                    .font(.system(size: 52, weight: .bold, design: .monospaced))
                    .tracking(8)
                    .foregroundColor(.accentBlueBright)
            }
        }
    }

    // ── player list (enhanced) ──
    @ViewBuilder
    private var playerColumn: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Section header with pulse
            HStack(spacing: 12) {
                if !appState.players.isEmpty {
                    Circle()
                        .fill(Color.successGreen)
                        .frame(width: 12, height: 12)
                        .overlay(
                            Circle()
                                .stroke(Color.successGreen, lineWidth: 2)
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
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .tracking(2)
                    .foregroundColor(.white.opacity(0.6))

                Text("(\(appState.players.count))")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(.accentBlueBright)
            }

            // Host row (enhanced)
            if let host = appState.hostName {
                HStack(spacing: 12) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.goldYellow)

                    Text(host)
                        .font(.system(size: 34, weight: .semibold))
                        .foregroundColor(.goldYellow)

                    Text("VÄRD")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .tracking(1)
                        .foregroundColor(.goldYellow.opacity(0.8))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(
                            Capsule()
                                .fill(Color.goldYellow.opacity(0.15))
                        )
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(Color.goldYellow.opacity(0.08))
                .cornerRadius(12)
                .padding(.bottom, 8)
            }

            // Player cards
            ForEach(Array(appState.players.enumerated()), id: \.element.id) { index, player in
                EnhancedPlayerRow(player: player, number: index + 1)
                    .transition(.scale.combined(with: .opacity))
            }

            // Empty state
            if appState.players.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "person.2.badge.gearshape")
                        .font(.system(size: 64, weight: .light))
                        .foregroundColor(.white.opacity(0.2))

                    Text("Väntar på spelare...")
                        .font(.system(size: 28, weight: .medium))
                        .italic()
                        .foregroundColor(.white.opacity(0.4))
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

        HStack(spacing: 16) {
            if hasPlayers {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.successGreen)
            } else {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white.opacity(0.5)))
                    .scaleEffect(1.2)
            }

            Text(hasPlayers ? "Redo att starta! Värden startar spelet." : "Väntar på spelare att ansluta...")
                .font(.system(size: 30, weight: hasPlayers ? .semibold : .medium))
                .foregroundColor(.white.opacity(hasPlayers ? 0.9 : 0.7))
        }
        .padding(.horizontal, 40)
        .padding(.vertical, 20)
        .background(
            Capsule()
                .fill(hasPlayers ? Color.successGreen.opacity(0.15) : Color.white.opacity(0.05))
                .overlay(
                    Capsule()
                        .stroke(hasPlayers ? Color.successGreen.opacity(0.3) : Color.clear, lineWidth: 2)
                )
        )
        .shadow(color: hasPlayers ? Color.successGreen.opacity(0.3) : Color.clear, radius: 20)
    }

    private var joinURL: String {
        "\(PUBLIC_BASE_URL)/join/\(appState.joinCode ?? "")"
    }

    private var reconnectBanner: some View {
        HStack(spacing: 12) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .errorRed))
                .scaleEffect(0.6)

            Text("Återansluter...")
                .font(.system(size: 24, weight: .semibold))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 28)
        .padding(.vertical, 16)
        .background(
            Capsule()
                .fill(Color.errorRed.opacity(0.9))
        )
        .shadow(color: .errorRed.opacity(0.5), radius: 20)
        .padding(.top, 24)
    }
}

// MARK: – Enhanced Player Row ────────────────────────────────────────────────

struct EnhancedPlayerRow: View {
    let player: Player
    let number: Int

    @State private var pulseScale: CGFloat = 1.0

    var body: some View {
        HStack(spacing: 16) {
            // Player number badge
            Text("#\(number)")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundColor(.accentBlue.opacity(0.8))
                .frame(minWidth: 48)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(Color.accentBlue.opacity(0.15))
                )

            // Connection indicator with pulse
            ZStack {
                // Pulse ring
                if player.isConnected {
                    Circle()
                        .stroke(Color.successGreenBright.opacity(0.6), lineWidth: 2)
                        .frame(width: 24, height: 24)
                        .scaleEffect(pulseScale)
                        .opacity(2 - pulseScale)
                }

                // Connection dot
                Circle()
                    .fill(player.isConnected ? Color.successGreenBright : Color.gray)
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
                .font(.system(size: 32, weight: .medium))
                .foregroundColor(.white)

            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.bgCard.opacity(0.6))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(
                            player.isConnected ? Color.successGreen.opacity(0.3) : Color.clear,
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

/// Shared "Nytt spel" button — calls resetSession() on AppState.
/// Styled as a small, secondary-weight pill so it never competes with
/// the primary game content.
struct NewGameButton: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Button("Nytt spel") {
            appState.resetSession()
        }
        .font(.label)
        .foregroundColor(.white.opacity(0.7))
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.08))
        .cornerRadius(Layout.cornerRadiusLarge)
    }
}


// MARK: – live game screen (placeholder — expanded in TASK 503–504) ──────────

struct LiveView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(spacing: 24) {
            HStack {
                Text("Phase:")
                Text(appState.phase).fontWeight(.bold)
            }
            .font(.gameShowHeading)
            .foregroundColor(.accentBlueBright)

            statusBadge

            if let clue = appState.clueText {
                Text(clue)
                    .font(.clueText)
                    .foregroundColor(.white)
            }
            if let pts = appState.levelPoints {
                Text("\(pts) pts")
                    .font(.bodyLarge)
                    .foregroundColor(.goldYellow)
            }
            if !appState.players.isEmpty {
                Text("Players: \(appState.players.map { $0.name }.joined(separator: ", "))")
                    .font(.bodyRegular)
                    .foregroundColor(.white)
            }
            if let err = appState.error {
                Text(err)
                    .foregroundColor(.errorRedBright)
                    .font(.bodyRegular)
            }
        }
        .padding(Layout.verticalPadding)
    }

    @ViewBuilder
    private var statusBadge: some View {
        Text(appState.isConnected ? "● Connected" : "○ Reconnecting…")
            .foregroundColor(appState.isConnected ? .successGreenBright : .errorRed)
            .font(.bodyRegular)
    }
}
