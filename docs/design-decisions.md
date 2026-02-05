# Design Decisions — Pa Spåret UI/UX

## Followup-result overlay

- **Duration**: Visible from the moment FOLLOWUP_RESULTS arrives until the next
  FOLLOWUP_QUESTION_PRESENT replaces it.  Backend holds a 4 s pause between the
  two events; the overlay therefore stays for the full 4 s without any
  client-side timer.  No auto-dismiss -- the overlay disappears exactly when the
  next question arrives.
- **Layout**: Full-viewport overlay (position fixed, covers the question card
  behind it).  Top section: correct answer in large, bold type.  Below:
  per-player result rows, each showing name, submitted answer, a
  correct/incorrect badge and points awarded.  Own row is visually highlighted
  with the accent border (same pattern used in the scoreboard `.my-entry` rule).
- **Visual style**: Re-uses the existing palette.
  - Correct: `#4ade80` border + `rgba(74,222,128,0.2)` background (matches
    `.result-correct`).
  - Incorrect: `#f87171` border + `rgba(248,113,113,0.15)` background (matches
    `.result-incorrect`).
  - Overlay backdrop: `rgba(18,18,30,0.85)` -- dark, slightly translucent,
    lets the underlying page bleed through just enough to avoid a jarring
    hard-cut.
  - Accent / highlight color: `#646cff` (primary blue, used throughout).
  - Typography: correct-answer heading at `1.8 rem` bold; player rows at
    `1 rem`; verdict badges at `0.9 rem` bold.

## Destination-reveal pause (innan första followup)

- **Vad som visas**: During the SCOREBOARD phase that follows DESTINATION_RESULTS
  -- i.e. the window where the backend plays the "Nu ska vi se vad ni kan om
  {X}" TTS clip on TV -- the player screen shows:
    1. The already-revealed destination name + country (already rendered by
       RevealPage).
    2. The scoreboard (already rendered by RevealPage).
    3. A new "followup-incoming" block: italic text "Frågor om {destination}
       väntar..." placed between the scoreboard and the bottom edge.  This
       replaces the blank dead-air that existed before.
- **Triggering condition**: `phase === 'SCOREBOARD'` AND
  `destination.revealed === true` AND `destination.name` is present.  The
  condition is intentionally narrow -- it must not fire during FINAL_RESULTS or
  any other scoreboard display.
- **Duration**: Entirely server-controlled.  The block stays visible as long as
  the phase remains SCOREBOARD.  When FOLLOWUP_QUESTION_PRESENT arrives the
  phase flips to FOLLOWUP_QUESTION, RevealPage navigates to `/game`, and the
  block disappears.  No client timer involved.
- **Text source**: `gameState.destination.name` -- already populated for all
  roles after DESTINATION_REVEAL per projections.md.

## Delad spec för tvos-designer

These are the decisions tvOS should sync against when laying out equivalent
screens on the big display.

### Core Design Tokens (Web Redesign 2026-02-05)

**Color Palette:**

| Token | Value | Usage |
|-------|-------|-------|
| Background primary | `linear-gradient(135deg, #0a0a14 0%, #12121e 100%)` | Main page background |
| Background card | `rgba(30, 30, 46, 0.9)` | Card/section backgrounds |
| Accent blue | `#646cff` | Primary accent (headings, highlights, buttons) |
| Accent blue bright | `#7c84ff` | Hover states |
| Accent blue glow | `0 0 20px rgba(100, 108, 255, 0.4)` | Blue glow effect |
| Success green | `#4ade80` | Correct answers, positive states |
| Success glow | `0 0 15px rgba(74, 222, 128, 0.5)` | Green glow effect |
| Error red | `#ff453a` | Wrong answers, errors, brake button |
| Error glow | `0 0 15px rgba(255, 69, 58, 0.5)` | Red glow effect |
| Gold | `#ffd700` | Top rank (#1) highlight |
| Text primary | `rgba(255, 255, 255, 0.95)` | Main text |
| Text secondary | `rgba(255, 255, 255, 0.7)` | Secondary text |
| Text muted | `rgba(255, 255, 255, 0.5)` | Muted labels |

**Typography (Game Show Style):**

| Role | Font | Size | Weight | Usage |
|------|------|------|--------|-------|
| Page title (h1) | Montserrat | 2.8rem | 900 | Landing page, major headings |
| Section title (h2) | Montserrat | 2rem | 700 | Destination reveal, phase titles |
| Subsection (h3) | Montserrat | 1.5rem | 700 | Scoreboard, form labels |
| Clue text | Montserrat | 1.8rem | 700 | Clue display (center-aligned) |
| Clue points | Montserrat | 4rem | 900 | Point value display |
| Body text | Inter | 1.1rem | 400 | Standard text, descriptions |
| Score numbers | Inter | 1.2rem | 700 | Scoreboard points (tabular-nums) |
| Button text | Montserrat | 1.4rem | 700 | Primary CTAs (uppercase) |

**Legacy tokens (still valid):**

| Token | Value | Usage |
|-------|-------|-------|
| Correct green (legacy) | `#4ade80` / bg `rgba(74,222,128,0.2)` | Correct-answer badges |
| Incorrect red (legacy) | `#f87171` / bg `rgba(248,113,113,0.15)` | Incorrect-answer badges |
| Overlay backdrop | `rgba(18,18,30,0.9)` | Full-screen result overlays (darkened) |
| Own-player highlight | border-left 3 px `#646cff`, bg `rgba(100,108,255,0.18)` | Current player row in any result list |

**Typography hierarchy (followup-result overlay):**

| Role | Size | Weight |
|------|------|--------|
| Correct-answer heading | 2 rem | 700 |
| Player name | 1 rem | 600 |
| Player answer / verdict | 1 rem / 0.9 rem | 400 / 700 |

**Animations & Transitions (Web Redesign 2026-02-05):**

| Name | CSS Keyframe | Duration | Easing | Usage |
|------|--------------|----------|--------|-------|
| pulse | `scale(1) → scale(1.05) → scale(1)` | 1.5s | ease-in-out | Brake button (active), top rank |
| fadeInUp | `translateY(10px) opacity(0) → translateY(0) opacity(1)` | 0.4-0.6s | ease-out | Content reveals |
| scalePop | `scale(0.8) → scale(1.05) → scale(1)` | 0.5s | cubic-bezier(0.34, 1.56, 0.64, 1) | Dramatic reveals (destination, clue points) |
| glowPulse | `box-shadow pulse` | 1.5s | ease-in-out | Brake button glow |
| shake | `translateX(-8px) → translateX(8px)` | 0.4s | ease-out | Brake rejection |
| slideInFromTop | `translateY(-30px) → translateY(0)` | 0.4s | ease-out | Overlays |

**Scoreboard Highlights:**
- **Top rank (#1):** Gold gradient background (`linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(100, 108, 255, 0.12) 100%)`), gold left border (4px), subtle pulse animation
- **Own entry:** Blue tinted background (`rgba(100, 108, 255, 0.18)`), blue left border (3px)
- **Own entry + top rank:** Combined gold gradient with blue box-shadow
- **Rank transitions:** Smooth 0.4s ease-out transitions when rank changes

**Brake Button:**
- **Active state:** Red gradient background (`linear-gradient(135deg, #ff453a 0%, #e03528 100%)`), continuous pulse + glow pulse animations
- **Size:** 80% width, max 450px, height 140px
- **Hover:** Scale 1.02, enhanced glow
- **Press:** Scale 0.95, max glow
- **Disabled:** Grey (`rgba(100, 100, 120, 0.25)`), no animations

**Result-row layout**

Each player row is a horizontal flex strip: `[name (flex 1)] [answer (flex 1)]
[verdict badge]`.  Badge is a small pill with rounded corners (4 px radius) and
a single-line label ("Rätt" or "Fel").  Points are appended to the badge text
when non-zero ("+2p").

**Followup-incoming block (destination-reveal pause)**

Centered italic text, `1.05 rem`, opacity 0.7.  No border or background -- it
is a quiet, non-intrusive nudge that the next phase is coming.  tvOS can mirror
this as a subtitle line below the scoreboard.

### tvOS deviations (logged 2026-02-05)

1. **ResultsOverlay — answerText column omitted.**  The web spec includes a
   per-player "submitted answer" column in the result rows.  The server does not
   forward `answerText` to the TV projection (see `GameModels.FollowupResultRow`
   — intentional security boundary).  The TV overlay therefore shows only
   `[name] [verdict badge + points]`.  The verdict pill itself carries the
   points suffix (e.g. "Rätt +2p") so information density remains equivalent
   without leaking free-text answers.

2. **Typography scaling.**  Web rem values are mapped to tvOS point sizes at
   roughly 36 pt per rem to fill the 1920x1080 / 2560x1440 TV viewport:
   `1.8 rem` correct-answer heading -> 64 pt bold; player name -> 32 pt
   semibold; verdict badge -> 26 pt bold.  These exceed the web px values but
   are necessary for comfortable read distance on a shared living-room screen.

3. **Followup-incoming banner size.**  Web spec: `1.05 rem`.  tvOS: 38 pt
   light-weight italic -- same visual weight ratio to the scoreboard rows as
   the web version achieves against its own row text.

---

## tvOS Redesign Implementation (2026-02-05)

Full specification: `/Users/oskar/pa-sparet-party/docs/tvos-redesign-spec.md`

Design system files: `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/Design/`

### Typography Scaling (36 pt/rem)

| Web Size | tvOS Size | Usage |
|----------|-----------|-------|
| 2.8rem (Montserrat 900) | 90 pt (system black rounded) | Game show headings |
| 2.0rem (Montserrat 700) | 64 pt (system heavy rounded) | Subheadings, correct answer |
| 1.8rem (Montserrat 700) | 72 pt (system bold rounded) | Clue text |
| 1.1rem (Inter 400) | 36 pt (system regular) | Body text |
| 1.0rem (Inter 600) | 38 pt (system semibold) | Scoreboard names/points |
| 0.7rem (Inter 300) | 26 pt (system light) | Labels, metadata |

### Animation Timing (+0.2-0.3s for TV)

| Element | Web | tvOS | Easing |
|---------|-----|------|--------|
| Clue text fade | 0.6s | 0.8s | easeOut |
| Clue background | 0.4s | 0.6s | easeOut |
| Destination reveal | 0.8s | 1.0s | easeOut |
| Scoreboard slide | 0.4s | 0.5s | easeInOut |
| Points update | 1.2s | 1.5s | easeOut |
| Results overlay | 0.4s | 0.6s | easeOut |
| Question fade | 0.6s | 0.8s | easeOut |
| Brake banner | 0.3s | 0.4s | easeOut |

### Shadow/Glow (2x size for TV)

- Web box-shadow: 20px
- tvOS shadow radius: **40 pt** (2x)
- Text shadows: 4 pt radius, 60% opacity
- Badge/element shadows: 10-20 pt radius

### Color Contrast (brighter variants)

| Token | Web | tvOS Bright | Delta |
|-------|-----|-------------|-------|
| accentBlue | #646cff | #787fff | +20% |
| successGreen | #4ade80 | #5ef294 | +20% |
| errorRed | #ff453a | #ff5948 | Slightly brighter |

### Layout Spacing (more air for TV)

| Property | Web | tvOS |
|----------|-----|------|
| Horizontal padding | 20-40 px | 80 pt |
| Vertical padding | 16-32 px | 60 pt |
| Card padding | 16-24 px | 40 pt |
| Element spacing | 16-24 px | 48 pt |

### Key Deviations

1. **System fonts only:** Web uses Montserrat/Inter; tvOS uses system fonts with equivalent weights
2. **No hover states:** TV has no mouse; focus states only (Siri Remote)
3. **Higher opacity:** Secondary text 0.9 (vs web 0.7) for readability
4. **Larger touch targets:** 80x80 pt minimum (Apple TV HIG)
5. **Animated rank changes:** Scoreboard rows slide (0.5s) on rank change
6. **Winner highlight:** Gold border (6 pt) + background (15% opacity) + glow
7. **Clue background stagger:** Background fades in 0.6s, then text 0.8s with 0.2s delay
8. **Brake banner slide:** Slides up from bottom (0.4s) with glow
9. **Round intro pulse:** Continuous 2.0s cycle (scale + opacity)

**Last updated:** 2026-02-05 (redesign implementation)
