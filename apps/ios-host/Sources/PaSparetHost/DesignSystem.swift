import SwiftUI

// MARK: – iOS Host Color Palette (synced with tvOS)

extension Color {
    // MARK: Backgrounds

    static let bgBase = Color(red: 10/255, green: 10/255, blue: 20/255)
    static let bgCard = Color(red: 30/255, green: 30/255, blue: 46/255).opacity(0.9)

    // MARK: Accents

    static let accentBlue = Color(red: 100/255, green: 108/255, blue: 255/255)
    static let accentBlueBright = Color(red: 120/255, green: 128/255, blue: 255/255)

    // MARK: Success / Error

    static let successGreen = Color(red: 74/255, green: 222/255, blue: 128/255)
    static let successGreenBright = Color(red: 94/255, green: 242/255, blue: 148/255)

    static let errorRed = Color(red: 248/255, green: 113/255, blue: 113/255)
    static let errorRedBright = Color(red: 255/255, green: 133/255, blue: 133/255)

    // MARK: Ranking Colors

    static let goldYellow = Color(red: 1.0, green: 0.84, blue: 0.0)
    static let silverGray = Color(red: 0.7, green: 0.75, blue: 0.8)
    static let bronzeOrange = Color(red: 0.8, green: 0.5, blue: 0.2)
}

// MARK: – iOS Host Typography (scaled for mobile/tablet)

extension Font {
    // MARK: Game Show Fonts (rounded, bold)

    static let gameShowHeading = Font.system(size: 48, weight: .black, design: .rounded)
    static let gameShowSubheading = Font.system(size: 32, weight: .heavy, design: .rounded)
    static let clueText = Font.system(size: 36, weight: .bold, design: .rounded)

    // MARK: Body Text

    static let bodyLarge = Font.system(size: 22, weight: .medium, design: .default)
    static let bodyRegular = Font.system(size: 17, weight: .regular, design: .default)
    static let bodySmall = Font.system(size: 15, weight: .regular, design: .default)
    static let caption = Font.system(size: 13, weight: .light, design: .default)

    // MARK: Buttons

    static let buttonPrimary = Font.system(size: 20, weight: .semibold, design: .rounded)
    static let buttonSecondary = Font.system(size: 18, weight: .medium, design: .rounded)
}

// MARK: – iOS Host Layout Constants

enum Layout {
    // MARK: Padding

    static let horizontalPadding: CGFloat = 24
    static let verticalPadding: CGFloat = 20
    static let cardPadding: CGFloat = 16

    // MARK: Spacing

    static let largeSpacing: CGFloat = 32
    static let mediumSpacing: CGFloat = 20
    static let smallSpacing: CGFloat = 12
    static let tinySpacing: CGFloat = 8

    // MARK: Corners

    static let cornerRadiusSmall: CGFloat = 8
    static let cornerRadiusMedium: CGFloat = 12
    static let cornerRadiusLarge: CGFloat = 16

    // MARK: Shadows

    static let shadowRadius: CGFloat = 20
    static let shadowOpacity: Double = 0.3
}
