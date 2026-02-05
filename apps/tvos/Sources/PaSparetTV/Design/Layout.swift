import SwiftUI

// MARK: – tvOS Layout Constants (larger spacing for TV viewing distance)

enum Layout {
    // MARK: Padding

    static let horizontalPadding: CGFloat = 80
    static let verticalPadding: CGFloat = 60
    static let cardPadding: CGFloat = 40

    // MARK: Spacing

    static let interElementSpacing: CGFloat = 48
    static let stackSpacing: CGFloat = 24
    static let tightSpacing: CGFloat = 16

    // MARK: Touch Targets (Siri Remote)

    static let minimumTouchTarget: CGFloat = 80
    static let touchTargetSpacing: CGFloat = 20

    // MARK: Corners

    static let cornerRadiusSmall: CGFloat = 8
    static let cornerRadiusMedium: CGFloat = 12
    static let cornerRadiusLarge: CGFloat = 20

    // MARK: Shadows

    static let shadowRadius: CGFloat = 40  // 2x web size (20px) for TV visibility
    static let shadowOpacity: Double = 0.5
    static let textShadowRadius: CGFloat = 4
    static let textShadowOpacity: Double = 0.6
}
