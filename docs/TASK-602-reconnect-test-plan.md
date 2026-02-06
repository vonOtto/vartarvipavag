# TASK-602: Reconnect Stress Test — Detailed Plan

**Date**: 2026-02-06
**Priority**: Medium
**Owner**: Backend Agent
**Status**: Ready to execute
**Dependencies**: TASK-601 (E2E test) complete

---

## Objective

Test reconnect behavior under various failure conditions to verify that all clients can recover from network interruptions without losing game state.

**Success Criteria**: All test scenarios pass, reconnect works reliably, state is preserved.

---

## Prerequisites

### What's Already Implemented ✅

#### Backend (services/backend/)
- ✅ Grace period reconnect (60s)
- ✅ `disconnectedAt` timestamp on players
- ✅ `RESUME_SESSION` handler
- ✅ STATE_SNAPSHOT on reconnect
- ✅ Grace period timer cleanup
- ✅ Reconnect test script: `scripts/reconnect-test.ts` (12/12 assertions passed)

#### Web Player (apps/web-player/)
- ✅ Auto-reconnect with exponential backoff
- ✅ Initial delay: 1s
- ✅ Max delay: 10s
- ✅ Max attempts: 10
- ✅ STATE_SNAPSHOT restore on reconnect
- ✅ `useWebSocket` hook handles reconnect

#### iOS Host (apps/ios-host/)
- ✅ Exponential backoff: 1s → 2s → 4s → 8s → 10s (capped)
- ✅ Max attempts: 10
- ✅ Reconnect banner displayed when `isConnected = false`
- ✅ `sendResume()` on WELCOME
- ✅ STATE_SNAPSHOT restore

#### tvOS (apps/tvos/)
- ✅ Exponential backoff: 1s → 2s → 4s → 8s → 10s (capped)
- ✅ Max attempts: 10
- ✅ Reconnect banner on all views
- ✅ `sendResume()` on WELCOME
- ✅ Re-issue looping music on reconnect
- ✅ Confetti trigger on reconnect into FINAL_RESULTS

---

## Test Scenarios

### Scenario 1: Mid-Clue Disconnect (Web Player)

**Setup**:
1. Start backend + iOS host + tvOS + 3 web players
2. Start game, advance to clue level 8

**Test Steps**:
1. In web player tab (Alice), open browser DevTools
2. Network tab → Throttle to "Offline"
3. Wait 5 seconds
4. Network tab → Throttle to "Online"
5. Observe reconnect

**Expected Behavior**:
- [ ] Web player shows "Reconnecting..." or connection lost message
- [ ] Auto-reconnect attempts start (console logs show attempts)
- [ ] After coming online, WebSocket reconnects within 2-5 seconds
- [ ] STATE_SNAPSHOT received
- [ ] Game state restored: phase = CLUE_LEVEL, correct clue text, points = 8
- [ ] Alice can interact normally (brake button works)

**Backend Verification**:
- [ ] Player marked as `disconnectedAt` after disconnect
- [ ] Grace period timer started (60s)
- [ ] Timer cancelled on reconnect
- [ ] `PLAYER_LEFT` broadcast with reason: 'disconnect'
- [ ] STATE_SNAPSHOT sent to reconnecting player
- [ ] STATE_SNAPSHOT broadcast to other clients (Alice reconnected)

**Screenshot**: `screenshots/reconnect-01-mid-clue.png`

---

### Scenario 2: Mid-Brake Disconnect (Brake Owner)

**Setup**:
1. Game running, clue level 6
2. Alice pulls brake
3. Alice has answer form open

**Test Steps**:
1. Alice disconnects WebSocket (DevTools offline)
2. Wait 10 seconds
3. Alice reconnects (DevTools online)

**Expected Behavior**:
- [ ] Before reconnect:
  - Bob & Charlie see "Alice äger bromsen" (paused state)
  - iOS Host sees Alice as brake owner
  - tvOS shows brake owner
- [ ] After reconnect:
  - Alice receives STATE_SNAPSHOT with phase = PAUSED_FOR_BRAKE
  - Alice sees answer form again
  - `brakeOwnerPlayerId` preserved (Alice is still owner)
  - Alice can submit answer successfully

**Backend Verification**:
- [ ] `brakeOwnerPlayerId` NOT reset during disconnect
- [ ] Grace period preserves brake ownership
- [ ] Alice can submit `BRAKE_ANSWER_SUBMIT` after reconnect

**Screenshot**: `screenshots/reconnect-02-mid-brake.png`

---

### Scenario 3: Mid-Followup Disconnect (During Question)

**Setup**:
1. Game at FOLLOWUP_QUESTION phase
2. Timer at 10s remaining
3. Alice has NOT answered yet

**Test Steps**:
1. Alice disconnects
2. Wait 5 seconds (timer continues on server)
3. Alice reconnects

**Expected Behavior**:
- [ ] Server timer continues counting (does NOT pause)
- [ ] After reconnect:
  - STATE_SNAPSHOT includes `followupQuestion` with current state
  - Timer shows ~5s remaining (server-driven)
  - Alice can submit answer before timer expires
  - If Alice submits, answer counted

**Backend Verification**:
- [ ] Timer NOT paused during disconnect
- [ ] Timer NOT reset on reconnect
- [ ] `followupQuestion.timer.startAtServerMs` preserved
- [ ] Alice's answer accepted if submitted before deadline

**Screenshot**: `screenshots/reconnect-03-mid-followup.png`

---

### Scenario 4: Mid-Followup Disconnect (After Answering)

**Setup**:
1. FOLLOWUP_QUESTION phase
2. Alice already submitted answer
3. Timer at 7s remaining

**Test Steps**:
1. Alice disconnects
2. Wait 8 seconds (timer expires during disconnect)
3. Alice reconnects

**Expected Behavior**:
- [ ] Timer expires on server (15s total)
- [ ] Server broadcasts FOLLOWUP_RESULTS to all connected clients
- [ ] When Alice reconnects:
  - STATE_SNAPSHOT includes results (if phase still FOLLOWUP_QUESTION)
  - OR phase already advanced to next question/scoreboard
  - Alice sees results for question she answered
  - Alice's answer included in results

**Backend Verification**:
- [ ] Alice's answer preserved during disconnect
- [ ] Alice included in results even if disconnected when timer expired
- [ ] Points awarded correctly

**Screenshot**: `screenshots/reconnect-04-followup-after-answer.png`

---

### Scenario 5: Host Disconnect

**Setup**:
1. Game running, clue level 4
2. iOS Host app running

**Test Steps**:
1. In Xcode, stop simulator OR toggle network off on device
2. Wait 5 seconds
3. Restart simulator OR network on

**Expected Behavior**:
- [ ] During disconnect:
  - iOS Host shows "Återansluter..." banner
  - Other clients continue to see current state
  - Host role preserved on server
- [ ] After reconnect:
  - STATE_SNAPSHOT restores full game state
  - Host sees clue + correct answer
  - Host controls (HOST_NEXT_CLUE, HOST_SKIP_TO_REVEAL) work
  - No duplicate session created

**Backend Verification**:
- [ ] Host marked with `disconnectedAt`
- [ ] Host NOT removed from session
- [ ] Grace period applies to host
- [ ] Host can send commands after reconnect

**Screenshot**: `screenshots/reconnect-05-host.png`

---

### Scenario 6: TV Disconnect

**Setup**:
1. Game running, REVEAL_DESTINATION phase
2. tvOS app displaying destination

**Test Steps**:
1. In Xcode, stop tvOS simulator
2. Wait 10 seconds
3. Restart simulator, app auto-reconnects

**Expected Behavior**:
- [ ] During disconnect:
  - tvOS shows last known state (cached)
  - Other clients unaffected
- [ ] After reconnect:
  - STATE_SNAPSHOT received
  - TV displays current phase (may have advanced)
  - Correct destination + scoreboard shown
  - Audio state restored (music re-issued if needed)

**Backend Verification**:
- [ ] TV role preserved
- [ ] STATE_SNAPSHOT sent with TV projection (no secrets)

**Screenshot**: `screenshots/reconnect-06-tv.png`

---

### Scenario 7: Grace Period Expiry (60s timeout)

**Setup**:
1. Game running, clue level 10
2. Alice (web player) joins

**Test Steps**:
1. Alice disconnects (close browser tab)
2. Wait 65 seconds
3. Check other clients

**Expected Behavior**:
- [ ] After ~60 seconds:
  - Backend broadcasts `PLAYER_LEFT` with reason: 'timeout'
  - Bob & Charlie see Alice removed from player list
  - iOS Host sees Alice removed
  - tvOS sees Alice removed
- [ ] If Alice tries to reconnect after 65s:
  - Reconnect fails (session no longer has player)
  - Alice must join again via `/join` endpoint

**Backend Verification**:
- [ ] Grace period timer fires after 60s
- [ ] Player removed from session
- [ ] `PLAYER_LEFT` broadcast with reason: 'timeout'

**Screenshot**: `screenshots/reconnect-07-grace-expiry.png`

---

### Scenario 8: Multiple Rapid Reconnects

**Setup**:
1. Game running, clue level 6

**Test Steps**:
1. Alice disconnects
2. Wait 2s, reconnect
3. Immediately disconnect again
4. Wait 3s, reconnect
5. Immediately disconnect again
6. Wait 1s, reconnect

**Expected Behavior**:
- [ ] Each reconnect succeeds
- [ ] Grace period timer resets on each disconnect
- [ ] No memory leaks (check backend heap)
- [ ] No duplicate timers
- [ ] State remains consistent

**Backend Verification**:
- [ ] Old grace period timers cancelled when new disconnect occurs
- [ ] No timer leaks in `_disconnectTimers` map
- [ ] Player state correct after final reconnect

**Screenshot**: `screenshots/reconnect-08-multiple.png`

---

### Scenario 9: Lobby Phase Disconnect (No Grace Period)

**Setup**:
1. Session created, 3 players in lobby
2. Game NOT started (phase = LOBBY)

**Test Steps**:
1. Alice disconnects (close tab)
2. Wait 5 seconds
3. Check other clients

**Expected Behavior**:
- [ ] Alice removed IMMEDIATELY (no grace period in LOBBY)
- [ ] LOBBY_UPDATED broadcast
- [ ] Bob & Charlie see Alice removed
- [ ] iOS Host sees Alice removed
- [ ] If Alice reconnects, must re-join via `/join` endpoint

**Backend Verification**:
- [ ] No grace period timer started
- [ ] Player removed immediately
- [ ] `PLAYER_LEFT` broadcast with reason: 'disconnect'

**Screenshot**: `screenshots/reconnect-09-lobby.png`

---

## Automated Test Script

Use existing backend test script:

```bash
cd /Users/oskar/pa-sparet-party/services/backend
npx tsx scripts/reconnect-test.ts
```

**Expected**: 12/12 assertions pass

**Scenarios Covered**:
1. ✅ Refresh mid `CLUE_LEVEL`
2. ✅ Network toggle mid `LOBBY`
3. ✅ Leave game (no auto-resume)

**Additional Manual Testing**: Scenarios 1-9 above

---

## Performance Benchmarks

| Metric | Target | Measured |
|--------|--------|----------|
| Reconnect latency | < 3s | [X]s |
| STATE_SNAPSHOT size | < 10KB | [X]KB |
| Grace period accuracy | 60s ± 1s | [X]s |
| Memory leak | 0 timers after test | [X] timers |

---

## Acceptance Criteria

- [ ] Scenario 1: Mid-clue disconnect works
- [ ] Scenario 2: Brake owner reconnect preserves ownership
- [ ] Scenario 3: Followup timer continues during disconnect
- [ ] Scenario 4: Followup results preserved after disconnect
- [ ] Scenario 5: Host reconnect works
- [ ] Scenario 6: TV reconnect works
- [ ] Scenario 7: Grace period expiry removes player
- [ ] Scenario 8: Multiple reconnects stable
- [ ] Scenario 9: Lobby disconnect immediate removal
- [ ] Automated test script passes (12/12)
- [ ] No memory leaks
- [ ] No race conditions

---

## Deliverable: Test Results Document

Create `docs/reconnect-test-results.md` with:

### Template

```markdown
# TASK-602: Reconnect Test Results

**Date**: [YYYY-MM-DD]
**Tester**: [Name]
**Duration**: [X hours]

---

## Environment

| Component | Version |
|-----------|---------|
| macOS | [version] |
| Backend | [commit hash] |
| Web Player | [commit hash] |
| iOS Host | [commit hash] |
| tvOS | [commit hash] |

---

## Test Results

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Mid-clue disconnect | ✅ / ❌ | [notes] |
| 2. Mid-brake disconnect | ✅ / ❌ | [notes] |
| 3. Mid-followup disconnect (before answer) | ✅ / ❌ | [notes] |
| 4. Mid-followup disconnect (after answer) | ✅ / ❌ | [notes] |
| 5. Host disconnect | ✅ / ❌ | [notes] |
| 6. TV disconnect | ✅ / ❌ | [notes] |
| 7. Grace period expiry | ✅ / ❌ | [notes] |
| 8. Multiple rapid reconnects | ✅ / ❌ | [notes] |
| 9. Lobby disconnect | ✅ / ❌ | [notes] |
| Automated script | ✅ / ❌ | [notes] |

---

## Performance Benchmarks

| Metric | Target | Measured | Pass |
|--------|--------|----------|------|
| Reconnect latency | < 3s | [X]s | ✅ / ❌ |
| STATE_SNAPSHOT size | < 10KB | [X]KB | ✅ / ❌ |
| Grace period accuracy | 60s ± 1s | [X]s | ✅ / ❌ |
| Memory leak | 0 timers | [X] | ✅ / ❌ |

---

## Bugs Found

[List any bugs discovered]

---

## Conclusion

**Overall Result**: ✅ PASS / ❌ FAIL

**Explanation**: [Summary]

**Blockers**: [Any issues]

---

**Signed**: [Name]
**Date**: [YYYY-MM-DD]
```

---

## Success Definition

**PASS** if:
- All 9 scenarios pass
- Automated script passes (12/12)
- No memory leaks
- Performance benchmarks meet targets

**FAIL** if:
- Any scenario fails
- Memory leaks detected
- Race conditions found

---

## Next Steps After TASK-602

### If PASS:
1. Commit test results to `docs/reconnect-test-results.md`
2. Update `docs/status.md`: TASK-602 ✅
3. **Sprint 1 COMPLETE** 🎉
4. Begin Sprint 1.1 planning (audio enhancements)

### If FAIL:
1. File bugs as GitHub issues
2. Assign to backend agent for fixes
3. Re-run TASK-602
4. Repeat until PASS

---

## Time Estimate

| Activity | Duration |
|----------|----------|
| Automated test | 5 min |
| Scenario 1-3 | 30 min |
| Scenario 4-6 | 30 min |
| Scenario 7-9 | 30 min |
| Documentation | 30 min |
| Screenshots | 20 min |
| **Total** | **~2.5 hours** |

---

**Status**: ✅ Ready to execute
**Priority**: Medium
**Dependencies**: TASK-601 complete

**Assigned to**: Backend Agent
**Due**: After TASK-601 completion
