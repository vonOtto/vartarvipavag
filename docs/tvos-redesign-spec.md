# tvOS App Redesign Spec

**Date:** 2026-02-05
**Owner:** tvOS-designer
**Status:** v1.0 — implemented

---

## Overview

This document specifies the redesign of the tvOS app for Apple TV to create a big-screen TV game show experience. The design prioritizes:

1. **TV-optimized readability** at 3-4 meter viewing distance
2. **Smooth animations** that feel TV-appropriate (slower than web)
3. **High contrast** for legibility on large screens
4. **Game show energy** through bold typography and animated elements

---

## Color Palette (Synced with Web)

All colors are synced with the web player design (see `design-decisions.md`) but with **higher contrast** for TV readability.

| Token | Value | Usage | Deviation from Web |
|-------|-------|-------|--------------------|
| `bgPrimary` | `Color(red: 10/255, green: 10/255, blue: 20/255)` | Main background | Same as web `#0a0a14` |
| `bgCard` | `Color(red: 30/255, green: 30/255, blue: 46/255).opacity(0.9)` | Card backgrounds | Same as web `rgba(30,30,46,0.9)` |
| `accentBlue` | `Color(red: 100/255, green: 108/255, blue: 255/255)` | Primary highlights | Same as web `#646cff` |
| `accentBlueBright` | `Color(red: 120/255, green: 128/255, blue: 255/255)` | High-contrast variant | 20% brighter for TV contrast |
| `successGreen` | `Color(red: 74/255, green: 222/255, blue: 128/255)` | Correct answers | Same as web `#4ade80` |
| `successGreenBright` | `Color(red: 94/255, green: 242/255, blue: 148/255)` | High-contrast variant | 20% brighter for TV |
| `errorRed` | `Color(red: 248/255, green: 113/255, blue: 113/255)` | Incorrect answers | Same as web `#f87171` |
| `errorRedBright` | `Color(red: 255/255, green: 133/255, blue: 133/255)` | High-contrast variant | Slightly brighter for TV |
| `goldYellow` | `Color(red: 1.0, green: 0.84, blue: 0.0)` | First place, level badge | Standard gold |
| `silverGray` | `Color(red: 0.7, green: 0.75, blue: 0.8)` | Second place | Standard silver |
| `bronzeOrange` | `Color(red: 0.8, green: 0.5, blue: 0.2)` | Third place | Standard bronze |

### Shadow/Glow Values

- **Web box-shadow:** `0 0 20px rgba(..., 0.4)`
- **tvOS shadow:** `radius: 40, opacity: 0.5` — **2x size** for visibility at distance
- **Text shadows:** All important text has `shadow(color: .black.opacity(0.6), radius: 4)`

---

## Typography (TV-Specific Scaling)

tvOS uses **system fonts** (not web fonts like Montserrat/Inter) optimized for TV rendering. Font sizes are mapped from web `rem` values at **~36 pt per rem**.

| Role | Font | Size | Weight | Web Equivalent | Usage |
|------|------|------|--------|----------------|-------|
| **Game Show Heading** | system rounded | 90 pt | black | 2.5rem Montserrat 900 | Page titles, destinations |
| **Game Show Subheading** | system rounded | 64 pt | heavy | 1.8rem Montserrat 700 | Section headers, correct answer |
| **Clue Text** | system rounded | 72 pt | bold | 2.0rem Montserrat 700 | Ledtrad main content |
| **Body Large** | system default | 48 pt | medium | 1.3rem Inter 400 | Supporting text |
| **Body Regular** | system default | 36 pt | regular | 1.0rem Inter 400 | Standard body text |
| **Body Small** | system default | 28 pt | regular | 0.8rem Inter 400 | Secondary info |
| **Label** | system default | 26 pt | light | 0.7rem Inter 300 | Metadata, hints |
| **Scoreboard Name** | system default | 38 pt | semibold | 1.05rem Inter 600 | Player names |
| **Scoreboard Points** | system monospaced | 38 pt | bold | 1.05rem Inter 700 | Point values |

### Line Height

- **Headings:** 1.2x (tighter than web for impact)
- **Body text:** 1.4x (more air than web 1.2 for TV readability)
- **Clue text:** 1.3x (balanced for multi-line readability)

---

## Animations

All animations are **0.2-0.3s slower** than web equivalents to account for TV viewing distance and processing time.

| Element | Animation | Duration | Easing | Web Equivalent | Trigger |
|---------|-----------|----------|--------|----------------|---------|
| **Clue text** | fade-in + slide | 0.8s | easeOut | 0.6s fadeIn | CLUE_PRESENT |
| **Clue background** | fade-in | 0.6s | easeOut | 0.4s fadeIn | CLUE_PRESENT (stagger -0.2s) |
| **Level badge** | fade-in + scale | 0.8s | easeOut | 0.6s fadeIn | CLUE_PRESENT |
| **Destination reveal** | fade-in + scale | 1.0s | easeOut | 0.8s fadeIn | DESTINATION_REVEAL |
| **Scoreboard row** | slide + reorder | 0.5s | easeInOut | 0.3s slide | Rank change |
| **Points update** | number fade-in | 1.5s | easeOut | 1.2s fadeOut | Points awarded |
| **Confetti** | fall + rotate | 2.8-4.8s | easeIn | 2.5-4.0s fall | FINAL_RESULTS |
| **Round intro pulse** | scale pulse | 2.0s cycle | easeInOut | N/A (TV only) | ROUND_INTRO |
| **Brake banner** | slide-up + pulse | 0.4s | easeOut | N/A (TV only) | BRAKE_ACCEPTED |

### Animation Principles

1. **Slower than web:** Add 0.2-0.3s to all web animation durations
2. **Staggered reveals:** When multiple elements appear, stagger by 0.1-0.2s
3. **No hover states:** TV has no mouse, skip all hover-based animations
4. **Smooth easing:** Use `.easeOut` for entrances, `.easeIn` for exits, `.easeInOut` for transitions
5. **Physics-based:** Confetti and particles use realistic fall speeds (2.8-4.8s for full screen)

---

## Layout & Spacing

### Safe Area & Margins

- **Horizontal padding:** 60-80 pt (vs web 20-40 px)
- **Vertical padding:** 48-60 pt (vs web 16-32 px)
- **Inter-element spacing:** 40-48 pt (vs web 16-24 px)
- **Card padding:** 32-48 pt (vs web 16-24 px)

### Touch Targets (Siri Remote Navigation)

- **Minimum size:** 80x80 pt (Apple TV HIG requirement)
- **Spacing between:** 20 pt minimum
- Note: Most TV UI is display-only; interactive elements are minimal (e.g., "Ny spel" button)

---

## Screen-Specific Design

### 1. Lobby Screen

**Purpose:** Show QR code for player join + player list with game-show energy

**Layout:**
- **Top:** Game show title "PÅ SPÅRET" (96 pt black rounded) with gradient (accentBlueBright -> accentBlue) and "PARTY EDITION" subtitle (28 pt, tracked)
- **Main:** Two-column layout with 80 pt horizontal spacing
  - **Left column:** QR code section
    - QR code: 320x320 pt with 24 pt padding, white background with blue glow (radius 30/60)
    - Card background: bgCard with 32 pt padding, 24 pt corner radius
    - Join code: 52 pt bold monospaced, tracked, accentBlueBright
    - Instructions: 32 pt semibold heading + 24 pt body text
  - **Right column:** Player list (max 600 pt wide)
    - Section header: "SPELARE" (28 pt bold, tracked) with green pulse indicator + count
    - Divider line (white 15% opacity)
    - Host row: Star icon + name (34 pt semibold goldYellow) + "VÄRD" badge
    - Player rows: Enhanced cards with connection pulse, name (32 pt), player number badge
    - Empty state: Icon + "Väntar på spelare..." message
- **Bottom:** Status indicator (waiting or ready state) with icons and colored backgrounds
- **Bottom-right:** "Ny spel" button (subtle secondary style)

**Player Row Design:**
- Card: 16 pt rounded corners, white 6% background (connected) or 3% (disconnected)
- Border: successGreen 20% opacity (connected) or white 5% (disconnected)
- Connection indicator: 16 pt circle with 24 pt pulse ring animation
- Player number badge: Capsule with accentBlue 15% background, 22 pt bold text
- Padding: 20 pt horizontal, 16 pt vertical

**Animations:**
- Title: Continuous breathing animation (scale 1.0 <-> 1.05, opacity 1.0 <-> 0.85, 2.0s cycle)
- Player join: Scale-pop entrance (0.8 -> 1.0) with opacity fade, spring animation (0.5s response, 0.7 damping)
- Join sparkles: 15 burst particles with 0.6-1.2s duration, blue/green/gold/white colors
- Connection pulse: Expanding ring (1.0 -> 1.4 scale) fading out (1.2s cycle)
- Status indicators: Icons with colors (progressView for waiting, checkmark for ready)

**Colors:**
- Background: Linear gradient (bgPrimary -> darker variant) for depth
- Title gradient: accentBlueBright -> accentBlue with double shadow (radius 40 + 20)
- QR card: White background with accentBlue glow (opacity 0.4/0.2, radius 30/60)
- Host badge: goldYellow with 15% opacity background
- Player cards: Dynamic opacity based on connection state
- Status indicators: successGreenBright (ready) or accentBlueBright (waiting)
- Reconnect banner: errorRed 90% opacity with 20 pt glow

**Status Indicators:**
- **Waiting:** ProgressView + "Väntar på spelare att ansluta..." (30 pt medium, white 60%)
- **Ready:** Checkmark icon (32 pt) + "Redo att starta! Värden startar spelet." (30 pt semibold)
  - Background: successGreen 15% with 2 pt border (successGreenBright 30%) and 20 pt glow

**Visual Hierarchy:**
1. Title with gradient and glow (primary attention)
2. QR code with prominent card and glow (secondary attention)
3. Player list with animated entries (tertiary attention)
4. Status indicator at bottom (contextual information)

---

### 2. Round Intro Screen

**Purpose:** Brief transition before first clue ("Vart ar vi pa vag?")

**Layout:**
- Full-screen centered text
- 96 pt bold white text
- Breathing animation: scale 1.0 <-> 1.05 (2.0s cycle)

**Animations:**
- Continuous pulse (scale + opacity) during ROUND_INTRO phase
- No explicit exit animation (phase transition handles it)

---

### 3. Clue Screen

**Purpose:** Display ledtrad with level badge and progress bar

**Layout:**
- **Top:** Level badge (140x140 pt yellow circle with pts) + 5-segment progress bar
- **Center:** Clue text (72 pt bold, centered, max 4 lines)
- **Bottom:** Locked count ("X / Y spelare lasta") + brake banner (if active)

**Level Progress Bar:**
- 5 segments (10, 8, 6, 4, 2)
- Current level: white
- Past levels: yellow 60% opacity
- Future levels: gray 30% opacity
- Segment size: 100x18 pt rounded rectangles
- Labels: 18 pt medium

**Brake Banner:**
- Red background (opacity 0.85), 36 pt bold white text
- "* [Name] bromsade!" with red circle indicator
- Padding: 32 pt horizontal, 14 pt vertical, 12 pt corner radius

**Animations:**
- Clue text: fade-in 0.8s with delay 0.2s after background
- Background: fade-in 0.6s
- Level badge: fade-in 0.8s (simultaneous with text)
- Brake banner: slide-up 0.4s when active

---

### 4. Reveal Screen

**Purpose:** Dramatic destination reveal

**Layout:**
- Full-screen centered vertical stack
- Label: "Destinationen ar..." (40 pt light, secondary color)
- Destination name: 96 pt bold white (main focus)
- Country: 48 pt medium yellow (supporting info)

**Animations:**
- Label: fade-in 0.6s
- Name: fade-in + scale (1.0s, delay 0.3s after label)
- Country: fade-in (0.8s, delay 0.5s after label)

---

### 5. Followup Screen

**Purpose:** Display question with animated timer

**Layout:**
- **Top:** Progress header ("Fraga X / Y") + countdown label (48 pt bold)
- **Below:** Animated timer bar (12 pt height, shrinking fill)
- **Center:** Question text (58 pt bold, centered, max 3 lines)
- **Below (if MC):** Options display (36 pt semibold, white.opacity(0.1) background)

**Timer Bar:**
- Track: white 12% opacity capsule
- Fill: blue (normal) or red (last 20% of time)
- Updates every 0.2s via TimelineView
- Width shrinks from 100% to 0% over timer duration

**Results Overlay:**
- Full-viewport backdrop: `rgba(18,18,30,0.85)` (design-decisions.md)
- Correct answer heading: 64 pt bold green (`successGreen`)
- Result rows: name (32 pt semibold) + verdict badge (26 pt bold pill)
- Stays visible 4s (server-controlled, no client timer)

**Animations:**
- Question fade-in: 0.8s
- Timer bar: continuous shrink animation (0.2s update intervals)
- Results overlay: fade-in 0.6s

---

### 6. Scoreboard Screen

**Purpose:** Show per-player results + rankings

**Layout:**
- Two-column: Results (left) + Standings (right)
- **Results:** Checkmark/X icon + name + answer + points badge
- **Standings:** Rank badge (circle with number) + name + total score

**Result Row:**
- Icon: 32 pt (checkmark or X), 36 pt width
- Name: 28 pt bold white
- Answer: 22 pt secondary color
- Points: 28 pt bold yellow ("+X")
- Background: white 8% opacity (correct) or 3% (incorrect)

**Standing Row:**
- Rank badge: 44x44 pt circle (gold/silver/bronze for top 3, gray for rest)
- Name: 28 pt medium white
- Score: 28 pt bold white
- Top position: yellow left border (6 pt) + subtle background highlight

**Followup-Incoming Banner:**
- Centered italic text: "Fragor om [destination] vantar..."
- 38 pt light weight, white 70% opacity
- Positioned at bottom (40 pt padding)
- Only shown during SCOREBOARD phase when followup is pending

**Animations:**
- Row reorder: slide 0.5s when rank changes
- Top position: pulse (1.2s) when achieved
- Points delta: "+X" fades in above score, slides up and fades out (1.5s)

---

### 7. Final Results Screen

**Purpose:** Celebrate winner with confetti

**Layout:**
- Reuses Scoreboard layout
- Confetti overlay: 70 pieces, deterministic fall (seeded by index)
- "Ny spel" button visible (bottom-right)

**Confetti:**
- 70 pieces, 10-23 pt size, 9 colors (red/blue/green/yellow/orange/pink/purple/cyan/white)
- Fall duration: 2.8-4.8s per piece (staggered)
- Rotation: 360-720 degrees (random direction)
- Auto-dismiss after 5.5s

**Animations:**
- Confetti triggered by `UI_EFFECT_TRIGGER { effectId: "confetti" }`
- Falls deterministically (no randomness after init)
- Timeline: fade-in scoreboard (0.6s) -> trigger confetti (immediate) -> auto-dismiss (5.5s)

---

## TV-Specific Deviations from Web

These deviations are **required** for TV and must be documented in `design-decisions.md`:

1. **Typography scaling:** Web rem -> tvOS pt at **36 pt/rem** ratio
   - Web 2.5rem -> tvOS 90 pt
   - Web 1.8rem -> tvOS 64 pt
   - Web 1.0rem -> tvOS 36 pt

2. **Animation timing:** All web animations **+0.2-0.3s** for TV processing time
   - Web 0.6s fade -> tvOS 0.8s fade
   - Web 0.3s slide -> tvOS 0.5s slide

3. **Glow/shadow size:** Web box-shadow 20px -> tvOS radius 40 pt (**2x size**)
   - Needed for visibility at 3-4m distance

4. **No hover states:** TV has no mouse; all hover-based animations skipped

5. **Higher contrast text:** Web secondary text `opacity: 0.8` -> tvOS `opacity: 0.9`

6. **Larger touch targets:** 80x80 pt minimum (Apple TV HIG requirement)

7. **System fonts only:** Web uses Google Fonts (Montserrat/Inter); tvOS uses system fonts with equivalent weights
   - Montserrat 900 -> system black rounded
   - Inter 400 -> system regular default

8. **Results overlay (followup):** TV omits `answerText` column (server doesn't forward to TV projection for security)

9. **Followup-incoming banner:** tvOS uses larger text (38 pt vs web 1.05rem ~17px) for TV readability

---

## Implementation Notes

### Design System Files

Create these new files in `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/Design/`:

1. **Colors.swift** — all color tokens as `Color` extensions
2. **Fonts.swift** — all font definitions as `Font` extensions
3. **Animations.swift** — shared animation configs (durations, easing curves)
4. **Layout.swift** — shared spacing/padding constants

### Animation Implementation

- Use SwiftUI `.animation()` modifier with explicit `value:` parameter
- For continuous animations (pulse, timer bar), use `TimelineView` or `withAnimation` loops
- For entrance animations, use `.opacity()` + `.animation()` pattern
- For confetti, use `onAppear` + `withAnimation` with deterministic seeding

### Performance

- All animations are GPU-accelerated (opacity, scale, position)
- Avoid layout-triggering animations (frame changes) during active gameplay
- Confetti uses simple shapes (RoundedRectangle) for 60fps on Apple TV 4K

---

## Acceptance Criteria

This redesign is complete when:

1. All screens have fade-in animations (0.8s clue, 1.0s reveal)
2. Scoreboard has rank-change slide animations (0.5s)
3. Typography uses TV-specific scaling (36 pt/rem)
4. Colors match web palette but with higher contrast variants
5. Confetti animation works on FINAL_RESULTS
6. All deviations documented in `design-decisions.md`
7. `swift build` succeeds without errors

---

**END OF DOCUMENT**
