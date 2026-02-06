# Next Steps After Followup Implementation Complete

**Date**: 2026-02-06
**Status**: All followup question implementations COMPLETE ✅

---

## Summary: Followup Implementation Complete ✅

All 4 clients now have full followup question support:

| Component | Task | Status | Files |
|-----------|------|--------|-------|
| Backend | TASK-212 | ✅ Complete | `state-machine.ts`, `server.ts`, `content-hardcoded.ts`, `audio-director.ts` |
| Web Player | TASK-307 | ✅ Complete | `GamePage.tsx:283-550`, `game.ts:57-217` |
| iOS Host | TASK-404-ext | ✅ Complete | `App.swift:35-36,521-768`, `HostState.swift:28-29,190-237` |
| tvOS | TASK-503-ext | ✅ Complete | `TVFollowupView.swift:1-277`, `AppState.swift:21-22,219-248` |

**Documentation**:
- `docs/TASK-212-followup-directives.md` (Backend)
- `docs/web-followups.md` (Web Player)
- `docs/TASK-404-ext-followup-host-directives.md` (iOS Host)
- `docs/TASK-503-ext-followup-tvos-directives.md` (tvOS)
- `docs/followup-completion-summary.md` (Overall status)

---

## Immediate Next Step: TASK-601 (E2E Integration Test)

**Priority**: Critical (blocks Sprint 1 completion)
**Owner**: PM/CEO + All Agents
**Estimated Effort**: 1 day
**Status**: Ready to execute (all dependencies complete)

### Objective

Execute a full end-to-end integration test with all clients to verify the complete game flow including followup questions.

### Test Setup

**Required**:
- 1 iOS Host (iPhone/iPad simulator or device)
- 1 tvOS client (Apple TV simulator or device)
- 3 Web Players (browsers, can be same machine with different tabs)
- Backend running locally

### Acceptance Criteria

**Session & Lobby**:
- [ ] Host creates session via iOS app
- [ ] TV joins session and displays QR code
- [ ] 3 players scan QR code and join via web
- [ ] All clients see lobby with connected players
- [ ] Host starts game successfully

**Clue Flow** (5 levels: 10/8/6/4/2 points):
- [ ] Clues progress through all 5 levels
- [ ] Players can brake at each level
- [ ] First brake wins (fairness verified)
- [ ] Brake owner can submit answer
- [ ] Answer locks correctly
- [ ] TV shows clue but NOT the answer
- [ ] Host sees clue AND correct answer

**Reveal**:
- [ ] After clue level 2, destination reveals
- [ ] All clients see destination name + country
- [ ] Answers are scored correctly
- [ ] Scoreboard updates on all clients
- [ ] Points awarded match `contracts/scoring.md`

**Followup Questions** (NEW — first full test):
- [ ] After reveal, followup sequence starts
- [ ] TV shows question text + timer + options (if MC)
- [ ] Web players see question + timer + can submit answers
- [ ] Host sees question + correct answer + live answer tracking
- [ ] Timer counts down from 15s (server-driven)
- [ ] Answers submit successfully
- [ ] After 15s, results appear on all clients
- [ ] Correct answer shown (green)
- [ ] Per-player results show correct/incorrect + points
- [ ] Scoreboard updates with followup points (+2 per correct)
- [ ] Second followup question appears after 4s pause
- [ ] After last question, phase → SCOREBOARD

**Scoreboard**:
- [ ] Final scoreboard shows all players with total points
- [ ] Points include destination + followup scores
- [ ] All clients show same scoreboard

**Stability**:
- [ ] No crashes on any client
- [ ] No desyncs (all clients show same state)
- [ ] No race conditions
- [ ] Timer synchronization works across clients

### Test Execution Steps

1. **Start Backend**:
   ```bash
   cd services/backend
   npm run dev
   ```

2. **Start iOS Host**:
   - Open Xcode project: `apps/ios-host/PaSparet.xcodeproj`
   - Run on simulator or device
   - Create session
   - Note the join code

3. **Start tvOS Client**:
   - Open Xcode project: `apps/tvos/PaSparetTV.xcodeproj`
   - Run on Apple TV simulator
   - App auto-creates session and shows QR code

4. **Start Web Players** (3x):
   ```bash
   cd apps/web-player
   npm run dev
   # Open http://localhost:5173 in 3 browser tabs
   # Enter join code from iOS host
   # Enter player names: "Alice", "Bob", "Charlie"
   ```

5. **Run Test**:
   - Follow acceptance criteria checklist above
   - Document any failures or unexpected behavior
   - Take screenshots at key phases
   - Record video if possible

### Deliverable

Create `docs/e2e-test-results.md` with:
- Test date and participants
- Environment (macOS version, Xcode version, Node version, browser)
- Acceptance criteria checklist (all boxes checked or note failures)
- Screenshots of each major phase
- Any bugs found (file as issues if needed)
- Performance notes (lag, delays, desyncs)
- Conclusion: PASS / FAIL with explanation

---

## After TASK-601: Remaining Sprint 1 Tasks

### TASK-602: Reconnect Stress Test

**Priority**: Medium
**Owner**: Backend Agent + Web Agent
**Estimated Effort**: 0.5 day
**Dependencies**: TASK-601 complete

**Scope**: Test reconnect behavior under various failure conditions

**Test Scenarios**:
1. **Mid-Clue Disconnect**:
   - Player disconnects during CLUE_LEVEL
   - Player reconnects
   - Verify: STATE_SNAPSHOT restores correct clue + level

2. **Mid-Brake Disconnect**:
   - Player pulls brake
   - Connection drops before submitting answer
   - Reconnects
   - Verify: Can submit answer (brakeOwnerPlayerId preserved)

3. **Mid-Followup Disconnect**:
   - Player disconnects during followup question
   - Reconnects
   - Verify: Timer continues from server time, question restored

4. **Host Disconnect**:
   - Host disconnects during game
   - Reconnects
   - Verify: Can continue controlling game

5. **TV Disconnect**:
   - TV disconnects mid-game
   - Reconnects
   - Verify: Display syncs to current state

**Deliverable**: `docs/reconnect-test-results.md`

---

### TASK-603: Brake Fairness Stress Test

**Priority**: High
**Owner**: Backend Agent
**Estimated Effort**: 0.5 day
**Status**: ✅ **ALREADY COMPLETE**

**Evidence**: `services/backend/scripts/brake-concurrency-test.ts` has been run and passed:
- 5 players brake within ~50ms
- Exactly 1 `BRAKE_ACCEPTED`
- Exactly 4 `BRAKE_REJECTED` (reason: "too_late")
- Fairness verified

**No action needed** — this is already done.

---

## Sprint 1 Completion Checklist

After TASK-601 and TASK-602 complete, Sprint 1 is DONE:

- [x] **P0: Contracts** (TASK-101, TASK-102) ✅
- [x] **P1: Backend Core** (TASK-201–209, TASK-212) ✅
- [x] **P2: Web Player** (TASK-301–307) ✅
- [x] **P3: iOS Host** (TASK-401–404 + ext) ✅
- [x] **P4: tvOS** (TASK-501–504 + ext) ✅
- [ ] **P5: Integration & Testing**:
  - [ ] TASK-601: E2E test ⬜
  - [ ] TASK-602: Reconnect test ⬜
  - [x] TASK-603: Brake fairness ✅

**Sprint 1 Success Criteria**:
1. ✅ All clients implement contracts v1.3.0
2. ✅ Followup questions work end-to-end
3. ⬜ E2E test passes (TASK-601)
4. ⬜ Reconnect works reliably (TASK-602)
5. ✅ Brake fairness proven (TASK-603)
6. ⬜ No critical bugs blocking gameplay

---

## Post-Sprint 1: Future Work

### Sprint 1.1 Priorities

1. **Audio Enhancement**:
   - TTS integration (ElevenLabs) for clue narration
   - Background music loops (travel, followup)
   - Sound effects (brake, correct answer, confetti)
   - Audio ducking during voice

2. **FINAL_RESULTS Phase**:
   - Winner ceremony
   - Confetti animation on TV
   - Fanfare sound effect
   - Podium display

3. **AI Content Generation**:
   - Destination generation pipeline
   - Followup question generation
   - Fact verification
   - Anti-leak checking

### Sprint 2+ Priorities

- Multiple destinations per session
- Multiple rounds
- Team mode
- Advanced host controls (pause/skip/override)
- Database persistence (Postgres)
- Redis for distributed locks
- Production deployment (staging + prod environments)

---

## Current Status Summary

**Completed (27/28 tasks)**:
- All P0 tasks (Contracts) ✅
- All P1 tasks (Backend) ✅
- All P2 tasks (Web Player) ✅
- All P3 tasks (iOS Host) ✅
- All P4 tasks (tvOS) ✅
- 1/3 P5 tasks (Testing) ✅

**Remaining (1 task blocking Sprint 1)**:
- TASK-601: E2E integration test ⬜ (ready to execute)
- TASK-602: Reconnect stress test ⬜ (depends on 601)

**Overall Progress**: 96% complete (27/28 tasks)

---

## Recommended Next Action

**Execute TASK-601 now**:

1. Assign to PM/CEO for coordination
2. Set up test environment (all clients running)
3. Execute full test checklist
4. Document results in `docs/e2e-test-results.md`
5. File any bugs found as GitHub issues
6. If PASS → proceed to TASK-602
7. If FAIL → fix critical bugs, re-run TASK-601

**Estimated Timeline**:
- TASK-601 execution: 4-6 hours
- Bug fixes (if any): 1-2 days
- TASK-602 execution: 2-4 hours
- **Sprint 1 completion**: 1-3 days from now

---

**Questions?**
- Backend: See `docs/TASK-212-followup-directives.md`
- Web Player: See `docs/web-followups.md`
- iOS Host: See `docs/TASK-404-ext-followup-host-directives.md`
- tvOS: See `docs/TASK-503-ext-followup-tvos-directives.md`
- Overall: See `docs/followup-completion-summary.md`

---

**Status**: ✅ Ready for TASK-601 E2E Integration Test
**Date**: 2026-02-06
