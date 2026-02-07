import SwiftUI

/// Shown during REVEAL_DESTINATION phase.
/// Displays the correct destination name and country in large, dramatic text.
struct TVRevealView: View {
    @EnvironmentObject var appState: AppState
    @State private var appeared = false

    var body: some View {
        ZStack(alignment: .top) {
            Color.bg0.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                revealLabel

                destinationName
                    .padding(.top, Layout.space24)

                destinationCountry
                    .padding(.top, Layout.space16)

                Spacer()
            }
            .padding(.horizontal, Layout.horizontalPadding)
            .onAppear {
                appeared = true
            }
            .onDisappear {
                appeared = false
            }

            if !appState.isConnected { reconnectBanner }
        }
    }

    // MARK: – subviews ──────────────────────────────────────────────────────

    private var revealLabel: some View {
        Text("Destinationen är…")
            .font(.tvH2)  // 48pt Semibold
            .foregroundColor(.txt2)
            .opacity(appeared ? 1 : 0)
            .animation(.fadeIn(duration: 0.6), value: appeared)
    }

    private var destinationName: some View {
        Text(appState.destinationName ?? "…")
            .font(.tvH1)  // 72pt Semibold
            .foregroundColor(.txt1)
            .multilineTextAlignment(.center)
            .opacity(appeared ? 1 : 0)
            .scaleEffect(appeared ? 1.0 : 0.9)
            .animation(
                .fadeIn(duration: AnimationDuration.destinationReveal).delay(0.3),
                value: appeared
            )
    }

    private var destinationCountry: some View {
        Text(appState.destinationCountry ?? "")
            .font(.tvBody)  // 34pt
            .foregroundColor(.txt2)
            .opacity(appeared ? 1 : 0)
            .animation(.fadeIn(duration: 0.8).delay(0.5), value: appeared)
    }

    // MARK: – reconnect banner ─────────────────────────────────────────────

    private var reconnectBanner: some View {
        Text("○ Återansluter…")
            .font(.tvMeta)  // 28pt
            .foregroundColor(.txt1)
            .padding(.horizontal, Layout.space24)
            .padding(.vertical, Layout.space16)
            .background(Color.statusBad.opacity(0.9))
            .cornerRadius(Layout.radiusS)
            .padding(.top, Layout.space16)
    }
}
