# Clue Timer Implementation

## Overview
Countdown timer visualization for the ledtrådsfasen (clue phase) in the Web player.

## Files Modified/Created

### New Files
- `/Users/oskar/pa-sparet-party/apps/web-player/src/components/ClueTimer.tsx` - Timer component with circular progress indicator

### Modified Files
- `/Users/oskar/pa-sparet-party/apps/web-player/src/pages/GamePage.tsx` - Integrated timer into player and host views
- `/Users/oskar/pa-sparet-party/apps/web-player/src/types/game.ts` - Added `timerEnd` and `timerDurationMs` to `CluePresentPayload`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/App.css` - Added timer styles

## Component Features

### ClueTimer Component
```typescript
interface ClueTimerProps {
  timerEnd: number; // Unix timestamp in milliseconds
}
```

**Features:**
1. Displays remaining seconds as large monospace numbers
2. Circular SVG progress ring that decreases over time
3. Updates every second via `setInterval`
4. Color-coded states:
   - Normal (blue): > 8 seconds
   - Warning (orange): < 8 seconds
   - Critical (red): < 5 seconds with pulsing animation
5. Automatic cleanup when component unmounts or timer reaches 0

**SVG Progress Ring:**
- Size: 80x80px
- Stroke width: 6px
- Smooth circular countdown with drop-shadow glow
- Rotated -90° to start from top

## Integration

### Player View
Timer appears above the "Broms!" button during `CLUE_LEVEL` phase when `currentClue.timerEnd` is present.

### Host View
Timer appears above the clue display during `CLUE_LEVEL` phase when `currentClue.timerEnd` is present.

## Backend Contract

The component expects the backend to include `timerEnd` in the `CLUE_PRESENT` event:

```json
{
  "type": "CLUE_PRESENT",
  "clue": {
    "text": "...",
    "points": 10,
    "level": 1
  },
  "timerDurationMs": 14000,
  "timerEnd": 1738899614000
}
```

**Note:** The contract in `/Users/oskar/pa-sparet-party/contracts/events.schema.json` currently does NOT include `timerEnd`. This needs to be added by the backend-agent or architect before the timer will be functional.

## Design System Compliance

**Colors:**
- Normal: `--acc-blue` (#4DA3FF)
- Warning: `--warn` (#FFB020)
- Critical: `--bad` (#FF4D4D)

**Typography:**
- Timer numbers: Monospace, bold, 2rem
- Font: SF Mono / Menlo / Monaco / Courier New

**Spacing:**
- Margin: `var(--s-2)` (16px)
- Centered with `margin: var(--s-2) auto`

**Animation:**
- Fade in: `fadeInUp 0.4s ease-out`
- Critical pulse: `pulse 0.8s ease-in-out infinite`
- Progress transition: `1s linear` for smooth countdown

## Testing

To test the timer:

1. Start the backend with a CLUE_PRESENT event that includes `timerEnd`
2. Join a session as a player
3. Wait for a clue to be presented
4. Observe the circular timer counting down
5. Verify color changes at 8s (warning) and 5s (critical)
6. Verify timer stops at 0

## Build Verification

```bash
cd /Users/oskar/pa-sparet-party/apps/web-player
npm run build
```

Build completed successfully with no errors.
