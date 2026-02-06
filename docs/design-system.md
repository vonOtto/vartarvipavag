# Tripto Design System v1.0

**Last Updated:** 2026-02-06
**Status:** Active
**Maintained by:** CEO + Design Team

---

## Overview

This document defines the complete design system for Tripto — a unified token library, component specifications, and implementation guides for all platforms (Web, tvOS, iOS Host).

### Design Principles

1. **Bold & Punchy:** High contrast, saturated colors, large typography
2. **Animated & Alive:** Smooth transitions, attention-grabbing pulses, tactile feedback
3. **Hierarchy:** Clear visual distinction between primary actions and secondary info
4. **Energy:** Game show vibe — exciting, fast-paced, TV-quality polish
5. **Cross-Platform Consistency:** Same visual language across Web, tvOS, and iOS with platform-appropriate adaptations

---

## 1. Design Tokens

### 1.1 Color Palette

#### Background Tokens

| Token | Value | CSS/Hex | SwiftUI | Usage |
|-------|-------|---------|---------|-------|
| **BG-0** (Primary) | Dark gradient | `linear-gradient(135deg, #0a0a14 0%, #12121e 100%)` | `LinearGradient([Color(#0a0a14), Color(#12121e)])` | Main page background |
| **BG-1** (Card) | Dark blue translucent | `rgba(30, 30, 46, 0.9)` | `Color(.sRGB, red: 30/255, green: 30/255, blue: 46/255, opacity: 0.9)` | Card/section backgrounds |
| **BG-1-hover** | Lighter card | `rgba(40, 40, 60, 0.95)` | `Color(.sRGB, red: 40/255, green: 40/255, blue: 60/255, opacity: 0.95)` | Interactive card hover state |
| **BG-overlay** | Dark translucent | `rgba(18, 18, 30, 0.9)` | `Color(.sRGB, red: 18/255, green: 18/255, blue: 30/255, opacity: 0.9)` | Full-screen overlays |

#### Accent Colors

| Token | Value | CSS/Hex | SwiftUI | Usage |
|-------|-------|---------|---------|-------|
| **ACCENT-blue** | Primary blue | `#646cff` | `Color(.sRGB, red: 100/255, green: 108/255, blue: 255/255)` | Primary accent (headings, highlights, buttons) |
| **ACCENT-blue-bright** | Hover blue | `#7c84ff` | `Color(.sRGB, red: 124/255, green: 132/255, blue: 255/255)` | Hover state, TV high-contrast |
| **ACCENT-green** | Success green | `#4ade80` | `Color(.sRGB, red: 74/255, green: 222/255, blue: 128/255)` | Correct answers, positive states |
| **ACCENT-green-bright** | Bright green | `#5ef294` | `Color(.sRGB, red: 94/255, green: 242/255, blue: 148/255)` | High-contrast (TV) |
| **ACCENT-red** | Error red | `#ff453a` | `Color(.sRGB, red: 255/255, green: 69/255, blue: 58/255)` | Wrong answers, errors, brake |
| **ACCENT-red-bright** | Bright red | `#ff5948` | `Color(.sRGB, red: 255/255, green: 89/255, blue: 72/255)` | High-contrast (TV) |
| **ACCENT-gold** | Gold | `#ffd700` | `Color(.sRGB, red: 1.0, green: 0.84, blue: 0.0)` | Top rank (#1), level badges |
| **ACCENT-orange** | Brand orange | `#ff8c42` | `Color(.sRGB, red: 255/255, green: 140/255, blue: 66/255)` | Brand accent (icon) |
| **ACCENT-mint** | Brand mint | `#5ef2cc` | `Color(.sRGB, red: 94/255, green: 242/255, blue: 204/255)` | Brand accent (icon) |

#### Text Colors

| Token | Value | CSS/Hex | SwiftUI | Usage |
|-------|-------|---------|---------|-------|
| **TEXT-primary** | White high opacity | `rgba(255, 255, 255, 0.95)` | `Color.white.opacity(0.95)` | Main text |
| **TEXT-secondary** | White medium | `rgba(255, 255, 255, 0.7)` | `Color.white.opacity(0.7)` | Secondary text |
| **TEXT-muted** | White low | `rgba(255, 255, 255, 0.5)` | `Color.white.opacity(0.5)` | Muted labels |

#### Effect Colors

| Token | Value | CSS | SwiftUI | Usage |
|-------|-------|-----|---------|-------|
| **GLOW-blue** | Blue glow | `0 0 20px rgba(100, 108, 255, 0.4)` | `.shadow(color: ACCENT-blue.opacity(0.4), radius: 20)` | Blue glow effect |
| **GLOW-green** | Green glow | `0 0 15px rgba(74, 222, 128, 0.5)` | `.shadow(color: ACCENT-green.opacity(0.5), radius: 15)` | Green glow effect |
| **GLOW-red** | Red glow | `0 0 15px rgba(255, 69, 58, 0.5)` | `.shadow(color: ACCENT-red.opacity(0.5), radius: 15)` | Red glow effect |
| **GLOW-brake** | Brake glow | `0 0 30px rgba(255, 69, 58, 0.7)` | `.shadow(color: ACCENT-red.opacity(0.7), radius: 30)` | Brake button pulsing glow |

#### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| **SUCCESS** | `ACCENT-green` | Correct answers, positive feedback |
| **ERROR** | `ACCENT-red` | Incorrect answers, errors, brake |
| **WARNING** | `#fbbf24` (yellow) | Timer warnings, caution states |
| **INFO** | `ACCENT-blue` | Informational highlights |

---

### 1.2 Typography

#### Font Stacks

**Web (Google Fonts):**
```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&family=Inter:wght@300;400;600;700&display=swap');

--font-heading: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
--font-body: 'Inter', system-ui, -apple-system, sans-serif;
```

**iOS/tvOS (System Fonts):**
```swift
// Heading equivalent: .rounded .black / .heavy / .bold
// Body equivalent: .default .regular / .medium / .semibold / .bold
```

#### Typography Scale

| Token | Web | tvOS | iOS | Weight | Usage |
|-------|-----|------|-----|--------|-------|
| **TYPE-hero** | 2.8rem Montserrat | 90pt system rounded | 48pt system rounded | 900 (black) | Page titles, destination reveal |
| **TYPE-h1** | 2.0rem Montserrat | 64pt system rounded | 36pt system rounded | 700 (bold) | Section headers, correct answer |
| **TYPE-h2** | 1.5rem Montserrat | 54pt system rounded | 28pt system rounded | 700 (bold) | Subsections, form labels |
| **TYPE-clue** | 1.8rem Montserrat | 72pt system rounded | 32pt system rounded | 700 (bold) | Clue text (center-aligned) |
| **TYPE-clue-points** | 4.0rem Montserrat | 120pt system rounded | 64pt system rounded | 900 (black) | Point value display |
| **TYPE-body-large** | 1.1rem Inter | 48pt system default | 20pt system default | 400 (regular) | Standard text |
| **TYPE-body** | 1.0rem Inter | 36pt system default | 17pt system default | 400 (regular) | Default body text |
| **TYPE-body-bold** | 1.0rem Inter | 38pt system default | 17pt system default | 600 (semibold) | Emphasized body text |
| **TYPE-label** | 0.9rem Inter | 26pt system default | 13pt system default | 600 (semibold) | Metadata, labels |
| **TYPE-small** | 0.85rem Inter | 28pt system default | 12pt system default | 400 (regular) | Hints, fine print |
| **TYPE-score** | 1.2rem Inter | 38pt system monospaced | 20pt system monospaced | 700 (bold) | Score numbers (tabular-nums) |
| **TYPE-button** | 1.4rem Montserrat | 48pt system rounded | 18pt system rounded | 700 (bold) | Primary CTAs (uppercase) |

#### Typography Features

- **Tabular Numbers:** All score/timer displays use `font-variant-numeric: tabular-nums;` (CSS) or `.monospacedDigit()` (SwiftUI)
- **Uppercase:** Button labels use `text-transform: uppercase;` (CSS) or `.uppercased()` (Swift)
- **Center Alignment:** Clue text, destination reveal, results always centered
- **Line Height:** Headings 1.2x, Body 1.4x (tvOS), 1.5x (Web/iOS), Clue 1.3x

#### Platform Scaling Ratio

- **Web → tvOS:** ~36 pt per rem (e.g., 2.8rem = 90pt)
- **Web → iOS:** ~17 pt per rem (e.g., 2.8rem = 48pt)

---

### 1.3 Spacing & Layout

#### Spacing Scale

| Token | Web (px) | tvOS (pt) | iOS (pt) | Usage |
|-------|----------|-----------|----------|-------|
| **SPACE-xs** | 4px | 8pt | 4pt | Tight inline spacing |
| **SPACE-sm** | 8px | 16pt | 8pt | Small gaps |
| **SPACE-md** | 16px | 40pt | 16pt | Default element spacing |
| **SPACE-lg** | 24px | 60pt | 24pt | Section spacing |
| **SPACE-xl** | 32px | 80pt | 32pt | Major section separation |
| **SPACE-2xl** | 48px | 120pt | 48pt | Full-screen padding |

#### Border Radius

| Token | Web | tvOS | iOS | Usage |
|-------|-----|------|-----|-------|
| **RADIUS-sm** | 4px | 8pt | 8pt | Small pills, badges |
| **RADIUS-md** | 8px | 16pt | 12pt | Standard cards, rows |
| **RADIUS-lg** | 12px | 24pt | 16pt | Large cards, overlays |
| **RADIUS-xl** | 16px | 32pt | 20pt | Prominent buttons, hero cards |
| **RADIUS-full** | 9999px / 50% | 9999pt / 50% | 9999pt / 50% | Circular elements |

#### Container Widths

| Token | Web | tvOS | iOS | Usage |
|-------|-----|------|-----|-------|
| **CONTAINER-sm** | 480px | N/A | 375pt | Mobile forms |
| **CONTAINER-md** | 600px | N/A | 480pt | Default player container |
| **CONTAINER-lg** | 768px | 1920px | 768pt | Tablet / TV full width |

---

### 1.4 Shadows & Effects

#### Shadow Tokens

| Token | Web | tvOS | iOS | Usage |
|-------|-----|------|-----|-------|
| **SHADOW-sm** | `0 2px 8px rgba(0,0,0,0.2)` | `radius: 8, opacity: 0.3` | `radius: 4, opacity: 0.2` | Subtle elevation |
| **SHADOW-md** | `0 4px 20px rgba(0,0,0,0.3)` | `radius: 20, opacity: 0.4` | `radius: 10, opacity: 0.3` | Card elevation |
| **SHADOW-lg** | `0 8px 40px rgba(0,0,0,0.4)` | `radius: 40, opacity: 0.5` | `radius: 20, opacity: 0.4` | Prominent elements |
| **SHADOW-text** | `0 2px 4px rgba(0,0,0,0.6)` | `radius: 4, opacity: 0.6` | `radius: 2, opacity: 0.5` | Text readability |

**Note:** tvOS shadows are **2x size** of web for visibility at 3-4m viewing distance.

---

## 2. Component Library

### 2.1 Brake Button

**Purpose:** Urgent, tactile, attention-grabbing brake action.

**Visual Spec:**

| Property | Value |
|----------|-------|
| **Size (Web)** | 80% width, max 450px, height 140px |
| **Size (iOS)** | 85% width, min 280pt, height 70pt |
| **Shape** | Rounded rectangle (RADIUS-xl) |
| **Color (active)** | Red gradient: `linear-gradient(135deg, #ff453a 0%, #e03528 100%)` |
| **Color (disabled)** | `rgba(100, 100, 120, 0.25)` |
| **Border (active)** | 4px solid rgba(255, 255, 255, 0.3) |
| **Text** | "BROMS" (uppercase, TYPE-button, white) |
| **Animation (active)** | Continuous pulse (scale 1 → 1.05) + glowPulse (1.5s cycle) |

**Interaction States:**

| State | Transform | Glow | Cursor |
|-------|-----------|------|--------|
| **Active** | scale(1) | GLOW-brake (pulsing) | pointer |
| **Hover** | scale(1.02) | GLOW-brake (brighter) | pointer |
| **Press** | scale(0.95) | GLOW-brake (max) | pointer |
| **Disabled** | scale(1) | none | not-allowed |

**Code Examples:**

```css
/* Web */
.brake-button {
  width: 80%;
  max-width: 450px;
  height: 140px;
  font-family: var(--font-heading);
  font-size: 2.2rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: var(--radius-xl);
  border: 4px solid transparent;
  transition: transform 0.15s ease-out, box-shadow 0.2s ease;
  cursor: pointer;
}

.brake-button:not(:disabled) {
  background: linear-gradient(135deg, #ff453a 0%, #e03528 100%);
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
  animation: pulse 1.5s ease-in-out infinite, glowPulse 1.5s ease-in-out infinite;
}
```

```swift
// iOS/tvOS
struct BrakeButton: View {
  let action: () -> Void
  let isEnabled: Bool

  var body: some View {
    Button(action: action) {
      Text("BROMS")
        .font(.system(size: 48, weight: .black, design: .rounded))
        .textCase(.uppercase)
        .kerning(2)
        .foregroundColor(.white)
        .frame(maxWidth: 450, minHeight: 140)
        .background(
          isEnabled
            ? LinearGradient(colors: [Color(hex: "ff453a"), Color(hex: "e03528")], startPoint: .topLeading, endPoint: .bottomTrailing)
            : Color.gray.opacity(0.25)
        )
        .cornerRadius(32)
        .overlay(
          RoundedRectangle(cornerRadius: 32)
            .stroke(Color.white.opacity(0.3), lineWidth: 4)
        )
        .shadow(color: isEnabled ? Color(hex: "ff453a").opacity(0.7) : .clear, radius: 30)
        .scaleEffect(isEnabled ? pulseScale : 1.0)
    }
    .disabled(!isEnabled)
  }
}
```

---

### 2.2 Scoreboard

**Purpose:** Live-updating player rankings with visual hierarchy.

**Layout:**

- Ordered list with counter-based rank numbers
- Row spacing: SPACE-md (0.6rem / 16pt)
- Row padding: SPACE-lg vertical, SPACE-lg horizontal

**Row Variants:**

| Variant | Background | Border | Animation |
|---------|------------|--------|-----------|
| **Base** | `rgba(255,255,255,0.06)` | none | fadeInUp 0.4s |
| **Top rank (#1)** | Gold gradient + gold left border (4px) | gold 4px left | pulse 2s infinite |
| **Own entry** | Blue tinted `rgba(100,108,255,0.18)` | blue 3px left | pulse (on update) |
| **Own + Top** | Gold gradient + blue box-shadow | gold 4px left | pulse 2s infinite |

**Code Examples:**

```css
/* Web */
.scoreboard-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  transition: all 0.4s ease-out;
  animation: fadeInUp 0.4s ease-out;
}

.scoreboard-row.rank-1 {
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(100, 108, 255, 0.12) 100%);
  border-left: 4px solid var(--accent-gold);
  animation: pulse 2s ease-in-out infinite;
}

.scoreboard-row.my-entry {
  border-left: 3px solid var(--accent-blue);
  background: rgba(100, 108, 255, 0.18);
}

.scoreboard-row.my-entry.score-updated {
  animation: pulse 0.8s ease-out;
}
```

```swift
// iOS/tvOS
struct ScoreboardRow: View {
  let rank: Int
  let player: String
  let score: Int
  let isOwn: Bool

  var body: some View {
    HStack(spacing: 16) {
      Text("\(rank)")
        .font(.system(size: 28, weight: .bold))
        .foregroundColor(.white.opacity(0.7))
        .frame(width: 40)

      Text(player)
        .font(.system(size: 28, weight: .semibold))
        .foregroundColor(.white)
        .frame(maxWidth: .infinity, alignment: .leading)

      Text("\(score)")
        .font(.system(size: 28, weight: .bold).monospacedDigit())
        .foregroundColor(Color(hex: "646cff"))
    }
    .padding(.horizontal, 20)
    .padding(.vertical, 16)
    .background(rowBackground)
    .cornerRadius(16)
    .overlay(
      RoundedRectangle(cornerRadius: 16)
        .stroke(rank == 1 ? Color(hex: "ffd700") : .clear, lineWidth: 4)
        .padding(.leading, -4)
    )
  }

  var rowBackground: some View {
    Group {
      if rank == 1 {
        LinearGradient(
          colors: [Color(hex: "ffd700").opacity(0.2), Color(hex: "646cff").opacity(0.12)],
          startPoint: .leading,
          endPoint: .trailing
        )
      } else if isOwn {
        Color(hex: "646cff").opacity(0.18)
      } else {
        Color.white.opacity(0.06)
      }
    }
  }
}
```

---

### 2.3 Clue Display

**Purpose:** Dramatic reveal of clue text with point value.

**Layout:**

- Vertical flex, centered
- Points: TYPE-clue-points (huge, bold, ACCENT-blue)
- Text: TYPE-clue (large, bold, center-aligned)
- Background: BG-1 with SHADOW-md
- Padding: SPACE-2xl all sides

**Animations:**

- Points: scalePop (0.5s, spring bounce)
- Text: fadeInUp (0.6s, delayed by textRevealAfterMs)

**Code Examples:**

```css
/* Web */
.clue-display {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2.5rem 1.5rem;
  background: rgba(30, 30, 46, 0.9);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.clue-points {
  font-family: var(--font-heading);
  font-size: 4rem;
  font-weight: 900;
  text-align: center;
  color: var(--accent-blue);
  letter-spacing: -0.03em;
  animation: scalePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.clue-text {
  font-family: var(--font-heading);
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.5;
  text-align: center;
  animation: fadeInUp 0.6s ease-out;
}
```

---

### 2.4 Answer Form

**Purpose:** Text input + submit button for player answers.

**Visual Spec:**

| Element | Size | Border | Background | Interaction |
|---------|------|--------|------------|-------------|
| **Input** | 1.2rem, padding 1rem 1.25rem | 2px rgba(255,255,255,0.2) | rgba(255,255,255,0.08) | Focus: blue border + GLOW-blue |
| **Button** | 1.4rem bold uppercase, padding 1.25rem | none | ACCENT-blue | Hover: ACCENT-blue-bright + scale(1.02) |

**Code Examples:**

```css
/* Web */
.answer-form input {
  padding: 1rem 1.25rem;
  font-size: 1.2rem;
  font-family: var(--font-body);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.answer-form input:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: var(--glow-blue);
}

.answer-form button {
  padding: 1.25rem;
  font-size: 1.4rem;
  font-weight: 700;
  font-family: var(--font-heading);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--accent-blue);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
}

.answer-form button:hover:not(:disabled) {
  background: var(--accent-blue-bright);
  transform: scale(1.02);
}
```

---

### 2.5 Destination Reveal

**Purpose:** Dramatic full-screen reveal of destination.

**Layout:**

- Centered vertical stack
- Label: TYPE-body ("Det var...")
- Name: TYPE-hero (huge, bold, ACCENT-blue)
- Country: TYPE-h2 (medium, TEXT-secondary)

**Animations:**

- Label: fadeInUp (0.3s)
- Name: scalePop (0.5s, delay 0.2s)
- Country: fadeInUp (0.4s, delay 0.4s)

**Code Examples:**

```css
/* Web */
.destination-reveal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2.5rem 1rem;
  text-align: center;
}

.destination-reveal h2 {
  font-size: 1.2rem;
  opacity: 0.6;
  animation: fadeInUp 0.3s ease-out;
}

.destination-name {
  font-family: var(--font-heading);
  font-size: 2.8rem;
  font-weight: 900;
  color: var(--accent-blue);
  letter-spacing: -0.02em;
  animation: scalePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s backwards;
}

.destination-country {
  font-size: 1.5rem;
  opacity: 0.8;
  animation: fadeInUp 0.4s ease-out 0.4s backwards;
}
```

---

### 2.6 Followup Result Overlay

**Purpose:** Full-screen overlay showing correct answer + player results.

**Layout:**

- Fixed full-screen overlay (BG-overlay backdrop)
- Centered card (max-width CONTAINER-md)
- Correct answer: TYPE-h1, ACCENT-blue
- Player rows: horizontal flex (name + answer + verdict badge)
- Own row: blue outline (ACCENT-blue)
- Correct row: green left border (SUCCESS)
- Incorrect row: red left border (ERROR)

**Animations:**

- Overlay: slideInFromTop (0.4s)
- Rows: staggered fadeInUp (0.1s delay per row)

**Code Examples:**

```css
/* Web */
.fq-result-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(18, 18, 30, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  animation: fadeIn 0.3s ease-out;
}

.fq-result-overlay-inner {
  width: 100%;
  max-width: 540px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: slideInFromTop 0.4s ease-out;
}

.fq-result-overlay-correct-answer {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent-blue);
  text-align: center;
  animation: scalePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

### 2.7 Timer Components

#### Countdown Timer (Followup)

**Visual Spec:**

| Property | Value |
|----------|-------|
| **Height** | 12pt (Web: 12px) |
| **Shape** | Capsule (RADIUS-full) |
| **Track** | rgba(255,255,255,0.12) |
| **Fill (normal)** | ACCENT-blue |
| **Fill (warning <20%)** | ACCENT-red |
| **Update interval** | 0.2s (TimelineView) |

**Animation:** Width shrinks from 100% to 0% over timer duration.

**Code Examples:**

```css
/* Web */
.timer-bar {
  width: 100%;
  height: 12px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.timer-bar-fill {
  height: 100%;
  transition: width 0.2s linear, background 0.3s ease;
  border-radius: 9999px;
}

.timer-bar-fill.normal {
  background: var(--accent-blue);
}

.timer-bar-fill.warning {
  background: var(--accent-red);
}
```

```swift
// tvOS
TimelineView(.periodic(from: .now, by: 0.2)) { timeline in
  GeometryReader { geo in
    let progress = max(0, remainingTime / totalTime)
    let fillColor = progress < 0.2 ? Color(hex: "ff453a") : Color(hex: "646cff")

    Capsule()
      .fill(Color.white.opacity(0.12))
      .overlay(
        Capsule()
          .fill(fillColor)
          .frame(width: geo.size.width * progress)
        , alignment: .leading
      )
  }
  .frame(height: 12)
}
```

---

## 3. Motion & Feedback

### 3.1 Animation Keyframes

**Web (CSS):**

```css
/* Pulse — for attention-grabbing elements */
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
}

/* Fade in from below — for new content */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Glow pulse — for brake button */
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 69, 58, 0.4); }
  50% { box-shadow: 0 0 40px rgba(255, 69, 58, 0.8); }
}

/* Shake — for errors/rejections */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
}

/* Fade out up — for transient notifications */
@keyframes fadeOutUp {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-20px); }
}

/* Slide in from top — for overlays */
@keyframes slideInFromTop {
  from { opacity: 0; transform: translateY(-30px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scale pop — for revealing elements */
@keyframes scalePop {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
```

### 3.2 Animation Timing

| Element | Animation | Web Duration | tvOS Duration | iOS Duration | Easing |
|---------|-----------|--------------|---------------|--------------|--------|
| **Clue text** | fadeInUp | 0.6s | 0.8s | 0.6s | ease-out |
| **Clue points** | scalePop | 0.5s | 0.7s | 0.5s | spring |
| **Brake button (active)** | pulse + glowPulse | 1.5s | 1.5s | 1.5s | ease-in-out |
| **Brake rejected** | shake | 0.4s | 0.4s | 0.4s | ease-out |
| **Answer locked** | fadeInUp | 0.5s | 0.6s | 0.5s | ease-out |
| **Scoreboard rows** | fadeInUp | 0.4s | 0.5s | 0.4s | ease-out |
| **Scoreboard top rank** | pulse | 2.0s | 2.0s | 2.0s | ease-in-out |
| **Result overlay** | slideInFromTop | 0.4s | 0.6s | 0.4s | ease-out |
| **Destination reveal** | scalePop | 0.5s | 1.0s | 0.6s | spring |
| **Followup timer bar** | width transition | 0.5s | 0.5s | 0.5s | linear |
| **Notification toast** | fadeInUp + fadeOutUp | 2.5s | 2.5s | 2.5s | ease |

**Platform Timing Rules:**

- **tvOS:** Add 0.2-0.3s to all web animations (TV processing + viewing distance)
- **iOS:** Same as web (mobile optimized)
- **Web:** Baseline timing

### 3.3 Transition Standards

```css
/* Default transition (hover/focus) */
all 0.2s ease-out

/* Transform transitions */
transform 0.15s ease-out

/* Color transitions */
background 0.2s ease, border-color 0.2s ease, color 0.2s ease

/* No animation on reconnect */
/* Skip entry animations when rendering from STATE_SNAPSHOT */
```

---

## 4. Platform-Specific Guidelines

### 4.1 Web Player

**Target Devices:** Mobile (iOS/Android), Tablet, Desktop (responsive)

**Key Constraints:**

- Container max-width: 600px
- Mobile-first responsive (< 480px breakpoints)
- Touch-friendly tap targets (min 44x44px)
- Network-aware (show loading states, handle reconnect)

**Unique Features:**

- Google Fonts (Montserrat + Inter)
- CSS animations (GPU-accelerated)
- Hover states (desktop only)
- PWA-ready (offline support, installable)

**Responsive Breakpoints:**

```css
/* Mobile (< 480px) */
@media (max-width: 479px) {
  .brake-button { height: 120px; font-size: 1.8rem; }
  .clue-points { font-size: 3rem; }
  .clue-text { font-size: 1.4rem; }
  .destination-name { font-size: 2.2rem; }
}

/* Tablet (480px - 768px) */
/* No adjustments needed (default sizes) */

/* Desktop (> 768px) */
@media (min-width: 769px) {
  .container { max-width: 600px; margin: 0 auto; }
}
```

---

### 4.2 tvOS App

**Target Devices:** Apple TV 4K, Apple TV HD (1920x1080, 2560x1440)

**Key Constraints:**

- Viewing distance: 3-4 meters (TV-optimized typography + shadows)
- System fonts only (no web fonts)
- No hover states (Siri Remote navigation)
- Safe area margins: 60-80pt horizontal, 48-60pt vertical
- GPU-accelerated animations (60fps target)

**Typography Scaling:**

- **Ratio:** 36 pt per rem (Web → tvOS)
- Example: 2.8rem → 90pt

**Shadow Scaling:**

- **Ratio:** 2x size (Web → tvOS)
- Example: 20px → 40pt

**Unique Features:**

- Confetti animation (FINAL_RESULTS)
- Round intro pulse (ROUND_INTRO)
- Brake banner (slide-up)
- Higher contrast colors (bright variants)
- Larger touch targets (80x80pt minimum)

**Design Deviations:**

1. System fonts (not Montserrat/Inter)
2. No hover states
3. 2x shadow size
4. +0.2-0.3s animation timing
5. Higher opacity text (0.9 vs 0.7)

---

### 4.3 iOS Host App

**Target Devices:** iPhone, iPad (native UIKit/SwiftUI)

**Key Constraints:**

- Native iOS design language (SF Symbols, system colors)
- Portrait + landscape support
- Dark mode support (automatic)
- Keyboard handling (form inputs)
- Navigation patterns (SwiftUI NavigationStack)

**Unique Features:**

- Session creation flow
- QR code generation
- Game control (start/stop)
- Pro view (host-only state visibility)

**Typography:**

- Uses system fonts (same as tvOS but smaller scaling)
- SF Pro Rounded for headings
- SF Pro Text for body

---

## 5. QR + Lobby Specifications

### 5.1 QR Code Display (tvOS + iOS Host)

**Visual Spec:**

| Property | tvOS | iOS Host |
|----------|------|----------|
| **Size** | 320x320pt | 200x200pt |
| **Background** | White | White |
| **Padding** | 24pt | 16pt |
| **Border radius** | 24pt | 16pt |
| **Glow** | GLOW-blue (radius 30/60, opacity 0.4/0.2) | GLOW-blue (radius 15, opacity 0.3) |
| **Card background** | BG-1 | BG-1 |
| **Card padding** | 32pt | 24pt |
| **Join code** | 52pt bold monospaced, tracked, ACCENT-blue-bright | 36pt bold monospaced, ACCENT-blue |

**Layout:**

- QR code centered in card
- Join code below QR (large, bold, tracked)
- Instructions text below code (TYPE-body)

**Code Example (SwiftUI):**

```swift
VStack(spacing: 20) {
  Image(uiImage: qrCodeImage)
    .interpolation(.none)
    .resizable()
    .frame(width: 320, height: 320)
    .padding(24)
    .background(Color.white)
    .cornerRadius(24)
    .shadow(color: Color(hex: "646cff").opacity(0.4), radius: 30)

  Text(joinCode)
    .font(.system(size: 52, weight: .bold, design: .monospaced))
    .kerning(6)
    .foregroundColor(Color(hex: "7c84ff"))

  Text("Gå till play.tripto.game och ange koden")
    .font(.system(size: 24))
    .foregroundColor(.white.opacity(0.7))
}
.padding(32)
.background(Color(hex: "1e1e2e").opacity(0.9))
.cornerRadius(24)
```

---

### 5.2 Player List (Lobby)

**Visual Spec:**

| Property | tvOS | iOS Host |
|----------|------|----------|
| **Header** | "SPELARE" (28pt bold, tracked) | "Spelare" (20pt bold) |
| **Header indicator** | Green pulse + count | Green dot + count |
| **Player row padding** | 20pt horizontal, 16pt vertical | 16pt horizontal, 12pt vertical |
| **Player row border-radius** | 16pt | 12pt |
| **Player name size** | 32pt semibold | 17pt semibold |
| **Connection indicator** | 16pt circle + 24pt pulse ring | 10pt circle + 16pt pulse |
| **Player number badge** | Capsule, ACCENT-blue 15% bg, 22pt bold | Capsule, ACCENT-blue 15% bg, 15pt bold |

**Player Row Variants:**

| State | Background | Border | Animation |
|-------|------------|--------|-----------|
| **Connected** | rgba(255,255,255,0.06) | SUCCESS 20% opacity | Connection pulse (1.2s) |
| **Disconnected** | rgba(255,255,255,0.03) | white 5% opacity | None |
| **Host** | rgba(255,215,0,0.15) | gold 2pt | None |
| **Joining (sparkles)** | Base | Base | Scale-pop + sparkles (15 particles) |

**Animations:**

- **Player join:** Scale-pop entrance (0.8 → 1.0, spring 0.5s response, 0.7 damping)
- **Join sparkles:** 15 burst particles (0.6-1.2s, blue/green/gold/white)
- **Connection pulse:** Expanding ring (1.0 → 1.4 scale, fade out, 1.2s cycle)

**Code Example (SwiftUI):**

```swift
struct PlayerRow: View {
  let player: Player
  let isHost: Bool

  var body: some View {
    HStack(spacing: 16) {
      // Connection indicator
      Circle()
        .fill(player.isConnected ? Color(hex: "4ade80") : Color.white.opacity(0.2))
        .frame(width: 16, height: 16)
        .overlay(
          player.isConnected
            ? Circle()
                .stroke(Color(hex: "4ade80"), lineWidth: 2)
                .scaleEffect(pulseScale)
                .opacity(pulseOpacity)
            : nil
        )

      // Host star (if host)
      if isHost {
        Image(systemName: "star.fill")
          .foregroundColor(Color(hex: "ffd700"))
          .font(.system(size: 24))
      }

      // Name
      Text(player.name)
        .font(.system(size: 32, weight: .semibold))
        .foregroundColor(.white)
        .frame(maxWidth: .infinity, alignment: .leading)

      // Player number badge
      Text("#\(player.number)")
        .font(.system(size: 22, weight: .bold))
        .foregroundColor(Color(hex: "646cff"))
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color(hex: "646cff").opacity(0.15))
        .cornerRadius(9999)
    }
    .padding(.horizontal, 20)
    .padding(.vertical, 16)
    .background(rowBackground)
    .cornerRadius(16)
    .overlay(
      RoundedRectangle(cornerRadius: 16)
        .stroke(rowBorder, lineWidth: 2)
    )
  }

  var rowBackground: Color {
    if isHost {
      return Color(hex: "ffd700").opacity(0.15)
    } else if player.isConnected {
      return Color.white.opacity(0.06)
    } else {
      return Color.white.opacity(0.03)
    }
  }

  var rowBorder: Color {
    player.isConnected
      ? Color(hex: "4ade80").opacity(0.2)
      : Color.white.opacity(0.05)
  }
}
```

---

## 6. Content Templates

### 6.1 Clue Text Format

**Structure:**

```
[Point Value] — [Ledtråd Text]

Example:
10 poäng — Detta land har flest invånare i Europa.
```

**Guidelines:**

- Keep text under 4 lines (tvOS), 5 lines (Web/iOS)
- Use active voice
- No spoilers in early clues
- Difficulty progression: vague → specific

---

### 6.2 Followup Question Format

**Open-ended:**

```
Vad heter huvudstaden i [destination]?
```

**Multiple-choice:**

```
Vilket år grundades [destination]?

A) 1850
B) 1900
C) 1950
D) 2000
```

**Guidelines:**

- Keep question under 3 lines (tvOS), 4 lines (Web/iOS)
- Options: 4 max (A-D)
- Clear correct answer (no ambiguity)

---

### 6.3 Destination Reveal Format

**Structure:**

```
Label: "Destinationen är..."
Name: [City Name]
Country: [Country Name]

Example:
Destinationen är...
PARIS
Frankrike
```

---

## 7. Token Migration Map

### 7.1 Old → New Token Names

This section helps migrate from old token names to the new design system.

#### Colors

| Old Token | New Token | Notes |
|-----------|-----------|-------|
| `--bg-primary` | `BG-0` | Gradient background |
| `--bg-card` | `BG-1` | Card background |
| `--bg-card-hover` | `BG-1-hover` | Interactive hover |
| `--accent-blue` | `ACCENT-blue` | Primary blue |
| `--accent-blue-bright` | `ACCENT-blue-bright` | Hover/TV blue |
| `--success-green` | `ACCENT-green` / `SUCCESS` | Green (correct) |
| `--error-red` | `ACCENT-red` / `ERROR` | Red (incorrect/brake) |
| `--gold` | `ACCENT-gold` | Gold (rank #1) |
| `--text-primary` | `TEXT-primary` | Main text |
| `--text-secondary` | `TEXT-secondary` | Secondary text |
| `--text-muted` | `TEXT-muted` | Muted labels |
| `--accent-blue-glow` | `GLOW-blue` | Blue glow effect |
| `--success-glow` | `GLOW-green` | Green glow effect |
| `--error-glow` | `GLOW-red` | Red glow effect |
| `--brake-glow` | `GLOW-brake` | Brake button glow |

#### Typography

| Old Token | New Token | Notes |
|-----------|-----------|-------|
| Page title (h1) | `TYPE-hero` | 2.8rem / 90pt |
| Section title (h2) | `TYPE-h1` | 2.0rem / 64pt |
| Subsection (h3) | `TYPE-h2` | 1.5rem / 54pt |
| Clue text | `TYPE-clue` | 1.8rem / 72pt |
| Clue points | `TYPE-clue-points` | 4.0rem / 120pt |
| Body text | `TYPE-body` | 1.0rem / 36pt |
| Body large | `TYPE-body-large` | 1.1rem / 48pt |
| Label | `TYPE-label` | 0.9rem / 26pt |
| Small text | `TYPE-small` | 0.85rem / 28pt |
| Score numbers | `TYPE-score` | 1.2rem / 38pt (tabular) |
| Button text | `TYPE-button` | 1.4rem / 48pt |

#### Spacing

| Old Token | New Token | Notes |
|-----------|-----------|-------|
| `4px` | `SPACE-xs` | Tight spacing |
| `8px` | `SPACE-sm` | Small gaps |
| `16px` | `SPACE-md` | Default spacing |
| `24px` | `SPACE-lg` | Section spacing |
| `32px` | `SPACE-xl` | Major separation |
| `48px` | `SPACE-2xl` | Full-screen padding |

#### Border Radius

| Old Token | New Token | Notes |
|-----------|-----------|-------|
| `4px` | `RADIUS-sm` | Small pills |
| `8px` | `RADIUS-md` | Standard cards |
| `12px` | `RADIUS-lg` | Large cards |
| `16px` | `RADIUS-xl` | Prominent buttons |
| `9999px / 50%` | `RADIUS-full` | Circular |

#### Shadows

| Old Token | New Token | Notes |
|-----------|-----------|-------|
| Small shadow | `SHADOW-sm` | Subtle elevation |
| Medium shadow | `SHADOW-md` | Card elevation |
| Large shadow | `SHADOW-lg` | Prominent elements |
| Text shadow | `SHADOW-text` | Text readability |

---

## 8. Implementation Notes

### 8.1 CSS Custom Properties (Web)

Add to root stylesheet:

```css
:root {
  /* Colors */
  --bg-0: linear-gradient(135deg, #0a0a14 0%, #12121e 100%);
  --bg-1: rgba(30, 30, 46, 0.9);
  --bg-1-hover: rgba(40, 40, 60, 0.95);
  --bg-overlay: rgba(18, 18, 30, 0.9);

  --accent-blue: #646cff;
  --accent-blue-bright: #7c84ff;
  --accent-green: #4ade80;
  --accent-green-bright: #5ef294;
  --accent-red: #ff453a;
  --accent-red-bright: #ff5948;
  --accent-gold: #ffd700;
  --accent-orange: #ff8c42;
  --accent-mint: #5ef2cc;

  --text-primary: rgba(255, 255, 255, 0.95);
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.5);

  --glow-blue: 0 0 20px rgba(100, 108, 255, 0.4);
  --glow-green: 0 0 15px rgba(74, 222, 128, 0.5);
  --glow-red: 0 0 15px rgba(255, 69, 58, 0.5);
  --glow-brake: 0 0 30px rgba(255, 69, 58, 0.7);

  /* Typography */
  --font-heading: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.4);
  --shadow-text: 0 2px 4px rgba(0, 0, 0, 0.6);
}
```

---

### 8.2 SwiftUI Extensions (iOS/tvOS)

Create `DesignTokens.swift`:

```swift
import SwiftUI

// MARK: - Colors
extension Color {
  // Backgrounds
  static let bg0 = LinearGradient(colors: [Color(hex: "0a0a14"), Color(hex: "12121e")], startPoint: .topLeading, endPoint: .bottomTrailing)
  static let bg1 = Color(hex: "1e1e2e").opacity(0.9)
  static let bg1Hover = Color(hex: "28283c").opacity(0.95)
  static let bgOverlay = Color(hex: "12121e").opacity(0.9)

  // Accents
  static let accentBlue = Color(hex: "646cff")
  static let accentBlueBright = Color(hex: "7c84ff")
  static let accentGreen = Color(hex: "4ade80")
  static let accentGreenBright = Color(hex: "5ef294")
  static let accentRed = Color(hex: "ff453a")
  static let accentRedBright = Color(hex: "ff5948")
  static let accentGold = Color(hex: "ffd700")
  static let accentOrange = Color(hex: "ff8c42")
  static let accentMint = Color(hex: "5ef2cc")

  // Text
  static let textPrimary = Color.white.opacity(0.95)
  static let textSecondary = Color.white.opacity(0.7)
  static let textMuted = Color.white.opacity(0.5)

  // Hex initializer
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
      blue:  Double(b) / 255,
      opacity: Double(a) / 255
    )
  }
}

// MARK: - Spacing
extension CGFloat {
  static let spaceXS: CGFloat = 8 // tvOS: 2x web
  static let spaceSM: CGFloat = 16
  static let spaceMD: CGFloat = 40
  static let spaceLG: CGFloat = 60
  static let spaceXL: CGFloat = 80
  static let space2XL: CGFloat = 120
}

// MARK: - Border Radius
extension CGFloat {
  static let radiusSM: CGFloat = 8
  static let radiusMD: CGFloat = 16
  static let radiusLG: CGFloat = 24
  static let radiusXL: CGFloat = 32
}

// MARK: - Typography
extension Font {
  // Headings
  static let typeHero = Font.system(size: 90, weight: .black, design: .rounded)
  static let typeH1 = Font.system(size: 64, weight: .bold, design: .rounded)
  static let typeH2 = Font.system(size: 54, weight: .bold, design: .rounded)
  static let typeClue = Font.system(size: 72, weight: .bold, design: .rounded)
  static let typeCluePoints = Font.system(size: 120, weight: .black, design: .rounded)

  // Body
  static let typeBodyLarge = Font.system(size: 48, weight: .regular, design: .default)
  static let typeBody = Font.system(size: 36, weight: .regular, design: .default)
  static let typeBodyBold = Font.system(size: 38, weight: .semibold, design: .default)
  static let typeLabel = Font.system(size: 26, weight: .semibold, design: .default)
  static let typeSmall = Font.system(size: 28, weight: .regular, design: .default)
  static let typeScore = Font.system(size: 38, weight: .bold, design: .monospaced)
  static let typeButton = Font.system(size: 48, weight: .bold, design: .rounded)
}
```

---

### 8.3 Accessibility

#### Reduced Motion

**Web:**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**SwiftUI:**

```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion

var animation: Animation? {
  reduceMotion ? nil : .easeOut(duration: 0.8)
}
```

#### Color Contrast

- All text meets WCAG AA (4.5:1 minimum)
- Focus indicators: Visible blue outline (ACCENT-blue)
- Error states: Red with text label (not color-only)

#### Keyboard Navigation

- All interactive elements accessible via Tab/Enter (Web)
- Siri Remote navigation (tvOS)
- VoiceOver support (iOS/tvOS)

---

## 9. Cross-References

### Related Documentation

- **Brand Guide:** `/Users/oskar/pa-sparet-party/docs/brand-guide.md` — Brand identity, voice & tone
- **Web Redesign Spec:** `/Users/oskar/pa-sparet-party/docs/web-redesign-spec.md` — Web-specific implementation
- **tvOS Redesign Spec:** `/Users/oskar/pa-sparet-party/docs/tvos-redesign-spec.md` — tvOS-specific implementation
- **Design Decisions:** `/Users/oskar/pa-sparet-party/docs/design-decisions.md` — Platform deviations & rationale
- **Contracts:** `/Users/oskar/pa-sparet-party/contracts/` — Event/state schema (design integration points)

### Implementation Files

**Web:**
- `/Users/oskar/pa-sparet-party/apps/web-player/src/index.css` — Root CSS variables
- `/Users/oskar/pa-sparet-party/apps/web-player/src/components/` — Component implementations

**tvOS:**
- `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/Design/` — Design token files
- `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/Views/` — View implementations

**iOS Host:**
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparetHost/Design/` — Design token files (TBD)
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparetHost/Views/` — View implementations (TBD)

---

## 10. Changelog

### v1.0 (2026-02-06)

- Initial design system documentation
- Unified token library (colors, typography, spacing, radius, shadows)
- Component specifications (brake button, scoreboard, clue display, answer form, destination reveal, followup result overlay, timer components)
- Motion & feedback library (keyframes, timing, transitions)
- Platform-specific guidelines (Web, tvOS, iOS)
- QR + lobby specifications
- Content templates
- Token migration map (old → new)
- Implementation notes (CSS variables, SwiftUI extensions, accessibility)
- Cross-references to related documentation

---

**END OF DOCUMENT**
