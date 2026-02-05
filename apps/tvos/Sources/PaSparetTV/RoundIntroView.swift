import SwiftUI

/// Shown during the ROUND_INTRO phase — the brief beat between LOBBY / PREPARING_ROUND
/// and the first CLUE_LEVEL.  Displays a single, large headline with a slow breathing
/// (scale pulse) animation.  Audio (TTS intro voice) is handled by AudioManager via the
/// AUDIO_PLAY event; this view is purely visual.
struct RoundIntroView: View {
    /// Controls the breathing animation.  Toggled every half-period so that
    /// SwiftUI's animation interpolates between the two scale values.
    @State private var expanded = false

    /// Duration of one full pulse cycle (scale up + scale down).
    private static let pulsePeriod: Double = 2.0

    var body: some View {
        Text("Vart är vi på väg?")
            .font(.system(size: 96, weight: .bold))
            .foregroundColor(.white)
            .multilineTextAlignment(.center)
            .scaleEffect(expanded ? 1.05 : 1.0)
            .animation(
                .easeInOut(duration: Self.pulsePeriod / 2),
                value: expanded
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .onAppear { expanded = true }
            .onChange(of: expanded) { _ in
                // Re-schedule the toggle after each half-period so the pulse loops.
                DispatchQueue.main.asyncAfter(deadline: .now() + Self.pulsePeriod / 2) {
                    expanded.toggle()
                }
            }
    }
}
