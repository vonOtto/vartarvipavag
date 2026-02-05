import SwiftUI

/// Shown during REVEAL_DESTINATION phase.
/// Displays the correct destination name and country in large, dramatic text.
struct TVRevealView: View {
    @EnvironmentObject var appState: AppState
    @State private var appeared = false

    var body: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 0) {
                Spacer()

                revealLabel

                destinationName
                    .padding(.top, Layout.stackSpacing)

                destinationCountry
                    .padding(.top, Layout.tightSpacing)

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
            .font(.bodyLarge)
            .foregroundColor(.white.opacity(0.7))
            .opacity(appeared ? 1 : 0)
            .animation(.fadeIn(duration: 0.6), value: appeared)
    }

    private var destinationName: some View {
        Text(appState.destinationName ?? "…")
            .font(.gameShowHeading)
            .foregroundColor(.white)
            .multilineTextAlignment(.center)
            .shadow(color: .black.opacity(Layout.textShadowOpacity), radius: Layout.textShadowRadius)
            .opacity(appeared ? 1 : 0)
            .scaleEffect(appeared ? 1.0 : 0.9)
            .animation(
                .fadeIn(duration: AnimationDuration.destinationReveal).delay(0.3),
                value: appeared
            )
    }

    private var destinationCountry: some View {
        Text(appState.destinationCountry ?? "")
            .font(.bodyLarge)
            .foregroundColor(.goldYellow)
            .shadow(color: .goldYellow.opacity(0.3), radius: Layout.shadowRadius / 4)
            .opacity(appeared ? 1 : 0)
            .animation(.fadeIn(duration: 0.8).delay(0.5), value: appeared)
    }

    // MARK: – reconnect banner ─────────────────────────────────────────────

    private var reconnectBanner: some View {
        Text("○ Återansluter…")
            .font(.label)
            .foregroundColor(.errorRed)
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
            .background(Color.black.opacity(0.6))
            .cornerRadius(Layout.cornerRadiusSmall)
            .padding(.top, Layout.tightSpacing)
    }
}
