# tvOS Style Guide Update — Complete

## Summary
All tvOS UI components have been updated to match the Tripto design system style guide exactly.

## Changes Made

### 1. Typography (All Components)
- **TV-H1 (72pt Semibold)**: Used for main headings, destination reveal, round intro
- **TV-H2 (48pt Semibold)**: Used for section headings, clue titles, scoreboard headers
- **TV-Body (34pt Regular)**: Used for clue text, player names, question text
- **TV-Meta (28pt Regular)**: Used for timers, metadata, status text
- **Minimum text**: All text is now minimum 28pt (no exceptions)

### 2. Color Tokens (Strict Enforcement)
Replaced all custom colors with design system tokens:
- **Backgrounds**: `bg0` (0B1220), `bg1` (101B2E), `bg2` (16233A)
- **Text**: `txt1` (F5F7FF), `txt2` (C8D0E6), `txt3` (92A0C2)
- **Accents**: `accOrange` (FF8A00), `accMint` (2DE2C5), `accBlue` (4DA3FF)
- **Status**: `statusOk` (2DE2C5), `statusWarn` (FFB020), `statusBad` (FF4D4D)

### 3. Spacing Tokens
All spacing now uses defined tokens:
- `space8`, `space16`, `space24`, `space32`, `space48`
- Card padding: `cardPadding` (32pt for TV)
- Corner radii: `radiusS` (12), `radiusM` (16), `radiusL` (24)

### 4. Button Specs (tvOS Focused)
- **Primary Button**: Orange accent (`accOrange`), 72pt height, 16pt radius
- **Secondary Button**: BG-2 background, 72pt height, 16pt radius
- **Focus States**: 1.05x scale, border with 30% opacity, 200ms easeInOut animation
- Added `PrimaryButton` component with proper focus handling

### 5. Component-Specific Updates

#### LaunchView
- Title: `tvH1` (72pt) in lowercase
- Tagline: `tvMeta` (28pt) with extra tracking
- Buttons: Primary style with orange accent
- Background: `bg0`
- All text uses color tokens

#### ConnectingView
- Status text: `tvBody` (34pt) in `txt2`
- Error text: `tvMeta` (28pt) in `statusBad`
- Background: `bg0`

#### LobbyView
- Title: `tvH1` (72pt)
- QR card: `bg1`, radius 24, padding 32
- Player cards: `bg2`, radius 16, padding 24
- Player names: `tvBody` (34pt)
- Status: `tvMeta` (28pt)
- Join code: Mint accent color
- Buttons: Secondary style with proper focus states

#### RoundIntroView
- Headline: `tvH1` (72pt) in `txt1`
- Background: `bg0`
- Removed shadows (using contrast backgrounds instead)

#### TVClueView
- Clue text: `tvBody` (34pt), centered, max 35-45 chars/line
- Level badge: Orange circle with 72pt text
- Timer: Pill-style with color based on time (mint → warn → bad)
- Points: `tvH2` (48pt) in orange
- Progress bar: Orange/mint/txt3 color scheme
- Background: `bg0`, card background `bg1`

#### TVRevealView
- Destination: `tvH1` (72pt)
- Country: `tvBody` (34pt) in `txt2`
- Label: `tvH2` (48pt)
- Background: `bg0`

#### TVFollowupView
- Question text: `tvBody` (34pt), centered
- Timer: Pill with `tvMeta` (28pt), color based on time
- Progress bar: Mint → statusBad gradient
- Options: `tvBody` (34pt) in `bg2` cards
- Results overlay: Proper color tokens, `tvH2` for correct answer
- Background: `bg0`

#### TVScoreboardView
- Headers: `tvH2` (48pt)
- Player names: `tvBody` (34pt)
- Points: `tvH2` (48pt) in orange
- Rank badges: Orange/mint/blue for top 3, txt3 for others
- Leader: Orange underline, `bg1` background
- Background: `bg0`

### 6. Removed Anti-Patterns
- ❌ No more text shadows (use contrast backgrounds)
- ❌ No more custom font sizes outside the system
- ❌ No more gradient backgrounds on text
- ❌ No more thin line weights
- ❌ No more custom opacity values on core colors

### 7. Focus States (tvOS-Specific)
All focusable elements now have:
- 1.05x scale on focus
- 2px border with 30% opacity (mint accent)
- Lighter background (15% vs 8% opacity)
- 200ms easeInOut animation

## Files Modified
1. `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/App.swift`
2. `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/RoundIntroView.swift`
3. `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/TVClueView.swift`
4. `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/TVRevealView.swift`
5. `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/TVFollowupView.swift`
6. `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/TVScoreboardView.swift`

## Design System Compliance
✅ All text is minimum 28pt
✅ All colors use design tokens (no custom values)
✅ All spacing uses defined tokens
✅ Buttons follow tvOS spec (72pt height, 16pt radius)
✅ Focus states are properly implemented
✅ No text shadows (using contrast backgrounds)
✅ Text centered for optimal TV viewing
✅ Max 35-45 characters per line for clues

## Testing
- ✅ Swift build completed successfully
- ✅ All components compile without errors
- ✅ Typography tokens correctly applied
- ✅ Color tokens correctly applied
- ✅ Spacing tokens correctly applied

## Next Steps
1. Test on actual Apple TV hardware for legibility
2. Verify focus navigation flows correctly
3. Ensure all animations feel natural at 10-foot distance
4. Get design review approval
