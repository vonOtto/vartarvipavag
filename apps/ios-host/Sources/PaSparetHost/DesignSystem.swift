import SwiftUI

// MARK: – iOS Host Design System (Tripto Design Guide)

extension Color {
    // MARK: Backgrounds (New Design Guide)

    /// BG-0: Primary background (#0B1220)
    static let bg0 = Color(red: 11/255, green: 18/255, blue: 32/255)

    /// BG-1: Surface (#101B2E)
    static let bg1 = Color(red: 16/255, green: 27/255, blue: 46/255)

    /// BG-2: Raised surface (#16233A)
    static let bg2 = Color(red: 22/255, green: 35/255, blue: 58/255)

    // MARK: Text Colors

    /// TXT-1: Primary text (#F5F7FF)
    static let txt1 = Color(red: 245/255, green: 247/255, blue: 255/255)

    /// TXT-2: Secondary text (#C8D0E6)
    static let txt2 = Color(red: 200/255, green: 208/255, blue: 230/255)

    /// TXT-3: Muted text (#92A0C2)
    static let txt3 = Color(red: 146/255, green: 160/255, blue: 194/255)

    // MARK: Accent Colors

    /// ACC-ORANGE: Primary accent (#FF8A00)
    static let accOrange = Color(red: 255/255, green: 138/255, blue: 0/255)

    /// ACC-MINT: Secondary accent (#2DE2C5)
    static let accMint = Color(red: 45/255, green: 226/255, blue: 197/255)

    /// ACC-BLUE: Tertiary accent (#4DA3FF)
    static let accBlue = Color(red: 77/255, green: 163/255, blue: 255/255)

    // MARK: State Colors

    /// OK: Success state (#2DE2C5 - same as mint)
    static let stateOk = Color(red: 45/255, green: 226/255, blue: 197/255)

    /// WARN: Warning state (#FFB020)
    static let stateWarn = Color(red: 255/255, green: 176/255, blue: 32/255)

    /// BAD: Error state (#FF4D4D)
    static let stateBad = Color(red: 255/255, green: 77/255, blue: 77/255)

    // MARK: Dividers & Lines

    /// LINE: Divider color (#243556)
    static let line = Color(red: 36/255, green: 53/255, blue: 86/255)

    // MARK: Backwards Compatibility Aliases

    /// Legacy: maps to BG-0
    static let bgBase = bg0

    /// Legacy: maps to BG-2
    static let bgCard = bg2

    /// Legacy: maps to ACC-ORANGE
    static let accentOrange = accOrange

    /// Legacy: maps to ACC-MINT
    static let accentMint = accMint

    /// Legacy: maps to ACC-BLUE
    static let accentBlue = accBlue

    /// Legacy: maps to ACC-BLUE (bright variant removed)
    static let accentBlueBright = accBlue

    /// Legacy: maps to state OK (mint)
    static let successGreen = stateOk

    /// Legacy: maps to state OK (mint)
    static let successGreenBright = stateOk

    /// Legacy: maps to state BAD
    static let errorRed = stateBad

    /// Legacy: maps to state BAD
    static let errorRedBright = stateBad

    // MARK: Ranking Colors (unchanged)

    static let goldYellow = Color(red: 1.0, green: 0.84, blue: 0.0)
    static let silverGray = Color(red: 0.7, green: 0.75, blue: 0.8)
    static let bronzeOrange = Color(red: 0.8, green: 0.5, blue: 0.2)
}

// MARK: – iOS Host Typography (Tripto Design Guide)

extension Font {
    // MARK: Typography Scale (SF Pro Display)

    /// H1: 34pt Semibold (SF Pro Display)
    static let h1 = Font.system(size: 34, weight: .semibold, design: .default)

    /// H2: 24pt Semibold
    static let h2 = Font.system(size: 24, weight: .semibold, design: .default)

    /// Body: 17pt Regular
    static let body = Font.system(size: 17, weight: .regular, design: .default)

    /// Small: 13pt Regular
    static let small = Font.system(size: 13, weight: .regular, design: .default)

    /// Button: 17pt Semibold
    static let button = Font.system(size: 17, weight: .semibold, design: .default)

    // MARK: Backwards Compatibility Aliases

    /// Legacy: maps to H1
    static let gameShowHeading = h1

    /// Legacy: maps to H2
    static let gameShowSubheading = h2

    /// Legacy: large clue text (custom size)
    static let clueText = Font.system(size: 36, weight: .bold, design: .rounded)

    /// Legacy: maps to Body with medium weight
    static let bodyLarge = Font.system(size: 22, weight: .medium, design: .default)

    /// Legacy: maps to Body
    static let bodyRegular = body

    /// Legacy: maps to Small (15pt variant)
    static let bodySmall = Font.system(size: 15, weight: .regular, design: .default)

    /// Legacy: maps to Small
    static let caption = small

    /// Legacy: maps to Button (20pt variant)
    static let buttonPrimary = Font.system(size: 20, weight: .semibold, design: .rounded)

    /// Legacy: maps to Button (18pt variant)
    static let buttonSecondary = Font.system(size: 18, weight: .medium, design: .rounded)
}

// MARK: – iOS Host Layout Constants (Tripto Design Guide)

enum Layout {
    // MARK: Spacing Scale (Base unit: 8px)

    /// Base unit: 8pt
    static let space1: CGFloat = 8

    /// 2x: 16pt
    static let space2: CGFloat = 16

    /// 3x: 24pt
    static let space3: CGFloat = 24

    /// 4x: 32pt
    static let space4: CGFloat = 32

    /// 6x: 48pt
    static let space6: CGFloat = 48

    // MARK: Corner Radius

    /// R-S: Small radius (12pt)
    static let radiusS: CGFloat = 12

    /// R-M: Medium radius (16pt)
    static let radiusM: CGFloat = 16

    /// R-L: Large radius (24pt)
    static let radiusL: CGFloat = 24

    // MARK: Button Heights

    /// Primary CTA height: 52pt
    static let buttonHeight: CGFloat = 52

    // MARK: Backwards Compatibility Aliases

    /// Legacy: maps to space3
    static let horizontalPadding: CGFloat = space3

    /// Legacy: maps to space3 (adjusted from 20)
    static let verticalPadding: CGFloat = space3

    /// Legacy: maps to space2
    static let cardPadding: CGFloat = space2

    /// Legacy: maps to space4
    static let largeSpacing: CGFloat = space4

    /// Legacy: maps to space3 (adjusted from 20)
    static let mediumSpacing: CGFloat = space3

    /// Legacy: maps to space2 (adjusted from 12)
    static let smallSpacing: CGFloat = space2

    /// Legacy: maps to space1
    static let tinySpacing: CGFloat = space1

    /// Legacy: maps to radiusS (adjusted from 8)
    static let cornerRadiusSmall: CGFloat = radiusS

    /// Legacy: maps to radiusM (adjusted from 12)
    static let cornerRadiusMedium: CGFloat = radiusM

    /// Legacy: maps to radiusL (adjusted from 16)
    static let cornerRadiusLarge: CGFloat = radiusL

    // MARK: Shadows (unchanged)

    static let shadowRadius: CGFloat = 20
    static let shadowOpacity: Double = 0.3
}

// MARK: – Button Styles (Tripto Design Guide)

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.button)
            .foregroundColor(.bg0)
            .frame(height: Layout.buttonHeight)
            .frame(maxWidth: .infinity)
            .background(Color.accOrange)
            .cornerRadius(Layout.radiusM)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.button)
            .foregroundColor(.txt1)
            .frame(height: Layout.buttonHeight)
            .frame(maxWidth: .infinity)
            .background(Color.bg2)
            .cornerRadius(Layout.radiusM)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primary: PrimaryButtonStyle {
        PrimaryButtonStyle()
    }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    static var secondary: SecondaryButtonStyle {
        SecondaryButtonStyle()
    }
}
