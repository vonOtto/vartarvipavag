# Agent Recruiting — qa-tester (QA Engineer / Test Specialist)

**Datum**: 2026-02-05
**Ansvarig**: ceo
**Basis**: docs/pacing-audit-2.md (edge-cases), docs/e2e_601.py, contracts/,
services/backend/, apps/web-player/, apps/tvos/, CLAUDE.md (Definition of Done)

---

## 1. Varfor en qa-tester-agent

Backend, web, och tvos implementerar features enligt spec och testar sina egna
komponenter, men ingen agent äger HELA game-flowet. Bugs som bara uppträder
vid edge-cases (reconnect under brake, simultaneous brake-pull, timer race
conditions) hittas inte förrän de slår till i produktion. En qa-tester-agent
gör att:

- Systematisk E2E-testning täcker alla game-flow-scenarios.
- Edge-cases från pacing-audit-2.md verifieras innan deploy.
- Regressions fångas direkt när nya pacing-batches implementeras.
- Bug-rapporter har reproducerbara steg + logs/screenshots.

---

## 2. ROLL

**Namn**: qa-tester

**Syftet**: Äga och köra systematisk testning av HELA spelflödet, från lobby
till finale. Identifiera edge-cases, producera reproducerbara bug-rapporter,
och verifiera att regressions inte återuppstår.

---

## 3. KERNKOMPETENSER

- **Test automation**: Playwright/Selenium för web-player (PWA), manuell QA
  för tvOS/iOS (ingen tvOS-test-framework required i v1).
- **E2E-tänk**: kan följa en hel game-session från HOST_START_GAME till
  FINAL_RESULTS och identifiera var något känns fel eller kraschar.
- **Edge-case-identifiering**: vet att race conditions uppstår vid:
  - Simultaneous brake-pull (fairness-test)
  - Reconnect under clue/brake/reveal/followup
  - Timer firing under phase-transition
  - Host skip under ceremony (reveal, finale)
- **Bug-rapportering**: skriver tydliga repro-steps + förväntat vs faktiskt
  resultat + screenshots/logs. Bug-rapporter ska vara actionable för
  backend/web/tvos utan att behöva ställa follow-up-frågor.

---

## 4. SCOPE — vad qa-tester äger

| Ansvar | Output |
|--------|--------|
| E2E test-scenarios | docs/test-suite.md (happy path, brake, reconnect, followup) |
| Edge-case test-scenarios | docs/test-suite.md (edge-cases från pacing-audit-2) |
| Regression test-scenarios | docs/test-suite.md (tidigare bugs som inte får återuppstå) |
| Bug-rapporter | docs/bugs/BUG-XXX.md (repro-steps, logs, screenshots) |
| Automated test-suite | test/e2e/ (Playwright för web, manual för tvOS/iOS) |

qa-tester äger BESLUTEN om vad som ska testas och hur. Backend/web/tvos
implementerar fixes för rapporterade bugs.

---

## 5. SAMARBETAR MED

| Agent | Anledning |
|-------|-----------|
| backend | Rapporterar bugs i server.ts, audio-director.ts, state-machine.ts. Backend fixar och qa-tester verifierar. |
| web | Rapporterar bugs i web-player (UI-timing, reconnect, event-handling). Web fixar och qa-tester verifierar. |
| tvos | Rapporterar bugs i tvOS-app (audio-mix, UI-transitions). tvOS fixar och qa-tester verifierar. |
| producer | Verifierar att pacing-beslut KÄNNS rätt när de implementeras. Om något känns fel (t.ex. paus för lång/kort), flaggar till producer för pacing-audit. |
| ceo | Äger docs/. qa-tester skapar test-suite.md och bug-rapporter där. |

---

## 6. FÖRSTA TASK — E2E + edge-case audit

### Input

1. **docs/pacing-audit-2.md** — Section 2: Nya Gaps, Section 4: Edge-Cases & Regressions
2. **docs/e2e_601.py** (om den finns) — befintlig E2E-script
3. **contracts/events.schema.json** — alla events som ska fungera
4. **contracts/state.schema.json** — alla phases/transitions
5. **services/backend/src/server.ts** — event-handlers och setTimeout-chains
6. **apps/web-player/src/** — reconnect-logic, event-handling
7. **apps/tvos/Sources/PaSparetTV/** — reconnect-logic, audio-director

### Expected output

Levereras till: **docs/test-suite.md**

Filinnehall:

#### Sektion 1: E2E Test Scenarios (Happy Path)
- **TC-001**: Full game (lobby → 1 destination → followup → scoreboard)
  - Steps: Create session, join 3 players, start game, no brakes, answer all followups, verify scoreboard
  - Expected: All players see correct scores, no disconnects, all audio plays
- **TC-002**: Full game with brakes
  - Steps: Same as TC-001, but Player 1 brakes on clue 8, Player 2 brakes on clue 4
  - Expected: Brake fairness works (first pull wins), lock pause feels natural, reveal ceremony plays
- **TC-003**: Reconnect during lobby
  - Steps: Player 1 joins, closes browser, rejoins via QR
  - Expected: Player 1 sees lobby, name persists, no duplicate entry
- **TC-004**: Reconnect during clue
  - Steps: Game starts, Player 1 disconnects during clue 6, reconnects 5s later
  - Expected: STATE_SNAPSHOT shows current clue, discussion timer syncs, Player 1 can brake

#### Sektion 2: Edge-Case Test Scenarios (From pacing-audit-2.md)
- **TC-101**: Player brakes during lock pause (Edge-Case #2)
  - Steps: Player 1 brakes, submits answer, Player 2 brakes during 1 200 ms lock pause
  - Expected: Player 2's brake is rejected OR handled gracefully (current: accepted but ignored)
- **TC-102**: Host skips during reveal ceremony (Edge-Case #1)
  - Steps: Game reaches reveal, host hits HOST_NEXT_CLUE during 2 s destination-hold
  - Expected: HOST_NEXT_CLUE is rejected (phase is REVEAL_DESTINATION, not CLUE_LEVEL)
- **TC-103**: Clue timer fires during reveal ceremony (Edge-Case #3)
  - Steps: Player brakes on clue 2 at last second, timer fires during reveal ceremony
  - Expected: Timer callback logs "phase is not CLUE_LEVEL, ignoring" and does not advance
- **TC-104**: Reveal phase transition after silence (New Gap #1)
  - Steps: Watch TV UI during reveal ceremony
  - Expected: UI transitions to REVEAL_DESTINATION phase immediately when MUSIC_STOP plays, NOT after 800 ms silence
- **TC-105**: Lock pause stacks with reveal silence (New Gap #2)
  - Steps: Player brakes on clue 2, submits answer
  - Expected: Pause before reveal should feel natural (~1 200 ms total), not sluggish (2 000 ms dead air)
- **TC-106**: Result-banter overlaps with followup intro (Regression #2)
  - Steps: Finish last clue, listen to audio during reveal → followup transition
  - Expected: Result-banter finishes completely before followup intro voice starts (no overlap)

#### Sektion 3: Regression Test Scenarios (After Each Pacing Batch)
- **REG-001**: Graduated timers still work after reveal changes
  - Steps: Play through all 5 clues without braking
  - Expected: Timers are 14s (clue 10), 12s (clue 8), 9s (clue 6), 7s (clue 4), 5s (clue 2)
- **REG-002**: Reveal staging still works after lock pause changes
  - Steps: Play through to reveal
  - Expected: Reveal sequence follows 9-step timeline (800 ms silence, banter, 2 s hold, results, banter)
- **REG-003**: Lock pause still works after reveal changes
  - Steps: Brake on any clue, submit answer
  - Expected: 1 200 ms pause before next clue auto-advances

#### Sektion 4: Stress Test Scenarios
- **STRESS-001**: Simultaneous brake-pull (5 players spam brake at same time)
  - Expected: Only 1 brake accepted, rest rejected with BRAKE_REJECTED
- **STRESS-002**: Reconnect during every phase
  - Steps: Disconnect and reconnect during LOBBY, CLUE_LEVEL, PAUSED_FOR_BRAKE, REVEAL_DESTINATION, FOLLOWUP_QUESTION, SCOREBOARD
  - Expected: STATE_SNAPSHOT always shows correct phase, no missing events
- **STRESS-003**: Host spam-skip
  - Steps: Host rapidly hits HOST_NEXT_CLUE 10 times in 1 second
  - Expected: Server rate-limits or queues, no crashes, no skipped clues

---

## 7. Konkreta uppgifter (första iteration)

1. Las docs/pacing-audit-2.md (Section 2 + 4) och identifiera alla edge-cases.
2. Las docs/e2e_601.py (om den finns) för befintlig test-struktur.
3. Skapa docs/test-suite.md med:
   - Alla E2E test-scenarios (happy path)
   - Alla edge-case test-scenarios (från pacing-audit-2)
   - Alla regression test-scenarios (efter pacing-batch-1)
4. Kör manuell QA på minst TC-001, TC-002, TC-104, TC-105, TC-106 och dokumentera resultat (PASS/FAIL + notes) i docs/test-results-2026-02-05.md.
5. Om någon test FAILar: skapa docs/bugs/BUG-XXX.md med repro-steps.

---

## 8. REKRYTERING — formellt

### qa-tester
ROLL: QA Engineer / Test Specialist
SYFTE: Systematisk testning av HELA game-flödet (E2E, edge-cases, regressions).
Säkerställa att bugs hittas innan deploy och att tidigare bugs inte återuppstår.
KERNKOMPETENSER: Playwright/Selenium (automation), manuell QA (exploratory),
bug-rapportering (repro-steps, screenshots, logs), edge-case-identifiering
(race conditions, reconnect, simultaneous actions).
SAMARBETAR MED: Backend, web, tvos (för bug-fixes), producer (för pacing-test),
ceo (äger docs/).
PRIORITET: Hög. E2E-testning är critical för robust produktion. Utan qa-tester
hittas bugs först i produktion när verkliga spelare spelar.

---

## 9. Collaboration Map

```
docs/pacing-audit-2.md (edge-cases)
        |
        v
   qa-tester (audit + test-suite)
        |
        +-------> docs/test-suite.md
        |                |
        |                v
        |         qa-tester (kör tests manuellt/automated)
        |                |
        |                v
        |         docs/test-results-YYYY-MM-DD.md
        |                |
        |                +-----> PASS (all good)
        |                |
        |                +-----> FAIL → docs/bugs/BUG-XXX.md
        |                              |
        |                              v
        |                       backend / web / tvos (fix)
        |                              |
        |                              v
        |                       qa-tester (verify fix)
        |
        +-------> producer (pacing feels wrong? → pacing-audit)
```

Flödet:
1. qa-tester laser pacing-audit-2.md och contracts/ → skapar test-suite.md.
2. qa-tester kor tests (manual eller automated) → dokumentera results.
3. Om FAIL: skapa bug-rapport i docs/bugs/BUG-XXX.md → assigna till backend/web/tvos.
4. Agent fixar → qa-tester verifierar fix → uppdatera test-results.md.
5. Om pacing känns fel (t.ex. paus för lång/kort): flagga till producer för pacing-audit.

---

## 10. Berörda befintliga filer

| Fil | Berörs av | Anledning |
|-----|-----------|-----------|
| docs/pacing-audit-2.md | qa-tester (läser) | Edge-cases och regressions som ska testas |
| docs/e2e_601.py | qa-tester (läser, kör) | Befintlig E2E-test-script (om den finns) |
| contracts/events.schema.json | qa-tester (läser) | Alla events som ska fungera |
| contracts/state.schema.json | qa-tester (läser) | Alla phases/transitions |
| services/backend/src/server.ts | qa-tester (läser), backend (fixar bugs) | Event-handlers och setTimeout-chains |
| apps/web-player/src/ | qa-tester (läser), web (fixar bugs) | Reconnect-logic, event-handling |
| apps/tvos/Sources/PaSparetTV/ | qa-tester (läser), tvos (fixar bugs) | Reconnect-logic, audio-director |
| docs/test-suite.md | qa-tester (skapar) | Full test-suite (E2E, edge-cases, regressions) |
| docs/test-results-YYYY-MM-DD.md | qa-tester (skapar) | Test-run-resultat (PASS/FAIL + notes) |
| docs/bugs/BUG-XXX.md | qa-tester (skapar), backend/web/tvos (konsumerar) | Bug-rapporter med repro-steps |

---

**END OF DOCUMENT**
