import SwiftUI

// MARK: – tvOS Color Palette (synced with web, TV-optimized contrast)

extension Color {
    // MARK: Backgrounds

    static let bgPrimary = Color(red: 10/255, green: 10/255, blue: 20/255)
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

    // MARK: Overlay / Backdrop

    static let overlayBackdrop = Color(red: 18/255, green: 18/255, blue: 30/255).opacity(0.85)
}
