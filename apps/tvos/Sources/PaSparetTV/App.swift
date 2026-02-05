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

    private static let lobbyPhases     : Set<String> = ["LOBBY", "PREPARING_ROUND", "ROUND_INTRO"]
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
                .font(.system(size: 48, weight: .semibold))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .shadow(color: .black.opacity(0.6), radius: 4, x: 0, y: 2)
                .padding(.horizontal, 48)
                .padding(.vertical, 24)
                .background(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
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
                .font(.system(size: 96, weight: .bold))

            if busy {
                Text("Starting…")
                    .font(.system(size: 48, weight: .light))
                    .foregroundColor(.secondary)
            }

            if let err = appState.error {
                Text(err)
                    .foregroundColor(.red)
                    .font(.system(size: 36))

                Button("Retry") {
                    Task { await createAndConnect() }
                }
                .font(.system(size: 36))
                .padding(.top, 16)
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
            Text(appState.hasEverConnected ? "Reconnecting…" : "Connecting…")
                .font(.system(size: 64, weight: .light))
                .foregroundColor(.secondary)
            if let err = appState.error {
                Text(err).foregroundColor(.red).font(.title)
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

    var body: some View {
        ZStack(alignment: .top) {
            HStack(spacing: 80) {
                qrColumn
                playerColumn
            }
            .padding(60)

            if !appState.isConnected { reconnectBanner }

            // "Ny spel" button — bottom-right corner, subtle secondary style
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    NewGameButton()
                }
            }
            .padding(40)
        }
    }

    // ── QR + join code ──
    @ViewBuilder
    private var qrColumn: some View {
        VStack(spacing: 20) {
            QRCodeView(url: joinURL)
            if let code = appState.joinCode {
                Text(code.uppercased().map { String($0) }.joined(separator: "  "))
                    .font(.system(size: 48, weight: .bold))
            }
            Text("Scan to join")
                .font(.system(size: 24))
                .foregroundColor(.secondary)
        }
    }

    // ── player list ──
    @ViewBuilder
    private var playerColumn: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Players")
                .font(.system(size: 36, weight: .bold))
            ForEach(appState.players) { player in
                PlayerRow(player: player)
            }
            if appState.players.isEmpty {
                Text("No players yet…")
                    .foregroundColor(.secondary)
                    .font(.system(size: 24))
            }
        }
    }

    private var joinURL: String {
        "\(PUBLIC_BASE_URL)/join/\(appState.joinCode ?? "")"
    }

    private var reconnectBanner: some View {
        Text("○ Reconnecting…")
            .font(.system(size: 22))
            .foregroundColor(.red)
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
            .background(Color.black.opacity(0.6))
            .cornerRadius(8)
            .padding(.top, 16)
    }
}

/// Shared "Ny spel" button — calls resetSession() on AppState.
/// Styled as a small, secondary-weight pill so it never competes with
/// the primary game content.
struct NewGameButton: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Button("Ny spel") {
            appState.resetSession()
        }
        .font(.system(size: 20, weight: .medium))
        .foregroundColor(.secondary)
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.08))
        .cornerRadius(20)
    }
}

struct PlayerRow: View {
    let player: Player

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(player.isConnected ? Color.green : Color.gray)
                .frame(width: 14, height: 14)
            Text(player.name)
                .font(.system(size: 28))
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
            .font(.system(size: 96, weight: .bold))

            statusBadge

            if let clue = appState.clueText {
                Text(clue).font(.largeTitle)
            }
            if let pts = appState.levelPoints {
                Text("\(pts) pts").font(.title).foregroundColor(.yellow)
            }
            if !appState.players.isEmpty {
                Text("Players: \(appState.players.map { $0.name }.joined(separator: ", "))")
                    .font(.title2)
            }
            if let err = appState.error {
                Text(err).foregroundColor(.red).font(.title)
            }
        }
        .padding(60)
    }

    @ViewBuilder
    private var statusBadge: some View {
        Text(appState.isConnected ? "● Connected" : "○ Reconnecting…")
            .foregroundColor(appState.isConnected ? .green : .red)
            .font(.title)
    }
}
