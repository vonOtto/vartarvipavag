import SwiftUI

// MARK: – tvOS Color Palette (Tripto Design System)

extension Color {
    // MARK: Backgrounds

    static let bg0 = Color(hex: "0B1220")
    static let bg1 = Color(hex: "101B2E")
    static let bg2 = Color(hex: "16233A")

    // MARK: Text

    static let txt1 = Color(hex: "F5F7FF")
    static let txt2 = Color(hex: "C8D0E6")
    static let txt3 = Color(hex: "92A0C2")

    // MARK: Accents

    static let accOrange = Color(hex: "FF8A00")
    static let accMint = Color(hex: "2DE2C5")
    static let accBlue = Color(hex: "4DA3FF")

    // MARK: Status Colors

    static let statusOk = Color(hex: "2DE2C5")
    static let statusWarn = Color(hex: "FFB020")
    static let statusBad = Color(hex: "FF4D4D")

    // MARK: Line/Border

    static let line = Color(hex: "243556")

    // MARK: Ranking Colors (preserved from previous design)

    static let goldYellow = Color(red: 1.0, green: 0.84, blue: 0.0)
    static let silverGray = Color(red: 0.7, green: 0.75, blue: 0.8)
    static let bronzeOrange = Color(red: 0.8, green: 0.5, blue: 0.2)

    // MARK: Backwards Compatibility (old names mapped to new tokens)

    static let bgPrimary = bg0
    static let bgCard = bg1

    static let accentBlue = accBlue
    static let accentBlueBright = accBlue

    static let accentOrange = accOrange
    static let accentMint = accMint

    static let successGreen = statusOk
    static let successGreenBright = statusOk

    static let errorRed = statusBad
    static let errorRedBright = statusBad

    static let overlayBackdrop = Color(red: 18/255, green: 18/255, blue: 30/255).opacity(0.85)
}

// MARK: – Helper for Hex Colors

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
