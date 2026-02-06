# TASK-404 Extension: iOS Host Followup Pro-View

**Agent**: @agent-ios-host
**Priority**: Medium (blocks host-driven E2E test)
**Estimated Effort**: 0.5 day
**Dependencies**: TASK-404 (game monitoring view) must be complete

---

## Objective

Add followup question monitoring to the iOS Host pro-view so the host can:
1. See the current question and correct answer (HOST-only)
2. Track which players have submitted answers in real-time
3. Monitor the countdown timer
4. View results after each question

---

## What's Already Done ✅

**Backend**: Fully complete (TASK-212)
- Events: FOLLOWUP_QUESTION_PRESENT, FOLLOWUP_ANSWERS_LOCKED, FOLLOWUP_RESULTS
- Per-role projections: HOST receives `correctAnswer` and `answersByPlayer` fields
- Timer: Server-driven 15s countdown

**Web Player**: Fully complete (TASK-307)
- Players can answer questions via web UI
- Timer countdown works correctly

**Needed**: Host needs visual monitoring of the followup sequence

---

## Implementation Requirements

### 1. Create FollowupHostView.swift

**Location**: `apps/ios-host/PaSparet/Views/FollowupHostView.swift`

**Purpose**: Display followup question monitoring interface

**Layout**:
```
┌─────────────────────────────────────────┐
│  Följdfrågor — Fråga 1 av 2            │
├─────────────────────────────────────────┤
│                                         │
│  "Vilket år byggdes Eiffel Tower?"      │
│                                         │
│  ✅ Rätt svar: 1889                     │
│                                         │
├─────────────────────────────────────────┤
│  ⏱️  Timer: 12 s kvar                   │
│  [████████░░░░░░░] 80%                  │
├─────────────────────────────────────────┤
│  👥 Inskickade svar (2/3):              │
│  ✓ Alice: "1889"                        │
│  ✓ Bob: "1869"                          │
│  ⏳ Charlie: (väntar...)                │
└─────────────────────────────────────────┘

(After timer expires → FOLLOWUP_RESULTS)

┌─────────────────────────────────────────┐
│  Resultat — Fråga 1 av 2               │
├─────────────────────────────────────────┤
│  ✅ Rätt svar: 1889                     │
│                                         │
│  ✓ Alice: "1889" → +2 poäng ✅          │
│  ✗ Bob: "1869" → 0 poäng ❌             │
│  ✗ Charlie: (inget svar) → 0 poäng ❌   │
├─────────────────────────────────────────┤
│  Nästa fråga om 3 sekunder...           │
└─────────────────────────────────────────┘
```

---

## State to Display

### From `GameState.followupQuestion` (HOST projection)

```swift
struct FollowupQuestionState {
    let questionText: String
    let options: [String]?  // nil = open-text
    let currentQuestionIndex: Int
    let totalQuestions: Int
    let correctAnswer: String  // ← HOST-only, present for host
    let answersByPlayer: [FollowupPlayerAnswer]  // ← HOST-only
    let timer: Timer?
}

struct FollowupPlayerAnswer {
    let playerId: String
    let playerName: String
    let answerText: String
}

struct Timer {
    let timerId: String
    let startAtServerMs: Int64
    let durationMs: Int
}
```

### Computed Properties Needed

```swift
// 1. Time remaining (seconds)
func timeRemaining(timer: Timer, serverTimeOffset: Int64) -> Int {
    let now = Int64(Date().timeIntervalSince1970 * 1000) + serverTimeOffset
    let deadline = timer.startAtServerMs + Int64(timer.durationMs)
    return max(0, Int((deadline - now) / 1000))
}

// 2. Timer percentage (for progress bar)
func timerPercentage(timer: Timer, serverTimeOffset: Int64) -> Double {
    let remaining = Double(timeRemaining(timer: timer, serverTimeOffset: serverTimeOffset))
    return max(0.0, remaining / Double(timer.durationMs / 1000))
}

// 3. Players who haven't answered yet
func waitingPlayers(allPlayers: [Player], answeredPlayerIds: Set<String>) -> [Player] {
    return allPlayers.filter { $0.role == "player" && !answeredPlayerIds.contains($0.playerId) }
}
```

---

## SwiftUI Components

### FollowupHostView.swift

```swift
import SwiftUI

struct FollowupHostView: View {
    let followup: FollowupQuestionState
    let allPlayers: [Player]
    let serverTimeOffset: Int64
    let result: FollowupResultsPayload?  // Present after FOLLOWUP_RESULTS

    @State private var timeRemaining: Int = 15
    @State private var timerTask: Task<Void, Never>?

    var body: some View {
        VStack(spacing: 20) {
            // Progress header
            Text("Följdfrågor — Fråga \(followup.currentQuestionIndex + 1) av \(followup.totalQuestions)")
                .font(.title2)
                .bold()

            Divider()

            if result == nil {
                // Question phase
                questionView
            } else {
                // Result phase
                resultView
            }
        }
        .padding()
        .onAppear {
            startTimer()
        }
        .onDisappear {
            timerTask?.cancel()
        }
    }

    private var questionView: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Question text
            Text(followup.questionText)
                .font(.headline)

            // Correct answer (HOST-only)
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                Text("Rätt svar: \(followup.correctAnswer)")
                    .font(.subheadline)
                    .foregroundColor(.green)
            }

            Divider()

            // Timer
            HStack {
                Image(systemName: "timer")
                Text("Timer: \(timeRemaining) s kvar")
                    .font(.headline)
            }

            // Progress bar
            ProgressView(value: Double(timeRemaining), total: Double(followup.timer?.durationMs ?? 15000) / 1000.0)
                .tint(timeRemaining <= 3 ? .red : .blue)
                .scaleEffect(x: 1, y: 2, anchor: .center)

            Divider()

            // Submitted answers
            Text("👥 Inskickade svar (\(followup.answersByPlayer.count)/\(playerCount)):")
                .font(.subheadline)
                .bold()

            ForEach(followup.answersByPlayer, id: \.playerId) { answer in
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("\(answer.playerName): \"\(answer.answerText)\"")
                        .font(.body)
                }
            }

            // Waiting players
            let answeredIds = Set(followup.answersByPlayer.map { $0.playerId })
            let waiting = allPlayers.filter { $0.role == "player" && !answeredIds.contains($0.playerId) }

            ForEach(waiting, id: \.playerId) { player in
                HStack {
                    Image(systemName: "hourglass")
                        .foregroundColor(.orange)
                    Text("\(player.name): (väntar...)")
                        .font(.body)
                        .foregroundColor(.secondary)
                }
            }
        }
    }

    private var resultView: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Resultat — Fråga \(followup.currentQuestionIndex + 1) av \(followup.totalQuestions)")
                .font(.title3)
                .bold()

            Divider()

            // Correct answer
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                Text("Rätt svar: \(result?.correctAnswer ?? "")")
                    .font(.headline)
                    .foregroundColor(.green)
            }

            Divider()

            // Results per player
            ForEach(result?.results ?? [], id: \.playerId) { playerResult in
                HStack {
                    Image(systemName: playerResult.isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundColor(playerResult.isCorrect ? .green : .red)

                    VStack(alignment: .leading) {
                        Text(playerResult.playerName)
                            .font(.body)
                            .bold()

                        if !playerResult.answerText.isEmpty {
                            Text("\"\(playerResult.answerText)\" → \(playerResult.pointsAwarded) poäng")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        } else {
                            Text("(inget svar) → 0 poäng")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }

            Divider()

            if result?.nextQuestionIndex != nil {
                Text("Nästa fråga om 3 sekunder...")
                    .font(.subheadline)
                    .foregroundColor(.blue)
            } else {
                Text("Följdfrågor klara!")
                    .font(.subheadline)
                    .foregroundColor(.green)
            }
        }
    }

    private var playerCount: Int {
        allPlayers.filter { $0.role == "player" }.count
    }

    private func startTimer() {
        guard let timer = followup.timer else { return }

        timerTask = Task {
            while !Task.isCancelled {
                let remaining = timeRemainingCalc(timer: timer, serverTimeOffset: serverTimeOffset)
                await MainActor.run {
                    timeRemaining = remaining
                }
                if remaining <= 0 { break }
                try? await Task.sleep(nanoseconds: 500_000_000)  // 0.5s
            }
        }
    }

    private func timeRemainingCalc(timer: Timer, serverTimeOffset: Int64) -> Int {
        let now = Int64(Date().timeIntervalSince1970 * 1000) + serverTimeOffset
        let deadline = timer.startAtServerMs + Int64(timer.durationMs)
        return max(0, Int((deadline - now) / 1000))
    }
}
```

---

### 2. Integrate into GameHostView.swift

**Location**: `apps/ios-host/PaSparet/Views/GameHostView.swift`

**Add phase routing**:

```swift
var body: some View {
    VStack {
        // Phase indicator
        Text("Phase: \(gameState.phase)")
            .font(.caption)
            .foregroundColor(.secondary)

        // Phase-specific view
        switch gameState.phase {
        case .LOBBY:
            LobbyHostView(...)
        case .CLUE_LEVEL, .PAUSED_FOR_BRAKE:
            ClueHostView(...)
        case .REVEAL_DESTINATION:
            RevealHostView(...)
        case .FOLLOWUP_QUESTION:  // ← ADD THIS
            if let followup = gameState.followupQuestion {
                FollowupHostView(
                    followup: followup,
                    allPlayers: gameState.players,
                    serverTimeOffset: appState.serverTimeOffset,
                    result: appState.latestFollowupResult  // Set this on FOLLOWUP_RESULTS
                )
            }
        case .SCOREBOARD:
            ScoreboardHostView(...)
        default:
            Text("Unknown phase")
        }
    }
}
```

---

### 3. Handle FOLLOWUP_RESULTS Event

**Location**: `apps/ios-host/PaSparet/AppState.swift` (or equivalent)

**Add property**:
```swift
@Published var latestFollowupResult: FollowupResultsPayload? = nil
```

**In WebSocket message handler**:
```swift
case "FOLLOWUP_RESULTS":
    if let payload = try? JSONDecoder().decode(FollowupResultsPayload.self, from: payloadData) {
        self.latestFollowupResult = payload
    }

case "FOLLOWUP_QUESTION_PRESENT":
    // Clear previous result when new question starts
    self.latestFollowupResult = nil
```

---

## Events to Handle

### FOLLOWUP_QUESTION_PRESENT (already in STATE_SNAPSHOT)
```json
{
  "type": "FOLLOWUP_QUESTION_PRESENT",
  "payload": {
    "questionText": "Vilket år byggdes Eiffel Tower?",
    "options": ["1869", "1889", "1909", "1929"],
    "currentQuestionIndex": 0,
    "totalQuestions": 2,
    "timerDurationMs": 15000,
    "correctAnswer": "1889"  // ← HOST receives this
  }
}
```

**Action**: Render FollowupHostView with question phase

### FOLLOWUP_ANSWERS_LOCKED (informational)
```json
{
  "type": "FOLLOWUP_ANSWERS_LOCKED",
  "payload": {
    "currentQuestionIndex": 0,
    "lockedPlayerCount": 2,
    "answersByPlayer": [  // ← HOST receives this
      { "playerId": "p1", "playerName": "Alice", "answerText": "1889" },
      { "playerId": "p2", "playerName": "Bob", "answerText": "1869" }
    ]
  }
}
```

**Action**: Optional - show "Locked!" toast (answers already visible via STATE_SNAPSHOT updates)

### FOLLOWUP_RESULTS (all roles)
```json
{
  "type": "FOLLOWUP_RESULTS",
  "payload": {
    "currentQuestionIndex": 0,
    "correctAnswer": "1889",
    "results": [
      {
        "playerId": "p1",
        "playerName": "Alice",
        "answerText": "1889",
        "isCorrect": true,
        "pointsAwarded": 2
      },
      {
        "playerId": "p2",
        "playerName": "Bob",
        "answerText": "1869",
        "isCorrect": false,
        "pointsAwarded": 0
      }
    ],
    "nextQuestionIndex": 1  // or null if last question
  }
}
```

**Action**: Render FollowupHostView with result phase

---

## Testing Checklist

### Manual Test Steps

1. **Setup**:
   - Backend running
   - iOS Host connected
   - 3 web players joined

2. **Start Game**:
   - Host starts game via iOS app
   - Advance through 5 clues

3. **First Followup Question**:
   - [ ] Host sees question text
   - [ ] Host sees correct answer (green checkmark)
   - [ ] Timer counts down from 15s
   - [ ] Progress bar shrinks proportionally
   - [ ] When player 1 submits: Host sees "Alice: '1889'" in real-time
   - [ ] When player 2 submits: Host sees "Bob: '1869'" in real-time
   - [ ] Player 3 shows "(väntar...)" until timer expires

4. **First Result**:
   - [ ] After 15s, result phase shows
   - [ ] Correct answer displayed (green)
   - [ ] Each player shows: name, answer, correct/incorrect icon, points
   - [ ] "Nästa fråga om 3 sekunder..." message appears

5. **Second Followup Question**:
   - [ ] After 4s, second question appears
   - [ ] Timer resets to 15s
   - [ ] Process repeats

6. **After Last Question**:
   - [ ] Result shows "Följdfrågor klara!"
   - [ ] Phase transitions to SCOREBOARD
   - [ ] Host view switches to ScoreboardHostView

### Edge Cases

- [ ] **No answers submitted**: All players show 0 points, timer advances
- [ ] **Reconnect mid-question**: Host reconnects, sees current question + answers
- [ ] **Quick submissions**: All 3 players submit within 1 second, all visible

---

## Acceptance Criteria

- [ ] FollowupHostView.swift created
- [ ] Question phase displays: text, correct answer, timer, submitted answers
- [ ] Result phase displays: correct answer, per-player results, next question indicator
- [ ] Timer countdown works (server-driven, updates every 0.5s)
- [ ] Progress bar visual (shrinks proportionally, turns red at 3s)
- [ ] Real-time answer tracking (answers appear as players submit)
- [ ] Waiting players listed (shows who hasn't submitted)
- [ ] Phase routing in GameHostView.swift
- [ ] FOLLOWUP_RESULTS event handling
- [ ] Manual test passes all checkpoints

---

## Files to Modify

| File | Action |
|------|--------|
| `apps/ios-host/PaSparet/Views/FollowupHostView.swift` | **CREATE** (new file) |
| `apps/ios-host/PaSparet/Views/GameHostView.swift` | **MODIFY** (add phase routing) |
| `apps/ios-host/PaSparet/AppState.swift` | **MODIFY** (add latestFollowupResult property + event handler) |

---

## Dependencies

**Must be complete first**:
- TASK-402: Session creation flow ✅
- TASK-403: Lobby management ✅
- TASK-404: Game monitoring view (base implementation)

**Blocks**:
- TASK-601: Full E2E test (host needs to monitor followup flow)

---

## Questions?

- Backend implementation: `docs/TASK-212-followup-directives.md`
- Web player example: `apps/web-player/src/pages/GamePage.tsx` (lines 506+)
- Contact: @agent-ios-host
