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

| Token | Value | Usage |
|-------|-------|-------|
| Accent blue | `#646cff` | Headings, highlights, own-player borders |
| Correct green | `#4ade80` / bg `rgba(74,222,128,0.2)` | Correct-answer badges |
| Incorrect red | `#f87171` / bg `rgba(248,113,113,0.15)` | Incorrect-answer badges |
| Overlay backdrop | `rgba(18,18,30,0.85)` | Full-screen result overlays |
| Own-player highlight | border-left 3 px `#646cff`, bg `rgba(100,108,255,0.15)` | Current player row in any result list |

**Typography hierarchy (followup-result overlay)**

| Role | Size | Weight |
|------|------|--------|
| Correct-answer heading | 1.8 rem | 700 |
| Player name | 1 rem | 600 |
| Player answer / verdict | 1 rem / 0.9 rem | 400 / 700 |

**Result-row layout**

Each player row is a horizontal flex strip: `[name (flex 1)] [answer (flex 1)]
[verdict badge]`.  Badge is a small pill with rounded corners (4 px radius) and
a single-line label ("Rätt" or "Fel").  Points are appended to the badge text
when non-zero ("+2p").

**Followup-incoming block (destination-reveal pause)**

Centered italic text, `1.05 rem`, opacity 0.7.  No border or background -- it
is a quiet, non-intrusive nudge that the next phase is coming.  tvOS can mirror
this as a subtitle line below the scoreboard.
