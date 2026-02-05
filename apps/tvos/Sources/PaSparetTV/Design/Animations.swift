import SwiftUI

// MARK: – tvOS Animation Durations (0.2-0.3s slower than web for TV processing)

enum AnimationDuration {
    static let clueTextFadeIn: Double = 0.8
    static let clueBackgroundFadeIn: Double = 0.6
    static let levelBadgeFadeIn: Double = 0.8

    static let destinationReveal: Double = 1.0

    static let scoreboardRowSlide: Double = 0.5
    static let pointsUpdate: Double = 1.5

    static let roundIntroPulse: Double = 2.0
    static let brakeBannerSlide: Double = 0.4

    static let resultsOverlayFadeIn: Double = 0.6
    static let questionFadeIn: Double = 0.8
}

// MARK: – Animation Curves

enum AnimationCurve {
    static let entrance = Animation.easeOut
    static let exit = Animation.easeIn
    static let transition = Animation.easeInOut
}

// MARK: – Helper Extensions

extension Animation {
    static func fadeIn(duration: Double = AnimationDuration.clueTextFadeIn) -> Animation {
        .easeOut(duration: duration)
    }

    static func slideIn(duration: Double = AnimationDuration.scoreboardRowSlide) -> Animation {
        .easeInOut(duration: duration)
    }
}
