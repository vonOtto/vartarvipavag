import SwiftUI

// MARK: – tvOS Typography (Tripto Design System - TV Specific Sizes)

extension Font {
    // MARK: Primary Typography

    /// TV-H1: 72pt Semibold (destination reveal, main headings)
    static let tvH1 = Font.system(size: 72, weight: .semibold, design: .default)

    /// TV-H2: 48pt Semibold (ledtradstitel, section headings)
    static let tvH2 = Font.system(size: 48, weight: .semibold, design: .default)

    /// TV-Body: 34pt Regular (ledtradstext, main content)
    static let tvBody = Font.system(size: 34, weight: .regular, design: .default)

    /// TV-Meta: 28pt Regular (round/timer, metadata)
    static let tvMeta = Font.system(size: 28, weight: .regular, design: .default)

    // MARK: Backwards Compatibility (old names mapped to new tokens)

    static let gameShowHeading = tvH1
    static let gameShowSubheading = tvH2
    static let clueText = tvH1

    static let bodyLarge = tvH2
    static let bodyRegular = tvBody
    static let bodySmall = tvMeta
    static let label = tvMeta

    static let scoreboardName = Font.system(size: 38, weight: .semibold, design: .default)
    static let scoreboardPoints = Font.system(size: 38, weight: .bold, design: .monospaced)
}

// MARK: – Typography Guidelines for tvOS

/*
 Important tvOS Typography Rules:

 - Minimum text size: 28pt (TV-Meta)
 - Maximum 35-45 characters per line for clues
 - Keep text centered for optimal readability
 - Avoid thin line weights (use Regular or Semibold)
 - Avoid text shadows (use contrast backgrounds instead)
 - Ensure high contrast (use txt1/txt2/txt3 on bg0/bg1/bg2)
 */
