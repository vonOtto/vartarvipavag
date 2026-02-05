# tvOS Lobby Redesign - Test Checklist

**Date:** 2026-02-05
**Component:** LobbyView redesign
**Status:** Ready for testing

---

## Visual Verification

### Title & Branding

- [ ] Game show title "PÅ SPÅRET" displays in large bold font (96 pt)
- [ ] Title has gradient effect (blue-to-blue gradient visible)
- [ ] Title has glow/shadow effects (subtle blue glow around text)
- [ ] Title animates with breathing effect (subtle scale + opacity pulse, 2s cycle)
- [ ] Subtitle "PARTY EDITION" displays below title (28 pt, letter-spaced)

### Background

- [ ] Background shows gradient from dark to slightly lighter dark
- [ ] Gradient direction is top-left to bottom-right
- [ ] Background fills entire screen with no gaps

### QR Code Section

- [ ] QR code displays clearly at 320x320 pt
- [ ] QR code has white background with padding
- [ ] QR code card has dark semi-transparent background
- [ ] QR code has blue glow effect around card
- [ ] Join code displays below QR in large monospaced font (52 pt)
- [ ] Join code letters are spaced properly (e.g., "A  B  C  1  2  3")
- [ ] Join code is bright blue color (accentBlueBright)
- [ ] Instruction text displays below code
- [ ] Instruction text has two lines: heading + body

### Player List Section

- [ ] Section header shows "SPELARE" with proper styling
- [ ] Section header includes player count when players present
- [ ] Green pulse indicator shows next to header (when players present)
- [ ] Divider line appears below header
- [ ] Divider is subtle (white with low opacity)

### Host Display

- [ ] Host row displays when host is present
- [ ] Host has gold star icon (22 pt)
- [ ] Host name displays in gold color (34 pt semibold)
- [ ] "VÄRD" badge displays with capsule background
- [ ] Badge has gold tinted background
- [ ] Host row is visually distinct from player rows

### Player Rows

- [ ] Each player row has rounded card background (16 pt corners)
- [ ] Card has subtle white tinted background
- [ ] Connected players have brighter background than disconnected
- [ ] Connected players have green border highlight
- [ ] Connection indicator shows as 16 pt circle
- [ ] Connection indicator has correct color (green/gray based on status)
- [ ] Player name displays clearly (32 pt medium)
- [ ] Player number badge displays on right (#1, #2, etc.)
- [ ] Badge has capsule shape with blue tinted background
- [ ] Badge has 22 pt bold text

### Empty State

- [ ] When no players: large icon displays (person.2.badge.gearshape, 64 pt)
- [ ] "Väntar på spelare..." message displays below icon
- [ ] Empty state is centered in player area
- [ ] Colors are muted (low opacity)

### Status Indicators

**When no players:**
- [ ] Progress indicator (circular spinner) displays
- [ ] Text reads "Väntar på spelare att ansluta..."
- [ ] Container has capsule shape
- [ ] Background is subtle card color
- [ ] Text is 30 pt medium weight

**When players present:**
- [ ] Green checkmark icon displays (32 pt)
- [ ] Text reads "Redo att starta! Värden startar spelet."
- [ ] Container has green tinted background
- [ ] Container has green border (2 pt)
- [ ] Green glow effect visible around container
- [ ] Text is 30 pt semibold weight

### New Game Button

- [ ] "Ny spel" button displays in bottom-right corner
- [ ] Button has subtle styling (secondary style)
- [ ] Button has capsule shape
- [ ] Button padding is consistent (20 pt horizontal, 10 pt vertical)
- [ ] Button text is 26 pt light weight

### Reconnect Banner

**When disconnected:**
- [ ] Banner displays at top center of screen
- [ ] Circular progress indicator shows (scaled 0.6)
- [ ] Text reads "Återansluter..."
- [ ] Banner has red background (90% opacity)
- [ ] Red glow effect visible around banner
- [ ] Text is 24 pt semibold white

---

## Animation Verification

### Title Animation

- [ ] Title starts animating immediately on lobby load
- [ ] Animation is smooth and continuous (no stuttering)
- [ ] Scale changes are subtle (approximately 5% scale change)
- [ ] Opacity changes are subtle (visible but not jarring)
- [ ] Animation cycle is approximately 2 seconds
- [ ] Animation repeats infinitely

### Player Join Animations

**Player Card Entrance:**
- [ ] New player card scales up from 0.8 to 1.0
- [ ] Entrance includes opacity fade (0 to 1)
- [ ] Animation uses spring physics (bouncy feel)
- [ ] Animation duration is approximately 0.5s
- [ ] Multiple simultaneous joins animate smoothly

**Join Sparkles:**
- [ ] Sparkles appear when new player joins (not on initial load)
- [ ] Approximately 15 sparkle particles visible
- [ ] Sparkles burst outward from right side (player area)
- [ ] Sparkle colors include blue, green, gold, white
- [ ] Sparkles fade out as they move
- [ ] Sparkles scale slightly larger during animation
- [ ] Effect completes and disappears after ~1.5s
- [ ] Sparkles don't interfere with readability

### Connection Pulse

- [ ] Connected players show pulse ring animation
- [ ] Pulse ring expands from center (scale 1.0 to 1.4)
- [ ] Pulse ring fades out as it expands
- [ ] Pulse cycle is approximately 1.2s
- [ ] Pulse repeats continuously for connected players
- [ ] Disconnected players don't show pulse

### Section Header Pulse

- [ ] Green indicator pulses when players are present
- [ ] Pulse is subtle (not distracting)
- [ ] Indicator is static/dim when no players

---

## Interaction Verification

### Siri Remote Navigation

- [ ] Focus moves correctly between interactive elements
- [ ] "Ny spel" button is focusable
- [ ] Button highlights when focused
- [ ] Button activates on press

### Button Functionality

- [ ] "Ny spel" button triggers session reset
- [ ] Button press provides visual feedback
- [ ] App returns to launch screen after reset

---

## Layout Verification

### Spacing & Alignment

- [ ] Title is centered horizontally at top
- [ ] QR section and player section have consistent spacing (80 pt)
- [ ] QR section is left-aligned in its column
- [ ] Player section is left-aligned with max width constraint
- [ ] Status indicator is centered at bottom
- [ ] All padding is consistent with design spec

### Responsive Behavior

- [ ] Layout works on Apple TV HD (1920x1080)
- [ ] Layout works on Apple TV 4K (3840x2160)
- [ ] No text cutoff or overflow
- [ ] QR code is always fully visible
- [ ] Player list scrolls if many players (10+)

### Safe Areas

- [ ] Content respects safe area insets
- [ ] No content is cut off by TV bezel or overscan
- [ ] "Ny spel" button is not too close to edge

---

## Performance Verification

### Frame Rate

- [ ] Lobby maintains 60 fps with no players
- [ ] Lobby maintains 60 fps with 5 players
- [ ] Lobby maintains 60 fps with 10 players
- [ ] Player join sparkles don't cause frame drops
- [ ] Multiple simultaneous animations are smooth

### Memory

- [ ] No memory leaks when players join/leave repeatedly
- [ ] Memory usage is reasonable (<100 MB for lobby)

### Animation Performance

- [ ] Title breathing animation is smooth
- [ ] Connection pulses don't stutter
- [ ] Player card entrance is smooth
- [ ] Sparkles animate at full frame rate

---

## Integration Verification

### WebSocket Events

- [ ] LOBBY_UPDATED triggers player list update
- [ ] New player addition shows in list immediately
- [ ] Player connection status updates correctly
- [ ] Host name displays when LOBBY_UPDATED includes host
- [ ] Player removal from list works correctly

### State Management

- [ ] Join code updates when session created
- [ ] Player count updates in header
- [ ] Status indicator changes when first player joins
- [ ] Reconnect banner shows when connection lost
- [ ] Reconnect banner hides when connection restored

### Navigation

- [ ] Lobby displays when phase is "LOBBY"
- [ ] Lobby displays when phase is "PREPARING_ROUND"
- [ ] Lobby transitions correctly to next phase (ROUND_INTRO)
- [ ] No visual glitches during phase transitions

---

## Accessibility Verification

### VoiceOver

- [ ] Title is readable by VoiceOver
- [ ] QR instructions are readable
- [ ] Player names are announced
- [ ] Status indicators are announced
- [ ] "Ny spel" button is announced and activatable

### Contrast

- [ ] All text meets minimum contrast requirements
- [ ] Status indicators are distinguishable
- [ ] Connection status is clear without color (icons help)

---

## Edge Cases

### No Players

- [ ] Empty state displays correctly
- [ ] "Waiting for players" indicator shows
- [ ] No crashes or errors
- [ ] Layout is still balanced

### Many Players (10+)

- [ ] Player list remains readable
- [ ] Layout doesn't break
- [ ] Scrolling works if needed
- [ ] Performance remains good

### Rapid Player Joins

- [ ] Multiple sparkle effects can coexist
- [ ] Animations don't conflict
- [ ] Frame rate stays stable
- [ ] No visual glitches

### Connection Issues

- [ ] Reconnect banner displays correctly
- [ ] Banner doesn't block important content
- [ ] Banner disappears when reconnected
- [ ] Player connection indicators update

### Long Names

- [ ] Long player names don't overflow cards
- [ ] Text truncates or wraps appropriately
- [ ] Layout remains stable

### Special Characters

- [ ] Unicode characters in names display correctly
- [ ] Emoji in names don't break layout
- [ ] Join codes with mixed case display correctly

---

## Cross-Reference with Design Spec

### Color Palette

- [ ] All colors match design tokens from Colors.swift
- [ ] Gradient colors are correct
- [ ] Glow/shadow colors are correct
- [ ] Opacity values match spec

### Typography

- [ ] Font sizes match spec (36 pt/rem scaling)
- [ ] Font weights match spec
- [ ] Font designs match (rounded vs default vs monospaced)
- [ ] Letter spacing matches spec

### Animations

- [ ] Animation durations match spec (+0.2-0.3s for TV)
- [ ] Easing curves match spec
- [ ] Animation triggers are correct

### Layout

- [ ] Padding values match spec (80 pt horizontal, 60 pt vertical)
- [ ] Corner radius values match spec
- [ ] Spacing values match spec

---

## Comparison with Previous Version

### Visual Improvements

- [ ] New lobby is more visually engaging than old
- [ ] Title adds strong branding presence
- [ ] QR code is more prominent
- [ ] Player cards are more polished
- [ ] Animations add energy without distraction

### Functional Parity

- [ ] All previous functionality still works
- [ ] QR code still scannable
- [ ] Join code still readable
- [ ] Player list still updates
- [ ] "Ny spel" button still works

---

## Sign-Off

### Developer Verification

- [ ] Code compiles without errors
- [ ] No compiler warnings related to lobby
- [ ] Design system tokens used consistently
- [ ] No hardcoded values (all use tokens)
- [ ] Comments explain complex logic

### Design Verification

- [ ] Visual design matches game-show aesthetic
- [ ] Animations are smooth and appropriate
- [ ] Color usage is consistent
- [ ] Typography hierarchy is clear
- [ ] Layout is balanced and professional

### Product Verification

- [ ] Lobby is no longer "boring"
- [ ] Experience matches party game energy
- [ ] QR code is easy to find and scan
- [ ] Status is clear to host and players
- [ ] Transitions to next phase are smooth

---

## Test Results

**Date Tested:** _______________
**Tested By:** _______________
**Device:** Apple TV _____ (HD / 4K)
**tvOS Version:** _______________

**Overall Result:** Pass / Fail / Needs Review

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Issues Found:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Recommendations:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
