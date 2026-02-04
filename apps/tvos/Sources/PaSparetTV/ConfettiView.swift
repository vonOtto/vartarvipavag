import SwiftUI

/// Confetti particle overlay shown on FINAL_RESULTS.
/// 70 pieces fall deterministically (seeded per index) and the view
/// auto-dismisses after ~5.5 s via the `onDismiss` callback.
struct ConfettiView: View {
    let onDismiss: () -> Void

    private static let count    = 70
    private static let lifetime = 5.5   // seconds before auto-dismiss

    var body: some View {
        GeometryReader { geo in
            ForEach(0..<Self.count) { i in
                ConfettiPiece(index: i, width: geo.size.width, height: geo.size.height)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + Self.lifetime) { onDismiss() }
        }
    }
}

// MARK: – single falling piece

private struct ConfettiPiece: View {
    @State private var fallen = false

    private let x       : CGFloat
    private let size    : CGFloat
    private let color   : Color
    private let duration: Double   // fall time
    private let delay   : Double   // stagger delay
    private let endY    : CGFloat
    private let angle   : Double   // cumulative rotation

    private static let palette: [Color] =
        [.red, .blue, .green, .yellow, .orange, .pink, .purple, .cyan, .white]

    init(index: Int, width: CGFloat, height: CGFloat) {
        // Deterministic LCG seeded from index — no external PRNG needed.
        var s = UInt64(truncatingIfNeeded: index &+ 1)
                &* 6364136223846793005 &+ 1442695040888963407
        func next() -> UInt64 {
            s = s &* 6364136223846793005 &+ 1442695040888963407
            return s >> 33
        }
        func pick(_ n: Int) -> Int { Int(next() % UInt64(max(1, n))) }

        self.x        = CGFloat(pick(max(1, Int(width))))
        self.size     = CGFloat(10 + pick(14))            // 10–23 pt
        self.color    = Self.palette[pick(Self.palette.count)]
        self.duration = 2.8 + Double(pick(20)) / 10.0    // 2.8–4.8 s
        self.delay    = Double(pick(18)) / 10.0           // 0.0–1.7 s
        self.endY     = height + 40
        self.angle    = Double(pick(2) == 0 ? 1 : -1) * Double(360 + pick(360))
    }

    var body: some View {
        RoundedRectangle(cornerRadius: size * 0.25)
            .fill(color)
            .frame(width: size, height: size * 0.55)
            .rotationEffect(.degrees(fallen ? angle : 0))
            .position(x: x, y: fallen ? endY : -20)
            .onAppear {
                withAnimation(.easeIn(duration: duration).delay(delay)) {
                    fallen = true
                }
            }
    }
}
