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

    var body: some View {
        if appState.sessionId == nil {
            JoinView()
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

    var body: some View {
        VStack(spacing: 48) {
            Text("På Spåret")
                .font(.system(size: 96, weight: .bold))

            TextField("Join code", text: $code)
                .font(.system(size: 72))
                .frame(width: 500)
                .textFieldStyle(.roundedBorder)

            Button("Join as TV") {
                Task { await joinGame() }
            }
            .font(.largeTitle)
            .disabled(busy || code.trimmingCharacters(in: .whitespaces).isEmpty)

            if let err = appState.error {
                Text(err).foregroundColor(.red).font(.title)
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

// MARK: – live game screen (placeholder — views expanded in TASK 502–504) ────

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
