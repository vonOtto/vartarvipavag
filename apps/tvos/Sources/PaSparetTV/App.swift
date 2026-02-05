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
    @State private var titleScale: CGFloat = 1.0
    @State private var titleOpacity: Double = 1.0
    @State private var lastPlayerCount = 0
    @State private var showJoinSparkles = false

    var body: some View {
        ZStack {
            // Background gradient for depth
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.bgPrimary,
                    Color(red: 18/255, green: 18/255, blue: 32/255)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                // Game show title with breathing animation
                gameShowTitle
                    .padding(.top, 60)
                    .padding(.bottom, 48)

                // Main content: QR + players
                HStack(alignment: .top, spacing: 80) {
                    qrColumn
                    playerColumn
                }
                .padding(.horizontal, 80)

                Spacer()

                // Status indicator
                if appState.players.isEmpty {
                    waitingForPlayersIndicator
                        .padding(.bottom, 60)
                } else {
                    readyToStartIndicator
                        .padding(.bottom, 60)
                }
            }

            // Reconnect banner overlay
            if !appState.isConnected {
                VStack {
                    reconnectBanner
                        .padding(.top, Layout.tightSpacing)
                    Spacer()
                }
            }

            // "Nytt spel" button — bottom-right corner
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    NewGameButton()
                }
            }
            .padding(40)

            // Join sparkles effect
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
                // New player joined - trigger sparkles
                showJoinSparkles = true
            }
            lastPlayerCount = newCount
        }
    }

    // ── Game Show Title ──
    @ViewBuilder
    private var gameShowTitle: some View {
        VStack(spacing: 12) {
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
                .font(.system(size: 28, weight: .medium, design: .default))
                .tracking(8)
                .foregroundColor(.white.opacity(0.7))
        }
    }

    // ── QR Code Section ──
    @ViewBuilder
    private var qrColumn: some View {
        VStack(spacing: 24) {
            // QR card with glow
            VStack(spacing: 20) {
                QRCodeView(url: joinURL)
                    .padding(24)
                    .background(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .fill(Color.white)
                    )
                    .shadow(color: .accentBlue.opacity(0.4), radius: 30)
                    .shadow(color: .accentBlue.opacity(0.2), radius: 60)

                if let code = appState.joinCode {
                    Text(code.uppercased().map { String($0) }.joined(separator: "  "))
                        .font(.system(size: 52, weight: .bold, design: .monospaced))
                        .foregroundColor(.accentBlueBright)
                        .tracking(6)
                }
            }
            .padding(32)
            .background(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(Color.bgCard)
                    .shadow(color: .black.opacity(0.3), radius: 20)
            )

            // Join instructions
            VStack(spacing: 8) {
                Text("Skanna QR-koden")
                    .font(.system(size: 32, weight: .semibold, design: .rounded))
                    .foregroundColor(.white.opacity(0.9))
                Text("eller gå till spelet och ange koden")
                    .font(.system(size: 24, weight: .regular, design: .default))
                    .foregroundColor(.white.opacity(0.6))
            }
            .multilineTextAlignment(.center)
        }
    }

    // ── Player List Section ──
    @ViewBuilder
    private var playerColumn: some View {
        VStack(alignment: .leading, spacing: 24) {
            // Section header
            HStack(spacing: 12) {
                Circle()
                    .fill(Color.successGreenBright)
                    .frame(width: 12, height: 12)
                    .opacity(appState.players.isEmpty ? 0.3 : 1.0)

                Text("SPELARE")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .tracking(2)
                    .foregroundColor(.accentBlueBright)

                if !appState.players.isEmpty {
                    Text("(\(appState.players.count))")
                        .font(.system(size: 28, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.5))
                }
            }

            Divider()
                .background(Color.white.opacity(0.15))
                .padding(.bottom, 8)

            // Host row
            if let host = appState.hostName {
                HStack(spacing: 16) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 22))
                        .foregroundColor(.goldYellow)

                    Text(host)
                        .font(.system(size: 34, weight: .semibold, design: .default))
                        .foregroundColor(.goldYellow)

                    Text("VÄRD")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundColor(.goldYellow.opacity(0.6))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(
                            Capsule()
                                .fill(Color.goldYellow.opacity(0.15))
                        )
                }
                .padding(.vertical, 8)
                .padding(.bottom, 8)
            }

            // Player rows with animated entrance
            ForEach(Array(appState.players.enumerated()), id: \.element.id) { index, player in
                EnhancedPlayerRow(player: player, index: index)
                    .transition(
                        .asymmetric(
                            insertion: .scale(scale: 0.8).combined(with: .opacity),
                            removal: .opacity
                        )
                    )
            }

            if appState.players.isEmpty {
                emptyPlayerState
            }

            Spacer()
        }
        .frame(maxWidth: 600, alignment: .leading)
        .animation(.spring(response: 0.5, dampingFraction: 0.7), value: appState.players.count)
    }

    @ViewBuilder
    private var emptyPlayerState: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.2.badge.gearshape")
                .font(.system(size: 64))
                .foregroundColor(.white.opacity(0.2))
                .padding(.top, 40)

            Text("Väntar på spelare...")
                .font(.system(size: 28, weight: .medium, design: .default))
                .foregroundColor(.white.opacity(0.4))
                .italic()
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    // ── Status Indicators ──
    @ViewBuilder
    private var waitingForPlayersIndicator: some View {
        HStack(spacing: 16) {
            ProgressView()
                .progressViewStyle(.circular)
                .tint(.accentBlueBright)
                .scaleEffect(0.8)

            Text("Väntar på spelare att ansluta...")
                .font(.system(size: 30, weight: .medium, design: .default))
                .foregroundColor(.white.opacity(0.6))
        }
        .padding(.horizontal, 32)
        .padding(.vertical, 20)
        .background(
            Capsule()
                .fill(Color.bgCard)
                .shadow(color: .black.opacity(0.2), radius: 10)
        )
    }

    @ViewBuilder
    private var readyToStartIndicator: some View {
        HStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 32))
                .foregroundColor(.successGreenBright)

            Text("Redo att starta! Värden startar spelet.")
                .font(.system(size: 30, weight: .semibold, design: .default))
                .foregroundColor(.white.opacity(0.9))
        }
        .padding(.horizontal, 40)
        .padding(.vertical, 24)
        .background(
            Capsule()
                .fill(Color.successGreen.opacity(0.15))
                .overlay(
                    Capsule()
                        .stroke(Color.successGreenBright.opacity(0.3), lineWidth: 2)
                )
                .shadow(color: .successGreen.opacity(0.3), radius: 20)
        )
    }

    // ── Utilities ──
    private var joinURL: String {
        "\(PUBLIC_BASE_URL)/join/\(appState.joinCode ?? "")"
    }

    private var reconnectBanner: some View {
        HStack(spacing: 12) {
            ProgressView()
                .progressViewStyle(.circular)
                .tint(.errorRedBright)
                .scaleEffect(0.6)

            Text("Återansluter...")
                .font(.system(size: 24, weight: .semibold, design: .default))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 28)
        .padding(.vertical, 16)
        .background(
            Capsule()
                .fill(Color.errorRed.opacity(0.9))
                .shadow(color: .errorRed.opacity(0.6), radius: 20)
        )
    }

    private func startTitleAnimation() {
        withAnimation(Animation.easeInOut(duration: 2.0).repeatForever(autoreverses: true)) {
            titleScale = 1.05
            titleOpacity = 0.85
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

struct PlayerRow: View {
    let player: Player

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(player.isConnected ? Color.successGreenBright : Color.gray)
                .frame(width: 14, height: 14)
            Text(player.name)
                .font(.bodySmall)
                .foregroundColor(.white)
        }
    }
}

/// Enhanced player row with game-show styling and animations
struct EnhancedPlayerRow: View {
    let player: Player
    let index: Int

    @State private var hasAppeared = false

    var body: some View {
        HStack(spacing: 16) {
            // Connection status with pulse
            ZStack {
                if player.isConnected {
                    Circle()
                        .fill(Color.successGreenBright.opacity(0.3))
                        .frame(width: 24, height: 24)
                        .scaleEffect(hasAppeared ? 1.4 : 1.0)
                        .opacity(hasAppeared ? 0 : 0.6)
                        .animation(
                            Animation.easeOut(duration: 1.2).repeatForever(autoreverses: false),
                            value: hasAppeared
                        )
                }

                Circle()
                    .fill(player.isConnected ? Color.successGreenBright : Color.gray.opacity(0.5))
                    .frame(width: 16, height: 16)
            }

            // Player name
            Text(player.name)
                .font(.system(size: 32, weight: .medium, design: .default))
                .foregroundColor(.white.opacity(0.95))

            Spacer()

            // Player number badge
            Text("#\(index + 1)")
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundColor(.accentBlue)
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(Color.accentBlue.opacity(0.15))
                        .overlay(
                            Capsule()
                                .stroke(Color.accentBlue.opacity(0.3), lineWidth: 1)
                        )
                )
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.white.opacity(player.isConnected ? 0.06 : 0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(
                            player.isConnected
                                ? Color.successGreenBright.opacity(0.2)
                                : Color.white.opacity(0.05),
                            lineWidth: 1
                        )
                )
        )
        .onAppear {
            // Trigger pulse animation
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                hasAppeared = true
            }
        }
    }
}

// MARK: – join sparkles effect ──────────────────────────────────────────────

/// Light sparkle effect when a new player joins the lobby.
/// Shows 15 small sparkles with a quick burst animation.
struct JoinSparklesView: View {
    let onDismiss: () -> Void

    var body: some View {
        GeometryReader { geo in
            ForEach(0..<15, id: \.self) { i in
                SparklePiece(index: i, width: geo.size.width, height: geo.size.height)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { onDismiss() }
        }
    }
}

private struct SparklePiece: View {
    @State private var burst = false

    private let x: CGFloat
    private let y: CGFloat
    private let targetX: CGFloat
    private let targetY: CGFloat
    private let size: CGFloat
    private let color: Color
    private let duration: Double

    private static let palette: [Color] = [
        .accentBlueBright, .successGreenBright, .goldYellow, .white
    ]

    init(index: Int, width: CGFloat, height: CGFloat) {
        var s = UInt64(truncatingIfNeeded: index &+ 1) &* 6364136223846793005 &+ 1442695040888963407
        func next() -> UInt64 {
            s = s &* 6364136223846793005 &+ 1442695040888963407
            return s >> 33
        }
        func pick(_ n: Int) -> Int { Int(next() % UInt64(max(1, n))) }

        // Start from right side (player list area)
        self.x = width * 0.7 + CGFloat(pick(Int(width * 0.2)))
        self.y = height * 0.4 + CGFloat(pick(Int(height * 0.3)))

        // Burst outward
        let angle = Double(pick(360)) * .pi / 180.0
        let distance = CGFloat(80 + pick(120))
        self.targetX = x + cos(angle) * distance
        self.targetY = y + sin(angle) * distance

        self.size = CGFloat(8 + pick(8))
        self.color = Self.palette[pick(Self.palette.count)]
        self.duration = 0.6 + Double(pick(6)) / 10.0
    }

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: size, height: size)
            .opacity(burst ? 0.0 : 1.0)
            .scaleEffect(burst ? 1.5 : 0.3)
            .position(x: burst ? targetX : x, y: burst ? targetY : y)
            .onAppear {
                withAnimation(.easeOut(duration: duration)) {
                    burst = true
                }
            }
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
