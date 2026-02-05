import SwiftUI

/// Shown during REVEAL_DESTINATION phase.
/// Displays the correct destination name and country in large, dramatic text.
struct TVRevealView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 0) {
                Spacer()

                revealLabel

                destinationName
                    .padding(.top, 24)

                destinationCountry
                    .padding(.top, 16)

                Spacer()
            }
            .padding(.horizontal, 80)

            if !appState.isConnected { reconnectBanner }
        }
    }

    // MARK: – subviews ──────────────────────────────────────────────────────

    private var revealLabel: some View {
        Text("Destinationen är…")
            .font(.system(size: 40, weight: .light))
            .foregroundColor(.secondary)
    }

    private var destinationName: some View {
        Text(appState.destinationName ?? "…")
            .font(.system(size: 96, weight: .bold))
            .foregroundColor(.white)
            .multilineTextAlignment(.center)
    }

    private var destinationCountry: some View {
        Text(appState.destinationCountry ?? "")
            .font(.system(size: 48, weight: .medium))
            .foregroundColor(.yellow)
    }

    // MARK: – reconnect banner ─────────────────────────────────────────────

    private var reconnectBanner: some View {
        Text("○ Återansluter…")
            .font(.system(size: 22))
            .foregroundColor(.red)
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
            .background(Color.black.opacity(0.6))
            .cornerRadius(8)
            .padding(.top, 16)
    }
}
