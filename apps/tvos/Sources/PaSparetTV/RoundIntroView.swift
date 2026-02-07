import SwiftUI

/// Shown during the ROUND_INTRO phase — the brief beat between LOBBY / PREPARING_ROUND
/// and the first CLUE_LEVEL.  Displays a single, large headline with a slow breathing
/// (scale pulse) animation.  Audio (TTS intro voice) is handled by AudioManager via the
/// AUDIO_PLAY event; this view is purely visual.
struct RoundIntroView: View {
    /// Controls the breathing animation.  Toggled every half-period so that
    /// SwiftUI's animation interpolates between the two scale values.
    @State private var expanded = false

    var body: some View {
        ZStack {
            Color.bg0.ignoresSafeArea()

            Text("Vart är vi på väg?")
                .font(.tvH1)  // 72pt Semibold
                .foregroundColor(.txt1)
                .multilineTextAlignment(.center)
                .scaleEffect(expanded ? 1.05 : 1.0)
                .opacity(expanded ? 1.0 : 0.95)
                .animation(
                    .easeInOut(duration: AnimationDuration.roundIntroPulse / 2),
                    value: expanded
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onAppear { expanded = true }
                .onChange(of: expanded) { _ in
                    DispatchQueue.main.asyncAfter(deadline: .now() + AnimationDuration.roundIntroPulse / 2) {
                        expanded.toggle()
                    }
                }
        }
    }
}
