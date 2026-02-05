# Web Player Redesign Spec — Game Show Experience

**Date:** 2026-02-05
**Designer:** Web-designer agent
**Goal:** Transform web-player from functional to professional game-show experience with bold visuals, smooth animations, and engaging interactions.

---

## Design Principles

1. **Bold & Punchy:** High contrast, saturated colors, large typography
2. **Animated & Alive:** Smooth transitions, attention-grabbing pulses, tactile feedback
3. **Hierarchy:** Clear visual distinction between primary actions and secondary info
4. **Energy:** Game show vibe — exciting, fast-paced, TV-quality polish

---

## 1. Färgpalette (Color Palette)

### Core Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `linear-gradient(135deg, #0a0a14 0%, #12121e 100%)` | Main page background (gradient for depth) |
| `--bg-card` | `rgba(30, 30, 46, 0.9)` | Card/section backgrounds |
| `--bg-card-hover` | `rgba(40, 40, 60, 0.95)` | Interactive card hover state |
| `--accent-blue` | `#646cff` | Primary accent (headings, highlights, buttons) |
| `--accent-blue-bright` | `#7c84ff` | Hover state for accent blue |
| `--accent-blue-glow` | `0 0 20px rgba(100, 108, 255, 0.4)` | Blue glow effect |
| `--success-green` | `#4ade80` | Correct answers, positive states |
| `--success-glow` | `0 0 15px rgba(74, 222, 128, 0.5)` | Green glow effect |
| `--error-red` | `#ff453a` | Wrong answers, errors |
| `--error-glow` | `0 0 15px rgba(255, 69, 58, 0.5)` | Red glow effect |
| `--warning-yellow` | `#fbbf24` | Timer warnings, brake states |
| `--brake-active` | `#ff453a` | Active brake button |
| `--brake-glow` | `0 0 30px rgba(255, 69, 58, 0.7)` | Brake button glow |
| `--gold` | `#ffd700` | Top rank highlight |
| `--text-primary` | `rgba(255, 255, 255, 0.95)` | Main text |
| `--text-secondary` | `rgba(255, 255, 255, 0.7)` | Secondary text |
| `--text-muted` | `rgba(255, 255, 255, 0.5)` | Muted labels |

### Semantic Usage

- **Backgrounds:** Gradient primary with overlay cards for content sections
- **Accents:** Blue for interactive elements, green for success, red for errors/brake
- **Glows:** Used liberally on active/important elements (brake button, top rank, hover states)
- **Contrast:** Ensure 4.5:1 minimum on all text, push higher for game-show impact

---

## 2. Typografi (Typography)

### Font Stack

```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&family=Inter:wght@300;400;600;700&display=swap');

--font-heading: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
--font-body: 'Inter', system-ui, -apple-system, sans-serif;
```

### Typography Hierarchy

| Element | Font | Size | Weight | Letter Spacing | Usage |
|---------|------|------|--------|----------------|-------|
| **Page Title (h1)** | Montserrat | 2.8rem | 900 | -0.02em | Landing page, major headings |
| **Section Title (h2)** | Montserrat | 2rem | 700 | -0.01em | Destination reveal, phase titles |
| **Subsection (h3)** | Montserrat | 1.5rem | 700 | 0 | Scoreboard, form labels |
| **Clue Text** | Montserrat | 1.8rem | 700 | 0 | Clue display (center-aligned) |
| **Clue Points** | Montserrat | 4rem | 900 | -0.03em | Point value display |
| **Body Text** | Inter | 1.1rem | 400 | 0 | Standard text, descriptions |
| **Label** | Inter | 0.9rem | 600 | 0.05em | Metadata, timestamps |
| **Small Text** | Inter | 0.85rem | 400 | 0 | Hints, fine print |
| **Score Numbers** | Inter | 1.2rem | 700 | 0 | Scoreboard points (tabular-nums) |
| **Button Text** | Montserrat | 1.4rem | 700 | 0.05em | Primary CTAs |

### Special Styles

- **Tabular Numbers:** All score/timer displays use `font-variant-numeric: tabular-nums;`
- **Uppercase:** Button labels use `text-transform: uppercase;`
- **Center Alignment:** Clue text, destination reveal, results always centered

---

## 3. Animationer (Animations)

### Keyframes Library

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

### Animation Usage Map

| Element | Animation | Duration | Easing | Trigger |
|---------|-----------|----------|--------|---------|
| **Clue text** | fadeInUp | 0.6s | ease-out | CLUE_PRESENT |
| **Clue points** | scalePop | 0.5s | cubic-bezier(0.34, 1.56, 0.64, 1) | CLUE_PRESENT |
| **Brake button (active)** | pulse + glowPulse | 1.5s | ease-in-out | phase === CLUE_LEVEL |
| **Brake rejected** | shake | 0.4s | ease-out | BRAKE_REJECTED |
| **Answer locked** | fadeInUp | 0.5s | ease-out | BRAKE_ANSWER_LOCKED |
| **Scoreboard rows** | fadeInUp + stagger | 0.4s | ease-out | SCOREBOARD_UPDATE |
| **Scoreboard top rank** | pulse (subtle) | 2s | ease-in-out | rank === 1 |
| **Own scoreboard row (update)** | pulse (once) | 0.8s | ease-out | score change |
| **Result overlay** | slideInFromTop | 0.4s | ease-out | DESTINATION_RESULTS |
| **Followup timer bar** | width transition | 0.5s | linear | timer tick |
| **Notification toast** | fadeInUp + fadeOutUp | 2.5s | ease | transient messages |

### Transition Standards

- **Default transition:** `all 0.2s ease-out` — applies to hover/focus states
- **Transform transitions:** `transform 0.15s ease-out` — for scale/translate
- **Color transitions:** `background 0.2s ease, border-color 0.2s ease, color 0.2s ease`
- **No animation on reconnect:** Skip entry animations when rendering from STATE_SNAPSHOT

---

## 4. Components

### 4.1 Brake Button

**Visual Design:**
- **Size (active):** 80% width, max 450px, height 140px
- **Shape:** Rounded rectangle (border-radius: 16px)
- **Color (active):** Red gradient (`linear-gradient(135deg, #ff453a 0%, #e03528 100%)`)
- **Color (disabled):** Grey (`rgba(100, 100, 120, 0.25)`)
- **Border:** 4px solid with subtle white glow when active
- **Text:** "BROMS" (uppercase, Montserrat 900, 2.2rem, white)
- **Glow:** Continuous red glow pulse when active
- **Animation:** Continuous pulse (scale 1 → 1.05 → 1) + glow pulse

**Interaction States:**
- **Active:** Pulsing, glowing, cursor pointer
- **Hover:** Scale 1.02, brighter glow
- **Active (press):** Scale 0.95, max glow
- **Disabled:** No animation, opacity 0.4, cursor not-allowed

**CSS Example:**
```css
.brake-button {
  width: 80%;
  max-width: 450px;
  height: 140px;
  font-family: var(--font-heading);
  font-size: 2.2rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 16px;
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

.brake-button:not(:disabled):hover {
  transform: scale(1.02);
}

.brake-button:not(:disabled):active {
  transform: scale(0.95);
  box-shadow: 0 0 50px rgba(255, 69, 58, 1);
}

.brake-button:disabled {
  background: rgba(100, 100, 120, 0.25);
  color: rgba(255, 255, 255, 0.4);
  cursor: not-allowed;
  border-color: transparent;
}
```

### 4.2 Scoreboard

**Visual Design:**
- **Layout:** Ordered list with counter-based rank numbers
- **Row spacing:** 0.6rem gap between rows
- **Row padding:** 1rem vertical, 1.25rem horizontal
- **Row background:** `rgba(255, 255, 255, 0.06)` base, gradient for top rank
- **Row border-radius:** 8px
- **Rank number:** Bold, left-aligned with auto-counter
- **Player name:** Flex 1, semibold (Inter 600)
- **Score:** Tabular numbers, bold, accent blue

**Special States:**
- **Top rank (#1):** Gold gradient background + gold left border
  ```css
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(100, 108, 255, 0.12) 100%);
  border-left: 4px solid gold;
  ```
- **Own entry:** Blue border-left + blue tinted background
  ```css
  border-left: 3px solid var(--accent-blue);
  background: rgba(100, 108, 255, 0.18);
  ```
- **Rank change animation:** When rank changes, row slides with `transition: all 0.4s ease-out`
- **Score update animation:** When own score updates, pulse once (`animation: pulse 0.8s ease-out`)

**Points delta (+X animation):**
- When own score increases, show floating "+X p" that fades out upward
- Position: absolute, right aligned
- Animation: fadeOutUp over 1.2s
- Color: success green

**CSS Example:**
```css
.scoreboard-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  transition: all 0.4s ease-out;
  animation: fadeInUp 0.4s ease-out;
}

.scoreboard-row.rank-1 {
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(100, 108, 255, 0.12) 100%);
  border-left: 4px solid gold;
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

### 4.3 Clue Display

**Visual Design:**
- **Layout:** Vertical flex, centered
- **Points:** Huge, bold, accent blue (4rem, Montserrat 900)
- **Text:** Large, bold, center-aligned (1.8rem, Montserrat 700)
- **Background:** Card with subtle gradient overlay
- **Padding:** Generous (2rem all sides)
- **Border:** Subtle glow around card

**Animation:**
- **Points:** scalePop on appear
- **Text:** fadeInUp on appear (delayed by textRevealAfterMs)

**CSS Example:**
```css
.clue-display {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2.5rem 1.5rem;
  background: rgba(30, 30, 46, 0.9);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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

### 4.4 Answer Form

**Visual Design:**
- **Input:** Large, rounded, accent border on focus
- **Button:** Primary blue, bold text, full width
- **Spacing:** 1rem gap between input and button

**Interaction:**
- **Focus state:** Blue glow around input
- **Submit hover:** Brighter blue + subtle scale
- **Submit active:** Scale down (tactile feedback)
- **Disabled:** Opacity 0.4, no interaction

**CSS Example:**
```css
.answer-form input {
  padding: 1rem 1.25rem;
  font-size: 1.2rem;
  font-family: var(--font-body);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.answer-form input:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: var(--accent-blue-glow);
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
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
}

.answer-form button:hover:not(:disabled) {
  background: var(--accent-blue-bright);
  transform: scale(1.02);
}

.answer-form button:active:not(:disabled) {
  transform: scale(0.97);
}
```

### 4.5 Result Overlay (Followup Results)

**Visual Design:**
- **Overlay:** Full-screen fixed, dark translucent backdrop
- **Content:** Centered card, max-width 540px
- **Correct answer:** Large, bold, accent blue (1.8rem)
- **Player rows:** Horizontal flex, name + answer + verdict badge
- **Own row:** Blue outline box-shadow
- **Correct row:** Green left border
- **Incorrect row:** Red left border

**Animation:**
- **Overlay:** slideInFromTop on appear
- **Rows:** Staggered fadeInUp (0.1s delay per row)

**CSS Example:**
```css
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

### 4.6 Destination Reveal

**Visual Design:**
- **Layout:** Centered vertical stack
- **Label:** Small, muted ("Det var...")
- **Name:** Huge, bold, accent blue (2.8rem, Montserrat 900)
- **Country:** Medium, secondary opacity (1.5rem)

**Animation:**
- **Label:** fadeInUp (0.3s)
- **Name:** scalePop (0.5s, delayed 0.2s)
- **Country:** fadeInUp (0.4s, delayed 0.4s)

**CSS Example:**
```css
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

## 5. Responsive Behavior

### Mobile (< 480px)
- Brake button: height 120px, font-size 1.8rem
- Clue points: 3rem
- Clue text: 1.4rem
- Destination name: 2.2rem
- Scoreboard rows: padding 0.85rem, font-size 0.95rem

### Tablet (480px - 768px)
- No adjustments needed (default sizes work well)

### Desktop (> 768px)
- Container max-width: 600px (enforced by existing .container)
- Center all content horizontally

---

## 6. Accessibility Considerations

- **Color contrast:** All text meets WCAG AA (4.5:1 minimum)
- **Focus indicators:** Visible blue outline on all interactive elements
- **Reduced motion:** Respect `prefers-reduced-motion` media query
  ```css
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- **Semantic HTML:** Proper heading hierarchy, button/link semantics
- **Keyboard navigation:** All interactions accessible via keyboard

---

## 7. Implementation Checklist

- [ ] Import Google Fonts (Montserrat + Inter)
- [ ] Add CSS custom properties for all color/font tokens
- [ ] Implement all keyframe animations
- [ ] Update BrakeButton component with new styles + animations
- [ ] Update Scoreboard component with rank highlighting + animations
- [ ] Update ClueDisplay with new typography + animations
- [ ] Update AnswerForm with better input styling
- [ ] Update result overlays with new animations
- [ ] Add reduced-motion media query
- [ ] Update all button styles for consistent tactile feedback
- [ ] Test on mobile, tablet, desktop
- [ ] Verify all animations feel smooth (no jank)

---

## 8. Testing Notes

**Visual QA:**
- Brake button should feel URGENT and TACTILE
- Scoreboard should feel ALIVE (animations on updates)
- Clue reveals should feel DRAMATIC (scalePop + fadeIn)
- All transitions should be SMOOTH (60fps target)

**Performance:**
- No jank on animation triggers
- CSS animations preferred over JS (better performance)
- Use `will-change` sparingly (only on actively animating elements)

**Cross-device:**
- Test on iPhone SE (small screen edge case)
- Test on iPad (tablet mid-size)
- Test on desktop (max-width enforcement)

---

**END OF SPEC**
