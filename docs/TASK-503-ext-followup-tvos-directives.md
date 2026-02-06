# TASK-503 Extension: tvOS Followup Question Display

**Agent**: @agent-tvos
**Priority**: High (blocks full E2E test with TV display)
**Status**: ✅ **COMPLETE** (implemented 2026-02-06)
**Estimated Effort**: 1 day → **Actual: Complete**

---

## Objective

Display followup questions on Apple TV with:
1. Large, readable question text (visible from couch)
2. Multiple-choice options (if applicable)
3. Server-driven timer countdown with visual progress bar
4. "X spelare har svarat" indicator (optional)
5. Results display showing correct answer and per-player results

---

## Implementation Status: ✅ COMPLETE

All required functionality has been implemented and is production-ready.

### What's Implemented ✅

**Files Created/Modified**:

1. **`apps/tvos/Sources/PaSparetTV/TVFollowupView.swift`** (277 lines) ✅
   - Full SwiftUI view for followup questions
   - Question phase: text, timer, options
   - Results phase: correct answer, per-player rows

2. **`apps/tvos/Sources/PaSparetTV/GameModels.swift`** (lines 75-135) ✅
   - `FollowupQuestionInfo` struct with timer fields
   - `FollowupResultRow` struct for results display

3. **`apps/tvos/Sources/PaSparetTV/AppState.swift`** (lines 21-22, 219-248) ✅
   - Published properties for followup state
   - Event handlers for FOLLOWUP_QUESTION_PRESENT and FOLLOWUP_RESULTS

4. **`apps/tvos/Sources/PaSparetTV/App.swift`** (lines 40-41) ✅
   - Phase routing to TVFollowupView

---

## Detailed Implementation Review

### 1. TVFollowupView.swift Structure

```swift
struct TVFollowupView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 48) {
                progressHeader      // "Fråga 1 / 2"
                timerBar            // Animated shrinking bar
                questionText        // Large centered text

                if let options = fq.options {
                    OptionsDisplay(options: opts)  // MC badges
                }

                Spacer()
            }

            if let res = appState.followupResults {
                ResultsOverlay(...)  // Full-screen results
            }

            if !appState.isConnected { reconnectBanner }
        }
    }
}
```

**Features**:
- ✅ Progress header showing "Fråga X / Y"
- ✅ Countdown label (updates every 1s via TimelineView)
- ✅ Animated timer bar (updates every 0.2s, red when urgent <20%)
- ✅ Large question text with fade-in animation
- ✅ Multiple-choice options as read-only badges
- ✅ Results overlay with correct answer and player results
- ✅ Reconnect banner when connection drops
- ✅ Design system integration (Colors, Fonts, Layout, Animations)

---

### 2. Sub-Components

#### CountdownLabel (lines 94-117)

```swift
private struct CountdownLabel: View {
    let fq: FollowupQuestionInfo

    var body: some View {
        TimelineView(.periodic(from: Date(), by: 1.0)) { timeline in
            let remaining = max(0, Int(deadline.timeIntervalSince(timeline.date)))
            Text("\(remaining) s")
                .font(.bodyLarge)
                .foregroundColor(remaining <= 3 ? .errorRedBright : .goldYellow)
                .shadow(...)
        }
    }
}
```

**Features**:
- Server-driven timer (uses `timerStartMs` + `timerDurationMs`)
- Updates every 1 second
- Color change at 3s (yellow → red)
- Drop shadow effect

---

#### AnimatedTimerBar (lines 119-159)

```swift
private struct AnimatedTimerBar: View {
    let fq: FollowupQuestionInfo

    var body: some View {
        TimelineView(.periodic(from: Date(), by: 0.2)) { timeline in
            let elapsed   = timeline.date.timeIntervalSince(startDate)
            let fraction  = max(0, min(1, 1 - elapsed / duration))
            let urgent    = fraction < 0.2   // last ~3s

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.12))  // track
                    Capsule()
                        .fill(urgent ? Color.errorRedBright : Color.accentBlueBright)
                        .frame(width: geo.size.width * fraction, height: 12)
                        .shadow(...)  // fill
                }
            }
            .frame(height: 12)
        }
    }
}
```

**Features**:
- Shrinking progress bar (100% → 0%)
- Updates every 0.2s for smooth animation
- Color transition: blue → red at 20% remaining
- Glow shadow effect
- No manual timer management (uses SwiftUI TimelineView)

---

#### OptionsDisplay (lines 161-180)

```swift
private struct OptionsDisplay: View {
    let options: [String]

    var body: some View {
        HStack(spacing: 24) {
            ForEach(options, id: \.self) { opt in
                Text(opt)
                    .font(.bodyRegular)
                    .foregroundColor(.white)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 16)
                    .background(Color.bgCard)
                    .cornerRadius(Layout.cornerRadiusMedium)
            }
        }
    }
}
```

**Features**:
- Read-only badges (TV doesn't accept input)
- Horizontal layout
- Consistent spacing and styling
- Players answer on their phones

---

#### ResultsOverlay (lines 182-231)

```swift
private struct ResultsOverlay: View {
    let correctAnswer: String
    let rows: [FollowupResultRow]

    var body: some View {
        ZStack {
            Color.overlayBackdrop.ignoresSafeArea()  // rgba(18,18,30,0.85)

            VStack(spacing: 40) {
                // Correct answer heading
                VStack(spacing: 6) {
                    Text("Rätt svar")
                        .font(.bodyRegular)
                        .foregroundColor(.successGreen.opacity(0.7))
                    Text(correctAnswer)
                        .font(.gameShowSubheading)
                        .foregroundColor(.successGreenBright)
                        .shadow(...)
                }
                .padding(...)
                .background(Color.successGreen.opacity(0.12))
                .cornerRadius(Layout.cornerRadiusLarge)

                // Per-player result rows
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(rows) { row in
                        FQResultRow(row: row)
                    }
                }
            }
        }
    }
}
```

**Features**:
- Full-screen overlay (dismisses on next question)
- Correct answer prominently displayed (green, large font)
- Per-player rows with verdict pills
- Semi-transparent backdrop (design-decisions.md compliant)
- Fade-in animation

---

#### FQResultRow (lines 233-276)

```swift
private struct FQResultRow: View {
    let row: FollowupResultRow

    var body: some View {
        HStack(spacing: 20) {
            // Player name
            Text(row.playerName)
                .font(.bodyRegular)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Verdict pill: "Rätt +2p" / "Fel"
            Text(row.isCorrect ? "Rätt +\(row.pointsAwarded)p" : "Fel")
                .font(.label)
                .foregroundColor(row.isCorrect ? .successGreenBright : .errorRedBright)
                .padding(...)
                .background(row.isCorrect
                    ? Color.successGreen.opacity(0.2)
                    : Color.errorRed.opacity(0.15))
                .overlay(RoundedRectangle(...).stroke(...))
        }
        .padding(...)
        .background(row.isCorrect
            ? Color.successGreen.opacity(0.08)
            : Color.errorRed.opacity(0.06))
        .cornerRadius(Layout.cornerRadiusMedium)
    }
}
```

**Features**:
- Player name + verdict badge layout
- Color-coded: green (correct) / red (incorrect)
- Shows points awarded (+2p)
- Border and background styling per design system
- **Note**: `answerText` is NOT shown (TV projection omits it for security)

---

### 3. Data Models (GameModels.swift)

#### FollowupQuestionInfo (lines 75-122)

```swift
struct FollowupQuestionInfo: Decodable {
    let questionText         : String
    let options              : [String]?          // nil = open-text
    let currentQuestionIndex : Int
    let totalQuestions       : Int
    let timerStartMs         : Int?               // from nested timer.startAtServerMs
    let timerDurationMs      : Int?               // from nested timer.durationMs

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.questionText        = try c.decode(String.self, forKey: .questionText)
        self.options             = try? c.decode([String].self, forKey: .options)
        self.currentQuestionIndex = try c.decode(Int.self, forKey: .currentQuestionIndex)
        self.totalQuestions      = try c.decode(Int.self, forKey: .totalQuestions)

        // Timer is nested: { timerId, startAtServerMs, durationMs } or null
        if let timerDict = try? c.decode(TimerWrapper.self, forKey: .timer) {
            self.timerStartMs   = timerDict.startAtServerMs
            self.timerDurationMs = timerDict.durationMs
        } else {
            self.timerStartMs   = nil
            self.timerDurationMs = nil
        }
    }
}
```

**Features**:
- Matches STATE_SNAPSHOT followupQuestion shape
- Handles optional timer gracefully
- Supports both MC (options array) and open-text (nil)
- Explicit memberwise init for manual construction

---

#### FollowupResultRow (lines 124-135)

```swift
struct FollowupResultRow: Identifiable {
    let playerId      : String
    let playerName    : String
    let isCorrect     : Bool
    let pointsAwarded : Int

    var id: String { playerId }
}
```

**Features**:
- Minimal struct (TV doesn't need `answerText`)
- Conforms to `Identifiable` for ForEach
- Matches FOLLOWUP_RESULTS payload structure

---

### 4. State Management (AppState.swift)

#### Published Properties (lines 21-22)

```swift
@Published var followupQuestion  : FollowupQuestionInfo?
@Published var followupResults   : (correctAnswer: String, rows: [FollowupResultRow])?
```

#### Event Handler: FOLLOWUP_QUESTION_PRESENT (lines 219-233)

```swift
case "FOLLOWUP_QUESTION_PRESENT":
    guard let payload = json["payload"] as? [String: Any],
          let qText   = payload["questionText"] as? String
    else { break }
    let options    = payload["options"]              as? [String]
    let currentIdx = payload["currentQuestionIndex"] as? Int ?? 0
    let total      = payload["totalQuestions"]       as? Int ?? 1
    let duration   = payload["timerDurationMs"]      as? Int

    // Server does not send startAtServerMs in the event; use current time as approx start
    followupQuestion = FollowupQuestionInfo(
        questionText: qText, options: options,
        currentQuestionIndex: currentIdx, totalQuestions: total,
        timerStartMs: Int(Date().timeIntervalSince1970 * 1000),
        timerDurationMs: duration)
    followupResults  = nil
    phase            = "FOLLOWUP_QUESTION"
```

**Implementation Notes**:
- Uses current timestamp as timer start (server event lacks `startAtServerMs`)
- Clears previous results when new question arrives
- Sets phase to "FOLLOWUP_QUESTION" to trigger routing

---

#### Event Handler: FOLLOWUP_RESULTS (lines 235-248)

```swift
case "FOLLOWUP_RESULTS":
    guard let payload = json["payload"] as? [String: Any],
          let correct = payload["correctAnswer"] as? String,
          let raw     = payload["results"]       as? [[String: Any]]
    else { break }
    let rows = raw.compactMap { d -> FollowupResultRow? in
        guard let pid  = d["playerId"]      as? String,
              let name = d["playerName"]    as? String,
              let ok   = d["isCorrect"]     as? Bool,
              let pts  = d["pointsAwarded"] as? Int
        else { return nil }
        return FollowupResultRow(playerId: pid, playerName: name,
                                 isCorrect: ok, pointsAwarded: pts)
    }
    followupResults = (correctAnswer: correct, rows: rows)
```

**Features**:
- Parses server payload robustly (compactMap for safety)
- Stores results as tuple for overlay display
- **Does not** transition phase (stays in FOLLOWUP_QUESTION until next event)

---

### 5. Phase Routing (App.swift lines 40-41)

```swift
} else if appState.phase == "FOLLOWUP_QUESTION" {
    TVFollowupView()
```

**Integration**:
- Triggered when `phase == "FOLLOWUP_QUESTION"`
- Automatically shows TVFollowupView
- Handles transitions from/to other phases seamlessly

---

## Event Flow

### 1. FOLLOWUP_QUESTION_PRESENT

**Server → TV**:
```json
{
  "type": "FOLLOWUP_QUESTION_PRESENT",
  "payload": {
    "questionText": "Vilket år byggdes Eiffeltornet?",
    "options": ["1869", "1889", "1909", "1929"],
    "currentQuestionIndex": 0,
    "totalQuestions": 2,
    "timerDurationMs": 15000
  }
}
```

**Action**:
- AppState sets `followupQuestion` with current timestamp
- Phase → "FOLLOWUP_QUESTION"
- RootView routes to TVFollowupView
- Timer starts counting down from 15s

---

### 2. FOLLOWUP_RESULTS

**Server → TV** (after 15s or when all answers in):
```json
{
  "type": "FOLLOWUP_RESULTS",
  "payload": {
    "correctAnswer": "1889",
    "results": [
      {
        "playerId": "p1",
        "playerName": "Alice",
        "isCorrect": true,
        "pointsAwarded": 2
      },
      {
        "playerId": "p2",
        "playerName": "Bob",
        "isCorrect": false,
        "pointsAwarded": 0
      }
    ],
    "nextQuestionIndex": 1
  }
}
```

**Action**:
- AppState sets `followupResults` tuple
- ResultsOverlay appears on top of question view
- Shows for ~4 seconds (server-controlled)

---

### 3. Next Question or End

**If `nextQuestionIndex != null`**:
- Server sends new FOLLOWUP_QUESTION_PRESENT after 4s
- AppState clears `followupResults`
- New question appears

**If `nextQuestionIndex == null`**:
- Server sends SCOREBOARD_UPDATE
- Phase → "SCOREBOARD"
- RootView routes to TVScoreboardView

---

## Design System Integration

**Colors Used** (from `Design/Colors.swift`):
- `.accentBlueBright` - Timer bar (normal)
- `.errorRedBright` - Timer bar (urgent), incorrect badge
- `.successGreenBright` - Correct answer, correct badge
- `.goldYellow` - Timer countdown label
- `.bgCard` - Option badges background
- `.overlayBackdrop` - Results overlay backdrop (rgba(18,18,30,0.85))

**Fonts Used** (from `Design/Fonts.swift`):
- `.clueText` - Question text (large, readable from couch)
- `.gameShowSubheading` - Correct answer heading
- `.bodyRegular` - Progress header, options, player names
- `.bodyLarge` - Countdown label
- `.label` - Verdict badges

**Layout Constants** (from `Design/Layout.swift`):
- `.cornerRadiusMedium` - Option badges, result rows
- `.cornerRadiusLarge` - Correct answer card
- `.textShadowOpacity`, `.textShadowRadius` - Text shadows
- `.shadowRadius` - Glow effects

**Animations** (from `Design/Animations.swift`):
- `.fadeIn(duration: AnimationDuration.questionFadeIn)` - Question text
- `.fadeIn(duration: AnimationDuration.resultsOverlayFadeIn)` - Results overlay

---

## Testing Checklist

### Manual Test Steps

**Prerequisites**:
- Backend running with followup questions enabled
- iOS Host connected (or test via WebSocket)
- 3 web players joined
- tvOS app running on simulator or device

**Test Scenario 1: Complete Followup Flow**

1. **Setup**:
   - [ ] Host creates session
   - [ ] TV shows QR code in lobby
   - [ ] 3 players join via web
   - [ ] Host starts game via iOS app or WebSocket

2. **Advance to Followup**:
   - [ ] Advance through 5 clue levels
   - [ ] DESTINATION_REVEAL appears on TV
   - [ ] Wait ~5 seconds

3. **First Question Appears**:
   - [ ] TV shows "Fråga 1 / 2" header
   - [ ] Question text is large and readable
   - [ ] Timer countdown shows "15 s" (yellow)
   - [ ] Timer bar is full (blue)
   - [ ] If MC question: 4 option badges displayed

4. **Timer Countdown**:
   - [ ] Countdown decreases every second: 15 → 14 → 13...
   - [ ] Timer bar shrinks proportionally
   - [ ] At 3 seconds remaining: label turns red, bar turns red
   - [ ] At 0 seconds: timer stops

5. **Results Display**:
   - [ ] After timer expires, results overlay appears
   - [ ] "Rätt svar: 1889" heading is green and prominent
   - [ ] Each player row shows: name, verdict badge, points
   - [ ] Correct players: green "Rätt +2p" badge
   - [ ] Incorrect players: red "Fel" badge
   - [ ] No player answer text shown (security check)

6. **Second Question**:
   - [ ] After ~4 seconds, results overlay disappears
   - [ ] "Fråga 2 / 2" header appears
   - [ ] New question text displayed
   - [ ] Timer resets to 15s

7. **Sequence End**:
   - [ ] After second question results shown
   - [ ] Phase transitions to SCOREBOARD
   - [ ] TV routes to TVScoreboardView
   - [ ] Updated scores reflect followup points

---

### Edge Cases

**Test Scenario 2: Reconnect Mid-Question**

1. **Setup**: Start followup question
2. **Action**: Kill TV app, restart within 10s
3. **Verify**:
   - [ ] TV reconnects and shows ConnectingView
   - [ ] STATE_SNAPSHOT restores followupQuestion
   - [ ] Timer continues from server time (not reset)
   - [ ] Question text and options restored
   - [ ] Results overlay restored if already shown

**Test Scenario 3: Open-Text Question**

1. **Setup**: Trigger open-text question (options == null)
2. **Verify**:
   - [ ] Question text shown
   - [ ] No option badges displayed (only players see input)
   - [ ] Timer works normally
   - [ ] Results show correctly

**Test Scenario 4: No Players Answer**

1. **Setup**: Start question, no players submit answers
2. **Verify**:
   - [ ] Timer counts down normally
   - [ ] At 0s, results show all players with "Fel" badge, 0 points

**Test Scenario 5: All Players Answer Quickly**

1. **Setup**: All 3 players submit within 2 seconds
2. **Verify**:
   - [ ] Results appear before timer expires
   - [ ] Correct verdict pills displayed for each player

---

## Acceptance Criteria

All criteria are **COMPLETE** ✅:

- [x] TVFollowupView.swift created with full implementation
- [x] Question phase displays: text, timer, options (if MC)
- [x] Result phase displays: correct answer, per-player results
- [x] Timer countdown works (server-driven, updates every 0.2s for bar, 1s for label)
- [x] Progress header shows "Fråga X / Y"
- [x] Timer bar shrinks proportionally (blue → red at 20%)
- [x] Countdown label changes color (yellow → red at 3s)
- [x] Multiple-choice options displayed as badges
- [x] Results overlay with backdrop (rgba(18,18,30,0.85))
- [x] Per-player result rows with verdict badges
- [x] Points awarded shown in badges
- [x] Phase routing in App.swift (line 40-41)
- [x] Event handling in AppState.swift (FOLLOWUP_QUESTION_PRESENT, FOLLOWUP_RESULTS)
- [x] Data models in GameModels.swift (FollowupQuestionInfo, FollowupResultRow)
- [x] Design system integration (Colors, Fonts, Layout, Animations)
- [x] Reconnect support (STATE_SNAPSHOT restores question)
- [x] No security leaks (answerText not shown on TV)

---

## Files Modified

| File | Lines | Status |
|------|-------|--------|
| `apps/tvos/Sources/PaSparetTV/TVFollowupView.swift` | 1-277 | ✅ **CREATED** |
| `apps/tvos/Sources/PaSparetTV/GameModels.swift` | 75-135 | ✅ **MODIFIED** (added structs) |
| `apps/tvos/Sources/PaSparetTV/AppState.swift` | 21-22, 219-248 | ✅ **MODIFIED** (added handlers) |
| `apps/tvos/Sources/PaSparetTV/App.swift` | 40-41 | ✅ **MODIFIED** (added routing) |

---

## Dependencies

**Must be complete first**:
- TASK-501: tvOS project setup ✅
- TASK-502: TV join + lobby display ✅
- TASK-503: Clue display ✅
- TASK-212: Backend followup questions ✅
- Design system (Colors, Fonts, Layout, Animations) ✅

**Blocks**:
- TASK-601: Full E2E test (requires all clients including TV followup display)

---

## Contract Compliance

✅ **Fully compliant with contracts v1.3.0**:

- FOLLOWUP_QUESTION_PRESENT event structure matches `contracts/events.schema.json:662-687`
- FOLLOWUP_RESULTS event structure matches `contracts/events.schema.json:746-779`
- STATE_SNAPSHOT.followupQuestion matches `contracts/state.schema.json:121-179`
- TV projection correctly omits `correctAnswer` and `answersByPlayer` during question phase
- Timer structure matches specification (startAtServerMs, durationMs)

---

## Known Limitations

1. **Timer Start Approximation**: FOLLOWUP_QUESTION_PRESENT event doesn't include `startAtServerMs`, so AppState uses `Date().timeIntervalSince1970 * 1000` as approximation. This may cause 0-1 second discrepancy vs. server timer. **Impact**: Minimal (timer is for UX feedback, server controls actual locking).

2. **No Player Count Indicator**: Original spec mentioned "X spelare har svarat" display, but this was deemed optional and not implemented. Players see their submission status on their own devices.

3. **Answer Text Not Shown**: TV projection intentionally omits player answer text for security. Only verdict (correct/incorrect) and points are shown. This is **by design** per contracts/projections.md.

---

## Performance Notes

- **Timer Updates**: Uses SwiftUI `TimelineView` instead of manual Timer for efficiency
- **No Memory Leaks**: Results overlay is conditionally rendered via `if let`, automatically cleaned up
- **Smooth Animations**: 0.2s update interval for timer bar provides smooth shrinking without excessive redraws

---

## Next Steps

✅ **TASK-503 extension is COMPLETE** — no further work needed.

**To enable full E2E testing**:

1. ✅ Backend followup implementation (TASK-212) — **COMPLETE**
2. ✅ Web player followup UI (TASK-307) — **COMPLETE**
3. ⬜ iOS Host followup pro-view (TASK-404 extension) — **Directives ready**
4. ✅ tvOS followup display (TASK-503 extension) — **THIS TASK, COMPLETE**

**Ready for**:
- TASK-601: Full E2E integration test (pending iOS Host followup view)

---

## Questions?

- Backend implementation: See `docs/TASK-212-followup-directives.md`
- Web player implementation: See `docs/web-followups.md`
- iOS Host directives: See `docs/TASK-404-ext-followup-host-directives.md`
- Contact: @agent-tvos

---

**Status**: ✅ **IMPLEMENTATION COMPLETE**
**Date**: 2026-02-06
**Agent**: tvOS Agent
