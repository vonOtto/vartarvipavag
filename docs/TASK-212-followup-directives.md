# TASK-212: Backend Followup Questions Loop — Implementation Status & Directives

**Status**: ✅ **IMPLEMENTATION APPEARS COMPLETE**
**Date**: 2026-02-06
**Owner**: Backend Agent

---

## Executive Summary

After comprehensive code review, **TASK-212 appears to be fully implemented**. The backend followup questions loop is complete with:
- ✅ All contract events implemented (v1.3.0)
- ✅ State machine logic complete (start → loop → score → end)
- ✅ Timer-driven flow (15s per question, auto-advance)
- ✅ Hardcoded content (2 questions × 3 destinations)
- ✅ Audio integration (music swap, TTS narration)
- ✅ Per-role projections (HOST sees answers, TV/PLAYER don't)

**Recommendation**: Run integration tests to verify, then mark TASK-212 as ✅ COMPLETE.

---

## 1. Contract Verification ✅

### Events Defined (contracts/events.schema.json v1.3.0)

All required events are present and correctly structured:

#### FOLLOWUP_QUESTION_PRESENT (lines 662-687)
```json
{
  "type": "FOLLOWUP_QUESTION_PRESENT",
  "payload": {
    "questionText": "string",
    "options": ["string"] | null,  // null = open-text
    "currentQuestionIndex": 0,     // 0-indexed
    "totalQuestions": 2,
    "timerDurationMs": 15000,
    "correctAnswer": "string"      // HOST-only projection
  }
}
```

#### FOLLOWUP_ANSWER_SUBMIT (lines 691-708)
```json
{
  "type": "FOLLOWUP_ANSWER_SUBMIT",
  "payload": {
    "playerId": "string",
    "answerText": "string"  // 1-200 chars
  }
}
```

#### FOLLOWUP_ANSWERS_LOCKED (lines 712-742)
```json
{
  "type": "FOLLOWUP_ANSWERS_LOCKED",
  "payload": {
    "currentQuestionIndex": 0,
    "lockedPlayerCount": 3,
    "answersByPlayer": [...]  // HOST-only projection
  }
}
```

#### FOLLOWUP_RESULTS (lines 746-779)
```json
{
  "type": "FOLLOWUP_RESULTS",
  "payload": {
    "currentQuestionIndex": 0,
    "correctAnswer": "string",  // Now public for all roles
    "results": [
      {
        "playerId": "string",
        "playerName": "string",
        "answerText": "string",  // "" if no answer
        "isCorrect": true,
        "pointsAwarded": 2  // +2 if correct, 0 otherwise
      }
    ],
    "nextQuestionIndex": 1 | null
  }
}
```

**Verification**: All schemas match contracts v1.3.0 ✅

---

## 2. State Schema Verification ✅

### followupQuestion State (contracts/state.schema.json lines 121-179)

```typescript
interface FollowupQuestionState {
  questionText: string;
  options: string[] | null;  // null = open-text
  currentQuestionIndex: number;  // 0-indexed
  totalQuestions: number;
  correctAnswer: string | null;  // HOST-only, null for TV/PLAYER
  answersByPlayer: Array<{      // HOST-only, empty for TV/PLAYER
    playerId: string;
    playerName: string;
    answerText: string;
  }>;
  timer: {
    timerId: string;
    startAtServerMs: number;
    durationMs: number;  // 15000 ms
  } | null;
  answeredByMe?: boolean;  // PLAYER-only projection
}
```

**State Machine Phase**: `FOLLOWUP_QUESTION` is defined in phase enum (line 21)

**Verification**: State structure is complete and matches projection requirements ✅

---

## 3. Implementation Status

### 3.1 State Machine Logic ✅

**File**: `services/backend/src/game/state-machine.ts`

#### startFollowupSequence() (lines 459-502)
```typescript
// Called after DESTINATION_REVEAL scoring complete
// Returns first question or null if destination has none
export function startFollowupSequence(session: Session): {
  question: FollowupQuestion;
  currentQuestionIndex: number;
  totalQuestions: number;
  timerDurationMs: number;
  startAtServerMs: number;
} | null
```

**Implementation**:
- ✅ Reads `followupQuestions` from destination
- ✅ Returns null if none exist (graceful fallback)
- ✅ Initializes `session.state.followupQuestion` with first question
- ✅ Sets phase to `FOLLOWUP_QUESTION`
- ✅ Creates timer object (15s duration)
- ✅ Initializes empty `answersByPlayer` array

#### submitFollowupAnswer() (lines 508-549)
```typescript
export function submitFollowupAnswer(
  session: Session,
  playerId: string,
  answerText: string
): boolean  // Returns false if already answered or timer expired
```

**Implementation**:
- ✅ Validates phase is `FOLLOWUP_QUESTION`
- ✅ Rejects if player already answered this question
- ✅ Rejects if timer expired (deadline check)
- ✅ Stores answer in `answersByPlayer` array
- ✅ Returns success boolean

#### lockFollowupAnswers() (lines 555-569)
```typescript
export function lockFollowupAnswers(session: Session): number
```

**Implementation**:
- ✅ Idempotent (safe to call multiple times)
- ✅ Clears timer (sets to null)
- ✅ Returns locked count

#### scoreFollowupQuestion() (lines 574-662)
```typescript
export function scoreFollowupQuestion(session: Session): {
  results: Array<{ playerId, playerName, answerText, isCorrect, pointsAwarded }>;
  correctAnswer: string;
  currentQuestionIndex: number;
  nextQuestionIndex: number | null;
}
```

**Implementation**:
- ✅ Scores ALL players (not just those who submitted)
- ✅ Empty `answerText` for players who didn't answer
- ✅ Uses `isFollowupAnswerCorrect()` for matching
- ✅ Awards +2 points for correct answers
- ✅ Updates `player.score` and `scoreboard`
- ✅ Re-sorts scoreboard and re-ranks
- ✅ Advances to next question OR transitions to `SCOREBOARD` phase
- ✅ If next question exists, initializes new timer (15s)

**Verification**: All state machine functions are complete ✅

---

### 3.2 Content Data ✅

**File**: `services/backend/src/game/content-hardcoded.ts`

#### Destination Structure (lines 18-25)
```typescript
interface Destination {
  id: string;
  name: string;
  country: string;
  aliases: string[];
  clues: Clue[];
  followupQuestions: FollowupQuestion[];  // ← Present
}
```

#### Sample Content — Paris (lines 55-67)
```typescript
followupQuestions: [
  {
    questionText: 'Vilket år byggdes Eiffel Tower?',
    options: ['1869', '1889', '1909', '1929'],  // Multiple choice
    correctAnswer: '1889',
  },
  {
    questionText: 'Vilken flod flödar genom Paris?',
    options: null,  // Open-text
    correctAnswer: 'Seine',
    aliases: ['seine'],
  },
]
```

**All Destinations Have 2 Followup Questions**:
- ✅ Paris: Eiffel year (MC), Seine river (open-text)
- ✅ Tokyo: Imperial Palace ward (MC), old name Edo (open-text)
- ✅ New York: Borough count (MC), Central Park (open-text)

#### Answer Matching Function (lines 205-223)
```typescript
export function isFollowupAnswerCorrect(
  answerText: string,
  question: FollowupQuestion
): boolean
```

**Implementation**:
- ✅ Multiple-choice: exact match (case-insensitive)
- ✅ Open-text: checks `correctAnswer` + `aliases`
- ✅ Uses `normalizeAnswer()` (lowercase, trim, strip punctuation)

**Verification**: Content structure is complete with 6 total questions ✅

---

### 3.3 Server Message Handlers ✅

**File**: `services/backend/src/server.ts`

#### handleFollowupAnswerSubmit() (lines 1201-1246)
```typescript
function handleFollowupAnswerSubmit(
  ws: WebSocket,
  sessionId: string,
  playerId: string,
  role: string,
  payload: any
): void
```

**Implementation**:
- ✅ Validates role === 'player'
- ✅ Validates phase === 'FOLLOWUP_QUESTION'
- ✅ Validates answerText (1-200 chars, non-empty)
- ✅ Calls `submitFollowupAnswer()` from state machine
- ✅ Sends ERROR if rejected (already answered / timer expired)
- ✅ Sends STATE_SNAPSHOT to player on success (updates `answeredByMe` flag)

#### broadcastFollowupQuestionPresent() (lines 1252-1284)
```typescript
function broadcastFollowupQuestionPresent(
  sessionId: string,
  data: {
    question: { questionText, options, correctAnswer },
    currentQuestionIndex,
    totalQuestions,
    timerDurationMs,
    startAtServerMs
  }
): void
```

**Implementation**:
- ✅ Per-connection broadcast (role-aware)
- ✅ HOST receives `correctAnswer` in payload
- ✅ TV and PLAYER receive `correctAnswer: undefined`
- ✅ Uses `buildFollowupQuestionPresentEvent()` builder

#### broadcastFollowupAnswersLocked() (lines 1290-1318)
```typescript
function broadcastFollowupAnswersLocked(
  sessionId: string,
  currentQuestionIndex: number
): void
```

**Implementation**:
- ✅ Per-connection broadcast (role-aware)
- ✅ HOST receives full `answersByPlayer` array
- ✅ TV and PLAYER receive `answersByPlayer: undefined`
- ✅ All roles see `lockedPlayerCount`

#### scheduleFollowupTimer() (lines 1632-1724)
```typescript
function scheduleFollowupTimer(sessionId: string, durationMs: number): void
```

**Implementation** (Timer fires after 15s):
1. ✅ Locks answers: `lockFollowupAnswers(session)`
2. ✅ Broadcasts: `FOLLOWUP_ANSWERS_LOCKED`
3. ✅ Scores question: `scoreFollowupQuestion(session)`
4. ✅ Broadcasts: `FOLLOWUP_RESULTS` (same payload to all roles)
5. ✅ **If next question exists**:
   - ✅ Waits 4s (results display pause)
   - ✅ Generates TTS voice for next question
   - ✅ Broadcasts STATE_SNAPSHOT (now safe — 4s passed)
   - ✅ Broadcasts FOLLOWUP_QUESTION_PRESENT
   - ✅ Broadcasts audio events (TTS narration)
   - ✅ Schedules next timer (recursive)
6. ✅ **If last question**:
   - ✅ Stops followup music: `onFollowupSequenceEnd()`
   - ✅ Broadcasts STATE_SNAPSHOT (audioState updated)
   - ✅ Broadcasts audio stop events
   - ✅ Broadcasts SCOREBOARD_UPDATE
   - ✅ Phase is already `SCOREBOARD` (from `scoreFollowupQuestion`)

**Verification**: Timer-driven loop is complete with proper pacing ✅

---

### 3.4 Integration Points ✅

#### Trigger After Destination Reveal (server.ts lines 812-869)

**In `handleHostNextClue()` after DESTINATION_REVEAL**:

```typescript
// Score all locked answers
const results = /* ... */;
broadcastDestinationResults(sessionId, results);

// Try to start follow-up questions; fall back to scoreboard if none
const followupStart = startFollowupSequence(session);
if (followupStart) {
  // ── FOLLOWUP_INTRO pause: scoreboard → intro TTS → first question ──

  // 1) Broadcast SCOREBOARD_UPDATE so clients show current standings
  const scoreboardEvent = buildScoreboardUpdateEvent(sessionId, session.state.scoreboard, false);
  sessionStore.broadcastEventToSession(sessionId, scoreboardEvent);

  // 2) Generate intro voice clip ("Nu ska vi se vad ni kan om …")
  const introClip = await generateFollowupIntroVoice(session, result.destinationName!);
  const introDurationMs = introClip?.durationMs ?? 3000;

  // 3) Wait for intro + breathing room, then start questions
  setTimeout(async () => {
    const sess = sessionStore.getSession(sessionId);
    if (!sess) return;

    // On-demand: generate question voice BEFORE audio-director searches manifest
    await generateQuestionVoice(sess, followupStart.currentQuestionIndex, followupStart.question.questionText);

    // Audio: mutate audioState before snapshot so reconnect sees followup music
    const fqAudioEvents = onFollowupStart(sess, followupStart.currentQuestionIndex, followupStart.question.questionText);

    broadcastStateSnapshot(sessionId);
    broadcastFollowupQuestionPresent(sessionId, followupStart);

    // Broadcast audio events after snapshot
    fqAudioEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

    scheduleFollowupTimer(sessionId, followupStart.timerDurationMs);
  }, introDurationMs + INTRO_BREATHING_MS);
} else {
  // No followup questions — go straight to scoreboard
  const scoreboardEvent = buildScoreboardUpdateEvent(sessionId, session.state.scoreboard, false);
  sessionStore.broadcastEventToSession(sessionId, scoreboardEvent);
}
```

**Verification**: Integration is complete with graceful fallback ✅

---

### 3.5 Audio Integration ✅

**File**: `services/backend/src/game/audio-director.ts`

#### onFollowupStart() (lines ~350+)
```typescript
export function onFollowupStart(
  session: Session,
  questionIndex: number,
  questionText: string
): Event[]
```

**Implementation**:
- ✅ Sets `audioState.currentTrackId = 'music_followup_loop'`
- ✅ Broadcasts `MUSIC_SET` event (followup music)
- ✅ TTS voice clip for question if available
- ✅ Auto-ducking during voice playback (-10dB)

#### onFollowupQuestionPresent() (lines ~380+)
```typescript
export function onFollowupQuestionPresent(
  session: Session,
  questionIndex: number,
  questionText: string
): Event[]
```

**Implementation**:
- ✅ TTS narration for question text (if available)
- ✅ Music continues during question (seamless)

#### onFollowupSequenceEnd() (lines ~410+)
```typescript
export function onFollowupSequenceEnd(session: Session): Event[]
```

**Implementation**:
- ✅ Stops followup music: `MUSIC_STOP` event
- ✅ Updates `audioState.currentTrackId = null`
- ✅ Updates `audioState.isPlaying = false`

**Verification**: Audio timeline is complete with proper music swap ✅

---

## 4. Test Scenarios

### Test 1: Basic Followup Flow
**Scenario**: 3 players complete Paris destination → followup questions

**Steps**:
1. Complete Paris destination with 3 locked answers
2. After DESTINATION_REVEAL + DESTINATION_RESULTS
3. **Expected**: SCOREBOARD_UPDATE → intro pause → FOLLOWUP_QUESTION_PRESENT
4. **Timer**: 15s countdown
5. Players submit answers via FOLLOWUP_ANSWER_SUBMIT
6. **After 15s**: FOLLOWUP_ANSWERS_LOCKED → FOLLOWUP_RESULTS
7. **4s pause**: Results visible
8. **Expected**: Second FOLLOWUP_QUESTION_PRESENT
9. Repeat timer cycle
10. **After question 2**: MUSIC_STOP → SCOREBOARD_UPDATE → phase: SCOREBOARD

**Pass Criteria**:
- ✅ All events received in correct order
- ✅ Timer auto-advances after 15s
- ✅ Correct scoring (+2 per correct answer)
- ✅ Music swaps to followup_loop, then stops after last question

---

### Test 2: Per-Role Projections
**Scenario**: HOST sees answers, TV/PLAYER don't

**Steps**:
1. Start followup question
2. Player 1 submits "Seine"
3. Player 2 submits "Paris" (wrong)

**Expected STATE_SNAPSHOT**:

**HOST**:
```json
{
  "followupQuestion": {
    "correctAnswer": "Seine",  // ← Visible
    "answersByPlayer": [
      { "playerId": "p1", "playerName": "Alice", "answerText": "Seine" },
      { "playerId": "p2", "playerName": "Bob", "answerText": "Paris" }
    ]
  }
}
```

**TV**:
```json
{
  "followupQuestion": {
    "correctAnswer": null,  // ← Hidden
    "answersByPlayer": []   // ← Hidden
  }
}
```

**PLAYER (Alice)**:
```json
{
  "followupQuestion": {
    "correctAnswer": null,  // ← Hidden
    "answersByPlayer": [],  // ← Hidden
    "answeredByMe": true    // ← Helper flag
  }
}
```

**Pass Criteria**:
- ✅ HOST sees all answers before lock
- ✅ TV/PLAYER don't see answers until FOLLOWUP_RESULTS
- ✅ Player knows if they've answered via `answeredByMe` flag

---

### Test 3: Timer Auto-Advance
**Scenario**: Players don't submit answers — timer advances anyway

**Steps**:
1. Start followup question
2. Wait 15 seconds (no submissions)
3. **Expected**: FOLLOWUP_ANSWERS_LOCKED (lockedPlayerCount: 0)
4. **Expected**: FOLLOWUP_RESULTS with all players having answerText: "" and pointsAwarded: 0
5. 4s pause
6. **Expected**: Next question or SCOREBOARD

**Pass Criteria**:
- ✅ Timer fires even with 0 submissions
- ✅ All players scored with 0 points
- ✅ Flow continues to next question or end

---

### Test 4: Multiple Choice vs Open Text
**Scenario**: Paris question 1 (MC) and question 2 (open-text)

**Question 1** (MC): "Vilket år byggdes Eiffel Tower?"
- Options: ['1869', '1889', '1909', '1929']
- Correct: '1889'

**Test**:
- Player submits "1889" → isCorrect: true ✅
- Player submits "1869" → isCorrect: false ✅
- Player submits "Eighteen eighty-nine" → isCorrect: false (not an option) ✅

**Question 2** (Open-text): "Vilken flod flödar genom Paris?"
- Correct: 'Seine'
- Aliases: ['seine']

**Test**:
- Player submits "Seine" → isCorrect: true ✅
- Player submits "SEINE" → isCorrect: true (case-insensitive) ✅
- Player submits "  seine  " → isCorrect: true (trimmed) ✅
- Player submits "Seine River" → isCorrect: false ✅

**Pass Criteria**:
- ✅ MC: exact option match required
- ✅ Open-text: correct answer + aliases accepted
- ✅ Normalization (case, trim, punctuation) works

---

### Test 5: Reconnect During Followup
**Scenario**: Player disconnects during question, reconnects

**Steps**:
1. Start followup question (timer: 15s)
2. Player 1 submits answer at T=5s
3. Player 1 disconnects at T=7s
4. Player 1 reconnects at T=10s
5. **Expected**: STATE_SNAPSHOT with `followupQuestion.answeredByMe = true`
6. Player 1 tries to submit again → ERROR (already answered)
7. Timer expires at T=15s
8. **Expected**: FOLLOWUP_RESULTS includes Player 1's answer

**Pass Criteria**:
- ✅ Answer persists across reconnect
- ✅ Player sees `answeredByMe = true` and can't double-submit
- ✅ Timer continues running (not reset by reconnect)

---

### Test 6: Scoring Accuracy
**Scenario**: 4 players, 2 questions

**Setup**:
- Alice, Bob, Charlie, Diana start with scores: [10, 8, 6, 4]

**Question 1** (MC: "Vilket år byggdes Eiffel Tower?" → "1889"):
- Alice: "1889" (correct) → +2 → score: 12
- Bob: "1869" (wrong) → +0 → score: 8
- Charlie: (no answer) → +0 → score: 6
- Diana: "1889" (correct) → +2 → score: 6

**After Q1 Scoreboard**:
- Alice: 12 (rank 1)
- Bob: 8 (rank 2)
- Charlie: 6 (rank 3)
- Diana: 6 (rank 3)  ← Tie

**Question 2** (Open-text: "Vilken flod flödar genom Paris?" → "Seine"):
- Alice: "Seine" (correct) → +2 → score: 14
- Bob: "Seine" (correct) → +2 → score: 10
- Charlie: "Paris" (wrong) → +0 → score: 6
- Diana: (no answer) → +0 → score: 6

**Final Scoreboard**:
- Alice: 14 (rank 1)
- Bob: 10 (rank 2)
- Charlie: 6 (rank 3)
- Diana: 6 (rank 3)

**Pass Criteria**:
- ✅ +2 points per correct answer
- ✅ 0 points for wrong/no answer
- ✅ Ties handled correctly (same rank)
- ✅ Scoreboard re-sorted after each question

---

## 5. Potential Gaps & Improvements

### Gap 1: No Integration Tests ❌
**Issue**: No automated test for full followup flow
**Impact**: Medium (manual testing required)
**Recommendation**: Add test to `test/integration/specs/`

**Test File Template**:
```typescript
// test/integration/specs/followup-questions.test.ts
test('Should complete full followup sequence with 2 questions', async () => {
  const { host, tv, players } = await createTestSession(3);

  // Start game and complete destination
  host.send('HOST_START_GAME', {});
  await host.waitForEvent('CLUE_PRESENT', 10000);
  // ... advance through clues, submit answers, reveal

  // Wait for first followup question
  const fq1 = await host.waitForEvent('FOLLOWUP_QUESTION_PRESENT', 5000);
  assertEqual(fq1.payload.currentQuestionIndex, 0);
  assertEqual(fq1.payload.totalQuestions, 2);

  // Player submits answer
  players[0].send('FOLLOWUP_ANSWER_SUBMIT', {
    playerId: players[0].playerId,
    answerText: '1889'
  });

  // Wait for timer to expire (15s)
  const locked1 = await host.waitForEvent('FOLLOWUP_ANSWERS_LOCKED', 16000);
  assertEqual(locked1.payload.lockedPlayerCount, 1);

  // Results
  const results1 = await host.waitForEvent('FOLLOWUP_RESULTS', 2000);
  assertEqual(results1.payload.results[0].isCorrect, true);
  assertEqual(results1.payload.nextQuestionIndex, 1);

  // Wait for second question (4s pause)
  const fq2 = await host.waitForEvent('FOLLOWUP_QUESTION_PRESENT', 5000);
  assertEqual(fq2.payload.currentQuestionIndex, 1);

  // ... repeat for second question

  // Final scoreboard
  const scoreboard = await host.waitForEvent('SCOREBOARD_UPDATE', 20000);
  assertExists(scoreboard);

  cleanupClients(host, tv, ...players);
});
```

---

### Gap 2: No CI Test Coverage ❌
**Issue**: Followup tests not in CI pipeline
**Impact**: Low (not blocking MVP)
**Recommendation**: Add to `test/integration/run-ci.ts` after manual verification

---

### Gap 3: No Client Implementations Yet ⚠️
**Issue**: Backend is complete, but clients need to handle events
**Impact**: High (blocks E2E testing)
**Status**:
- ✅ Backend: Complete
- ❌ Web Player: TASK-307 (not started)
- ❌ iOS Host: Followup view needed
- ❌ tvOS: Followup view needed

**Recommendation**: Prioritize TASK-307 (Web Player Followup UI) next

---

### Enhancement 1: Variable Timer Duration 💡
**Current**: Hardcoded 15s per question
**Enhancement**: Allow per-question timer configuration

**Change Required**:
```typescript
interface FollowupQuestion {
  questionText: string;
  options: string[] | null;
  correctAnswer: string;
  aliases?: string[];
  timerDurationMs?: number;  // ← NEW (default: 15000)
}
```

**Priority**: Low (nice-to-have, not MVP blocker)

---

### Enhancement 2: Partial Credit Scoring 💡
**Current**: Binary scoring (correct = +2, wrong/no answer = 0)
**Enhancement**: Support partial credit (e.g., close answer = +1)

**Priority**: Very Low (post-MVP polish)

---

## 6. Acceptance Criteria Checklist

Based on CEO's prioritization analysis, TASK-212 should meet:

### Core Requirements
- [x] **Event Definitions**: All 4 events defined in contracts/events.schema.json
- [x] **State Structure**: followupQuestion field in state.schema.json
- [x] **Phase Transition**: FOLLOWUP_QUESTION phase exists and is used
- [x] **Content**: Hardcoded questions (2 per destination × 3 destinations = 6 total)
- [x] **Timer Logic**: 15s countdown per question, server-driven
- [x] **Answer Submission**: FOLLOWUP_ANSWER_SUBMIT handler implemented
- [x] **Auto-Advance**: Timer fires → lock → score → broadcast
- [x] **Scoring**: +2 per correct answer, 0 for wrong/no answer
- [x] **Loop Logic**: Multiple questions sequence correctly
- [x] **End Condition**: Transitions to SCOREBOARD after last question

### Role-Based Security
- [x] **HOST Projection**: Sees correctAnswer + answersByPlayer before lock
- [x] **TV Projection**: Doesn't see correctAnswer or answers until RESULTS
- [x] **PLAYER Projection**: Doesn't see correctAnswer or others' answers until RESULTS
- [x] **PLAYER Helper**: `answeredByMe` flag present in player projection

### Audio Integration
- [x] **Music Swap**: MUSIC_SET event for followup_loop music
- [x] **TTS Integration**: Question text can be narrated via TTS
- [x] **Music Stop**: MUSIC_STOP event after last question
- [x] **Auto-Ducking**: Voice narration triggers -10dB music duck

### Reconnect Support
- [x] **State Persistence**: followupQuestion preserved across reconnect
- [x] **Timer Continuity**: Timer keeps running during disconnect
- [x] **Answer Persistence**: Submitted answers survive disconnect

### Edge Cases
- [x] **No Followup Questions**: Graceful fallback to scoreboard (returns null)
- [x] **Zero Submissions**: Timer fires with 0 answers, flow continues
- [x] **Double Submit**: Rejected with error (already answered)
- [x] **Late Submit**: Rejected after timer expiry

---

## 7. Final Recommendation

### Status: ✅ TASK-212 APPEARS COMPLETE

**Confidence**: High (95%)

**Rationale**:
1. All contract events are defined and match specification
2. State machine logic is complete with all 4 required functions
3. Server handlers are wired up and integrated into game flow
4. Content exists for all 3 destinations (2 questions each)
5. Audio integration is complete with proper music swap
6. Per-role projections are correctly implemented
7. Timer-driven flow works as specified (15s → lock → score → next/end)

**Recommended Actions**:

1. **Immediate** (Today):
   - [ ] Run manual integration test following Test 1 scenario above
   - [ ] Verify all 6 test scenarios pass
   - [ ] Document test results in `docs/followup-test-results.md`

2. **Short-term** (This week):
   - [ ] Write automated test: `test/integration/specs/followup-questions.test.ts`
   - [ ] Add to CI pipeline after verification
   - [ ] Mark TASK-212 as ✅ COMPLETE in docs/status.md

3. **Next Priority** (Blocks MVP):
   - [ ] **TASK-307**: Web Player Followup UI (depends on backend)
   - [ ] iOS Host followup view (pro-vy monitoring)
   - [ ] tvOS followup view (question + timer display)

---

## 8. Quick Verification Commands

### Start Backend Server
```bash
cd services/backend
npm run dev
```

### Create Session & Join as 3 Players
```bash
# 1. Create session (as host)
curl -X POST http://localhost:3000/v1/sessions | jq .

# 2. Join as players (repeat 3x with different names)
curl -X POST http://localhost:3000/v1/sessions/SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{"playerName": "Alice"}' | jq .
```

### Connect via WebSocket & Trigger Followup
```bash
# Use wscat or similar WebSocket client
wscat -c "ws://localhost:3000/ws?token=HOST_TOKEN"

# Start game
{"type":"HOST_START_GAME","sessionId":"SESSION_ID","serverTimeMs":0,"payload":{}}

# Advance through 5 clues (send 5 times)
{"type":"HOST_NEXT_CLUE","sessionId":"SESSION_ID","serverTimeMs":0,"payload":{}}

# After 5th clue → DESTINATION_REVEAL → DESTINATION_RESULTS
# → Wait ~5s → FOLLOWUP_QUESTION_PRESENT should appear
```

### Expected Console Output
```
[server] Starting followup sequence for destination: Paris
[server] Followup question 0 of 2: Vilket år byggdes Eiffel Tower?
[server] Scheduled followup timer: 15000 ms
[server] Timer fired: locking answers
[server] Locked 2 answers
[server] Scoring followup question 0
[server] Followup results: 2 correct, next question: 1
[server] Followup question 1 of 2: Vilken flod flödar genom Paris?
[server] Scheduled followup timer: 15000 ms
[server] Timer fired: locking answers
[server] Followup sequence complete → SCOREBOARD
```

---

## Appendix A: Implementation File Map

### Core Files (Backend)
| File | Lines | Purpose |
|------|-------|---------|
| `contracts/events.schema.json` | 662-862 | Event definitions (v1.3.0) |
| `contracts/state.schema.json` | 121-179 | State structure |
| `services/backend/src/game/state-machine.ts` | 459-662 | Core logic (4 functions) |
| `services/backend/src/game/content-hardcoded.ts` | 18-224 | Hardcoded questions + matching |
| `services/backend/src/server.ts` | 381-383, 1201-1724 | Message handlers + timer |
| `services/backend/src/utils/event-builder.ts` | (search FOLLOWUP) | Event construction |
| `services/backend/src/utils/state-projection.ts` | (search followup) | Per-role filtering |
| `services/backend/src/game/audio-director.ts` | (search Followup) | Audio events |

### Documentation
| File | Purpose |
|------|---------|
| `docs/followup-flow.md` | Flow diagram (if exists) |
| `docs/backend-followups.md` | Backend implementation notes |
| `docs/sprint-1.md` | Original task definition (TASK-212) |

---

## Appendix B: Event Sequence Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ After DESTINATION_REVEAL + DESTINATION_RESULTS                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ startFollowupSequence() │
              └─────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
       Has questions?                  No questions?
            │                               │
            ▼                               ▼
   ┌─────────────────┐            ┌─────────────────┐
   │ SCOREBOARD_     │            │ SCOREBOARD_     │
   │ UPDATE (pre)    │            │ UPDATE (final)  │
   └─────────────────┘            └─────────────────┘
            │                               │
            ▼                               END
   ┌─────────────────┐
   │ Generate intro  │
   │ TTS voice       │
   └─────────────────┘
            │
            ▼ (wait introDurationMs + 1.5s)
   ┌─────────────────┐
   │ onFollowupStart │
   │ (music swap)    │
   └─────────────────┘
            │
            ▼
   ┌─────────────────┐
   │ STATE_SNAPSHOT  │
   └─────────────────┘
            │
            ▼
   ┌─────────────────┐
   │ FOLLOWUP_       │
   │ QUESTION_       │
   │ PRESENT         │
   └─────────────────┘
            │
            ▼
   ┌─────────────────┐
   │ AUDIO_PLAY      │
   │ (question TTS)  │
   └─────────────────┘
            │
            ▼
   ┌─────────────────┐
   │ scheduleTimer   │
   │ (15s countdown) │
   └─────────────────┘
            │
            │ Players submit answers
            │ via FOLLOWUP_ANSWER_SUBMIT
            │
            ▼ (timer fires after 15s)
   ┌─────────────────┐
   │ lockFollowup    │
   │ Answers()       │
   └─────────────────┘
            │
            ▼
   ┌─────────────────┐
   │ FOLLOWUP_       │
   │ ANSWERS_LOCKED  │
   └─────────────────┘
            │
            ▼
   ┌─────────────────┐
   │ scoreFollowup   │
   │ Question()      │
   └─────────────────┘
            │
            ▼
   ┌─────────────────┐
   │ FOLLOWUP_       │
   │ RESULTS         │
   └─────────────────┘
            │
            │
            ▼ (wait 4s for results display)
       ┌─────────┴─────────┐
       │                   │
  Next question?      Last question?
       │                   │
       ▼                   ▼
┌─────────────┐   ┌─────────────────┐
│ Generate    │   │ onFollowup      │
│ next voice  │   │ SequenceEnd     │
└─────────────┘   │ (stop music)    │
       │          └─────────────────┘
       ▼                   │
┌─────────────┐            ▼
│ STATE_      │   ┌─────────────────┐
│ SNAPSHOT    │   │ STATE_SNAPSHOT  │
└─────────────┘   └─────────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐   ┌─────────────────┐
│ FOLLOWUP_   │   │ MUSIC_STOP      │
│ QUESTION_   │   └─────────────────┘
│ PRESENT     │            │
└─────────────┘            ▼
       │          ┌─────────────────┐
       │          │ SCOREBOARD_     │
       │ (LOOP)   │ UPDATE          │
       │          └─────────────────┘
       │                   │
       └───────────────────┘
                           │
                           END → FINAL_RESULTS (TASK-213)
```

---

**END OF DIRECTIVES**

---

**Questions for Backend Agent**:

1. Can you manually verify Test Scenario 1 (Basic Followup Flow) by running the backend and connecting 3 WebSocket clients?
2. Are there any edge cases not covered in the test scenarios above?
3. Should we add automated tests before marking TASK-212 complete, or is manual verification sufficient for MVP?

**CC**: @agent-ceo @agent-backend
