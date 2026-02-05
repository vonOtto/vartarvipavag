import SwiftUI

// MARK: – tvOS Typography (TV-specific scaling: ~36 pt per web rem)

extension Font {
    // MARK: Game Show Fonts (rounded, bold)

    static let gameShowHeading = Font.system(size: 90, weight: .black, design: .rounded)
    static let gameShowSubheading = Font.system(size: 64, weight: .heavy, design: .rounded)
    static let clueText = Font.system(size: 72, weight: .bold, design: .rounded)

    // MARK: Body Text

    static let bodyLarge = Font.system(size: 48, weight: .medium, design: .default)
    static let bodyRegular = Font.system(size: 36, weight: .regular, design: .default)
    static let bodySmall = Font.system(size: 28, weight: .regular, design: .default)
    static let label = Font.system(size: 26, weight: .light, design: .default)

    // MARK: Scoreboard

    static let scoreboardName = Font.system(size: 38, weight: .semibold, design: .default)
    static let scoreboardPoints = Font.system(size: 38, weight: .bold, design: .monospaced)
}
