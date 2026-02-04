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
        if appState.sessionId == nil {
            JoinView()
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
    }
}

// MARK: – join screen ────────────────────────────────────────────────────────

struct JoinView: View {
    @EnvironmentObject var appState: AppState
    @State private var code = ""
    @State private var busy = false
    @FocusState private var codeFocused: Bool

    var body: some View {
        VStack(spacing: 48) {
            Text("På Spåret")
                .font(.system(size: 96, weight: .bold))

            TextField("Join code", text: $code)
                .focused($codeFocused)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .font(.system(size: 72))
                .frame(width: 500)
                .textFieldStyle(.plain) // ✅ tvOS-safe
                .padding(.vertical, 18)
                .padding(.horizontal, 24)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(.thinMaterial)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(codeFocused ? .white : .white.opacity(0.25),
                                lineWidth: codeFocused ? 4 : 2)
                )
                .scaleEffect(codeFocused ? 1.06 : 1.0)
                .shadow(color: .black.opacity(codeFocused ? 0.35 : 0.15),
                        radius: codeFocused ? 18 : 10,
                        x: 0, y: codeFocused ? 12 : 6)
                .animation(.snappy(duration: 0.18), value: codeFocused)
                .onAppear { codeFocused = true }

            Button("Join as TV") {
                Task { await joinGame() }
            }
            .font(.largeTitle)
            .disabled(busy || code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

            if let err = appState.error {
                Text(err)
                    .foregroundColor(.red)
                    .font(.title)
            }
        }
    }

    private func joinGame() async {
        busy = true
        defer { busy = false }
        appState.error = nil

        let trimmed = code.trimmingCharacters(in: .whitespaces).lowercased()
        do {
            let lookup = try await SessionAPI.lookupByCode(trimmed)
            let tv     = try await SessionAPI.joinAsTV(sessionId: lookup.sessionId)

            appState.sessionId = lookup.sessionId
            appState.joinCode  = trimmed
            appState.token     = tv.tvAuthToken
            appState.wsUrl     = tv.wsUrl
            appState.connect()
        } catch {
            appState.error = error.localizedDescription
        }
    }
}

// MARK: – connecting screen ─────────────────────────────────────────────────

struct ConnectingView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(spacing: 32) {
            Text(appState.isConnected ? "Connecting…" : "Reconnecting…")
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
