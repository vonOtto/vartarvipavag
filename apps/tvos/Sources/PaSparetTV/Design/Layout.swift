import SwiftUI

// MARK: – tvOS Layout Constants (Tripto Design System - TV Optimized)

enum Layout {
    // MARK: Spacing (Design System: 8, 16, 24, 32, 48)

    static let space8: CGFloat = 8
    static let space16: CGFloat = 16
    static let space24: CGFloat = 24
    static let space32: CGFloat = 32
    static let space48: CGFloat = 48

    // MARK: Padding

    static let horizontalPadding: CGFloat = 80
    static let verticalPadding: CGFloat = 60
    static let cardPadding: CGFloat = 32  // Larger for TV cards

    // MARK: Spacing (Semantic Names)

    static let interElementSpacing: CGFloat = space48
    static let stackSpacing: CGFloat = space24
    static let tightSpacing: CGFloat = space16

    // MARK: Touch Targets (Siri Remote)

    static let minimumTouchTarget: CGFloat = 80
    static let touchTargetSpacing: CGFloat = 20

    // MARK: Corner Radii (Design System: S=12, M=16, L=24)

    static let radiusS: CGFloat = 12
    static let radiusM: CGFloat = 16
    static let radiusL: CGFloat = 24

    // Backwards compatibility
    static let cornerRadiusSmall: CGFloat = radiusS
    static let cornerRadiusMedium: CGFloat = radiusM
    static let cornerRadiusLarge: CGFloat = radiusL

    // MARK: Shadows

    static let shadowRadius: CGFloat = 40
    static let shadowOpacity: Double = 0.5
    static let textShadowRadius: CGFloat = 4
    static let textShadowOpacity: Double = 0.6

    // MARK: Button Specs (tvOS)

    static let buttonHeight: CGFloat = 72  // Primary button height
    static let buttonRadius: CGFloat = radiusM  // 16pt
}

// MARK: – Layout Guidelines for tvOS

/*
 Important tvOS Layout Rules:

 - Use spacing tokens: 8, 16, 24, 32, 48
 - Card padding: 32pt (larger than mobile)
 - Corner radii: S=12, M=16, L=24
 - Primary buttons: height 72pt, radius 16pt
 - Keep text centered for optimal TV viewing
 - Ensure touch targets are minimum 80pt for Siri Remote
 - Focus states are critical: use lighter colors, borders, shadows
 */
