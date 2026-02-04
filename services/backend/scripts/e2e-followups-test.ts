/**
 * E2E followup-questions test
 *
 * Scenario A — full loop
 *   destination → FQ1 (MC) → FQ2 (open-text) → SCOREBOARD_UPDATE
 *   Alice answers Q1 correctly, Q2 correctly  (+2 +2 = +4)
 *   Bob   answers Q1 incorrectly, Q2 correctly (+0 +2 = +2)
 *
 * Scenario B — reconnect mid-timer (woven into A)
 *   After Bob submits his Q1 answer the WS is closed, re-opened after 2 s,
 *   and RESUME_SESSION is sent.  The restored STATE_SNAPSHOT must contain
 *   followupQuestion with answeredByMe == true.
 *
 * Projection checks (throughout):
 *   - HOST receives correctAnswer in FOLLOWUP_QUESTION_PRESENT
 *   - PLAYER does NOT receive correctAnswer
 *   - HOST receives answersByPlayer in FOLLOWUP_ANSWERS_LOCKED
 *   - PLAYER does NOT receive answersByPlayer
 */

import WebSocket from 'ws';

const BASE_URL = 'http://localhost:3000';
const WS_URL   = 'ws://localhost:3000/ws';

// ─── correct answers per destination (mirrors content-hardcoded.ts) ─────────
const CORRECT: Record<string, { q1: string; q2: string }> = {
  'Paris'   : { q1: '1889',        q2: 'Seine'       },
  'Tokyo'   : { q1: 'Chiyoda',     q2: 'Edo'         },
  'New York': { q1: '5',           q2: 'Central Park' },
};

// wrong MC option per destination (pick a plausible-looking wrong one)
const WRONG_Q1: Record<string, string> = {
  'Paris'   : '1869',
  'Tokyo'   : 'Shinjuku',
  'New York': '4',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

interface TestResult { name: string; passed: boolean; error?: string; }
const results: TestResult[] = [];

function log (msg: string)               { console.log(`[E2E] ${msg}`); }
function pass(name: string)              { results.push({ name, passed: true  }); console.log(`  ✅ ${name}`); }
function fail(name: string, err: string) { results.push({ name, passed: false, error: err }); console.log(`  ❌ ${name}: ${err}`); }
function sleep(ms: number)               { return new Promise<void>(r => setTimeout(r, ms)); }

async function createSession() {
  const res = await fetch(`${BASE_URL}/v1/sessions`, { method: 'POST' });
  if (!res.ok) throw new Error(`create session: ${res.statusText}`);
  return (await res.json()) as any;
}

async function joinSession(sessionId: string, name: string) {
  const res = await fetch(`${BASE_URL}/v1/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`join: ${res.statusText}`);
  return (await res.json()) as any;
}

function connectWS(token: string): Promise<{ ws: WebSocket; messages: any[] }> {
  return new Promise((resolve, reject) => {
    const messages: any[] = [];
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      messages.push(msg);
      log(`  ← [${msg.type}]`);
    });
    ws.on('open',  () => resolve({ ws, messages }));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('WS open timeout')), 5000);
  });
}

function sendResume(ws: WebSocket, sessionId: string, playerId: string) {
  ws.send(JSON.stringify({
    type: 'RESUME_SESSION',
    sessionId,
    serverTimeMs: Date.now(),
    payload: { playerId, lastReceivedEventId: null },
  }));
  log('  → RESUME_SESSION');
}

/** Poll messages[] for an event matching predicate, or timeout. */
async function waitFor(
  messages: any[],
  predicate: (m: any) => boolean,
  label: string,
  ms = 20000
): Promise<any> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const evt = messages.find(predicate);
    if (evt) return evt;
    await sleep(100);
  }
  throw new Error(`timeout waiting for ${label} (${ms} ms)`);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  E2E Follow-up Questions — full loop + reconnect');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. Session + connections ──────────────────────────────────────────────
  log('1. Creating session + connecting host, Alice, Bob …');
  const { sessionId, hostAuthToken } = await createSession();
  const alice = await joinSession(sessionId, 'Alice');
  const bob   = await joinSession(sessionId, 'Bob');

  const { ws: hostWs, messages: hostMsgs }     = await connectWS(hostAuthToken);
  const { ws: aliceWs, messages: aliceMsgs }   = await connectWS(alice.playerAuthToken);
  let   { ws: bobWs,   messages: bobMsgs }     = await connectWS(bob.playerAuthToken);
  await sleep(600);
  pass('Session created, all three connected');

  // ── 2. Start game ─────────────────────────────────────────────────────────
  log('2. HOST_START_GAME …');
  hostMsgs.length = 0; aliceMsgs.length = 0; bobMsgs.length = 0;

  hostWs.send(JSON.stringify({
    type: 'HOST_START_GAME', sessionId, serverTimeMs: Date.now(), payload: {},
  }));
  await sleep(800);

  // detect destination from host snapshot
  const startSnap = hostMsgs.find((m: any) => m.type === 'STATE_SNAPSHOT');
  const destName  = startSnap?.payload?.state?.destination?.name as string | undefined;
  if (destName && CORRECT[destName]) {
    pass(`Game started — destination detected: ${destName}`);
  } else {
    fail('Destination detected', `name=${destName}`);
    process.exit(1);
  }

  const { q1: correctQ1, q2: correctQ2 } = CORRECT[destName];
  const wrongQ1 = WRONG_Q1[destName];

  // ── 3. Race through clues 10→8→6→4→2 ─────────────────────────────────────
  log('3. Advancing clues 10 → 8 → 6 → 4 → 2 …');
  for (const pts of [8, 6, 4, 2]) {
    hostMsgs.length = 0;
    hostWs.send(JSON.stringify({
      type: 'HOST_NEXT_CLUE', sessionId, serverTimeMs: Date.now(), payload: {},
    }));
    await sleep(400);
    const clue = hostMsgs.find((m: any) => m.type === 'CLUE_PRESENT');
    clue?.payload?.clueLevelPoints === pts
      ? pass(`Clue advanced to ${pts} pts`)
      : fail(`Clue advanced to ${pts} pts`, `got ${clue?.payload?.clueLevelPoints ?? 'none'}`);
  }

  // ── 4. Reveal (final HOST_NEXT_CLUE) ─────────────────────────────────────
  log('4. Triggering reveal …');
  hostMsgs.length = 0; aliceMsgs.length = 0; bobMsgs.length = 0;

  hostWs.send(JSON.stringify({
    type: 'HOST_NEXT_CLUE', sessionId, serverTimeMs: Date.now(), payload: {},
  }));
  await sleep(1000);

  hostMsgs.some((m: any) => m.type === 'DESTINATION_REVEAL')
    ? pass('DESTINATION_REVEAL received by host')
    : fail('DESTINATION_REVEAL received by host', 'missing');

  hostMsgs.some((m: any) => m.type === 'DESTINATION_RESULTS')
    ? pass('DESTINATION_RESULTS received by host')
    : fail('DESTINATION_RESULTS received by host', 'missing');

  // ── 5. FQ1 appears — projection checks ───────────────────────────────────
  log('5. Waiting for FOLLOWUP_QUESTION_PRESENT (Q1) …');
  const fq1Host  = await waitFor(hostMsgs,  (m: any) => m.type === 'FOLLOWUP_QUESTION_PRESENT', 'FQ1 on host');
  const fq1Alice = await waitFor(aliceMsgs, (m: any) => m.type === 'FOLLOWUP_QUESTION_PRESENT', 'FQ1 on Alice');

  // HOST has correctAnswer
  fq1Host.payload.correctAnswer === correctQ1
    ? pass(`HOST sees correctAnswer = "${correctQ1}"`)
    : fail('HOST sees correctAnswer', `got "${fq1Host.payload.correctAnswer}"`);

  // PLAYER does NOT have correctAnswer
  !('correctAnswer' in fq1Host.payload) || fq1Host.payload.correctAnswer   // HOST should have it
  !('correctAnswer' in fq1Alice.payload)
    ? pass('PLAYER does NOT receive correctAnswer')
    : fail('PLAYER does NOT receive correctAnswer', `got "${fq1Alice.payload.correctAnswer}"`);

  // progress header
  fq1Host.payload.currentQuestionIndex === 0 && fq1Host.payload.totalQuestions === 2
    ? pass('FQ1 progress: 0 / 2 (index 0, total 2)')
    : fail('FQ1 progress', `idx=${fq1Host.payload.currentQuestionIndex} tot=${fq1Host.payload.totalQuestions}`);

  // ── 6. Players answer Q1 ──────────────────────────────────────────────────
  log('6. Alice → correct, Bob → incorrect …');
  aliceMsgs.length = 0; bobMsgs.length = 0;

  aliceWs.send(JSON.stringify({
    type: 'FOLLOWUP_ANSWER_SUBMIT', sessionId, serverTimeMs: Date.now(),
    payload: { answerText: correctQ1 },
  }));
  await sleep(300);

  bobWs.send(JSON.stringify({
    type: 'FOLLOWUP_ANSWER_SUBMIT', sessionId, serverTimeMs: Date.now(),
    payload: { answerText: wrongQ1 },
  }));
  await sleep(300);

  // Alice should get back a STATE_SNAPSHOT with answeredByMe == true
  const aliceConfirm = aliceMsgs.find((m: any) => m.type === 'STATE_SNAPSHOT');
  aliceConfirm?.payload?.state?.followupQuestion?.answeredByMe === true
    ? pass('Alice STATE_SNAPSHOT has answeredByMe = true')
    : fail('Alice answeredByMe', `got ${aliceConfirm?.payload?.state?.followupQuestion?.answeredByMe}`);

  // ── 7. Reconnect Bob mid-timer ────────────────────────────────────────────
  log('7. Closing Bob WS … waiting 2 s … reconnecting …');
  bobWs.close();
  await sleep(2000);

  const bob2 = await connectWS(bob.playerAuthToken);
  bobWs     = bob2.ws;
  bobMsgs   = bob2.messages;
  await sleep(300);

  // send RESUME
  await waitFor(bobMsgs, (m: any) => m.type === 'WELCOME', 'WELCOME after reconnect', 3000);
  pass('Bob WELCOME after reconnect');
  sendResume(bobWs, sessionId, bob.playerId);

  const bobSnap = await waitFor(bobMsgs, (m: any) => m.type === 'STATE_SNAPSHOT', 'Bob STATE_SNAPSHOT after resume', 3000);

  bobSnap.payload.state.phase === 'FOLLOWUP_QUESTION'
    ? pass('Bob reconnect: phase = FOLLOWUP_QUESTION')
    : fail('Bob reconnect phase', `got ${bobSnap.payload.state.phase}`);

  bobSnap.payload.state.followupQuestion?.answeredByMe === true
    ? pass('Bob reconnect: answeredByMe = true (answer preserved)')
    : fail('Bob reconnect answeredByMe', `got ${bobSnap.payload.state.followupQuestion?.answeredByMe}`);

  // ── 8. Wait for Q1 timer to fire (15 s from reveal; we've used ~5 s) ──────
  log('8. Waiting for Q1 timer to fire …');
  hostMsgs.length = 0; aliceMsgs.length = 0; bobMsgs.length = 0;

  const fqLocked1 = await waitFor(hostMsgs, (m: any) => m.type === 'FOLLOWUP_ANSWERS_LOCKED', 'ANSWERS_LOCKED Q1', 18000);

  // HOST has answersByPlayer
  Array.isArray(fqLocked1.payload.answersByPlayer)
    ? pass(`HOST ANSWERS_LOCKED has answersByPlayer (${fqLocked1.payload.answersByPlayer.length} entries)`)
    : fail('HOST answersByPlayer', `got ${JSON.stringify(fqLocked1.payload.answersByPlayer)}`);

  // PLAYER does NOT have answersByPlayer
  const aliceLocked1 = aliceMsgs.find((m: any) => m.type === 'FOLLOWUP_ANSWERS_LOCKED');
  aliceLocked1 && !('answersByPlayer' in aliceLocked1.payload)
    ? pass('PLAYER ANSWERS_LOCKED has no answersByPlayer')
    : fail('PLAYER answersByPlayer', `present=${aliceLocked1 && 'answersByPlayer' in aliceLocked1.payload}`);

  // ── 9. FQ1 results ────────────────────────────────────────────────────────
  log('9. Verifying FOLLOWUP_RESULTS Q1 …');
  const fqRes1 = await waitFor(hostMsgs, (m: any) => m.type === 'FOLLOWUP_RESULTS', 'RESULTS Q1', 3000);

  fqRes1.payload.correctAnswer === correctQ1
    ? pass(`RESULTS Q1 correctAnswer = "${correctQ1}"`)
    : fail('RESULTS Q1 correctAnswer', `got "${fqRes1.payload.correctAnswer}"`);

  const aliceRes1 = fqRes1.payload.results.find((r: any) => r.playerName === 'Alice');
  const bobRes1   = fqRes1.payload.results.find((r: any) => r.playerName === 'Bob');

  aliceRes1?.isCorrect === true && aliceRes1?.pointsAwarded === 2
    ? pass('Alice Q1: correct +2')
    : fail('Alice Q1 scoring', `correct=${aliceRes1?.isCorrect} pts=${aliceRes1?.pointsAwarded}`);

  bobRes1?.isCorrect === false && bobRes1?.pointsAwarded === 0
    ? pass('Bob Q1: incorrect +0')
    : fail('Bob Q1 scoring', `correct=${bobRes1?.isCorrect} pts=${bobRes1?.pointsAwarded}`);

  fqRes1.payload.nextQuestionIndex === 1
    ? pass('RESULTS Q1 nextQuestionIndex = 1')
    : fail('nextQuestionIndex', `got ${fqRes1.payload.nextQuestionIndex}`);

  // ── 10. FQ2 appears automatically ─────────────────────────────────────────
  log('10. Waiting for FOLLOWUP_QUESTION_PRESENT Q2 …');
  const fq2Host  = await waitFor(hostMsgs,  (m: any) => m.type === 'FOLLOWUP_QUESTION_PRESENT' && m.payload.currentQuestionIndex === 1, 'FQ2 on host', 3000);
  const fq2Alice = await waitFor(aliceMsgs, (m: any) => m.type === 'FOLLOWUP_QUESTION_PRESENT' && m.payload.currentQuestionIndex === 1, 'FQ2 on Alice', 3000);

  fq2Host.payload.currentQuestionIndex === 1
    ? pass('FQ2 progress: index 1 / 2')
    : fail('FQ2 index', `got ${fq2Host.payload.currentQuestionIndex}`);

  fq2Host.payload.options === null
    ? pass('FQ2 is open-text (options = null)')
    : fail('FQ2 open-text', `options=${JSON.stringify(fq2Host.payload.options)}`);

  // HOST still sees correctAnswer
  fq2Host.payload.correctAnswer === correctQ2
    ? pass(`HOST sees Q2 correctAnswer = "${correctQ2}"`)
    : fail('HOST Q2 correctAnswer', `got "${fq2Host.payload.correctAnswer}"`);

  // PLAYER still does NOT
  !('correctAnswer' in fq2Alice.payload)
    ? pass('PLAYER does NOT receive Q2 correctAnswer')
    : fail('PLAYER Q2 correctAnswer', `got "${fq2Alice.payload.correctAnswer}"`);

  // ── 11. Both answer Q2 correctly ──────────────────────────────────────────
  log('11. Both players answer Q2 correctly …');
  aliceMsgs.length = 0; bobMsgs.length = 0;

  aliceWs.send(JSON.stringify({
    type: 'FOLLOWUP_ANSWER_SUBMIT', sessionId, serverTimeMs: Date.now(),
    payload: { answerText: correctQ2 },
  }));
  await sleep(200);

  bobWs.send(JSON.stringify({
    type: 'FOLLOWUP_ANSWER_SUBMIT', sessionId, serverTimeMs: Date.now(),
    payload: { answerText: correctQ2 },
  }));
  await sleep(200);

  // ── 12. Wait for Q2 timer ─────────────────────────────────────────────────
  log('12. Waiting for Q2 timer to fire …');
  hostMsgs.length = 0;

  await waitFor(hostMsgs, (m: any) => m.type === 'FOLLOWUP_ANSWERS_LOCKED' && m.payload.currentQuestionIndex === 1, 'ANSWERS_LOCKED Q2', 18000);
  pass('ANSWERS_LOCKED Q2 received');

  // ── 13. FQ2 results ───────────────────────────────────────────────────────
  log('13. Verifying FOLLOWUP_RESULTS Q2 …');
  const fqRes2 = await waitFor(hostMsgs, (m: any) => m.type === 'FOLLOWUP_RESULTS' && m.payload.currentQuestionIndex === 1, 'RESULTS Q2', 3000);

  const aliceRes2 = fqRes2.payload.results.find((r: any) => r.playerName === 'Alice');
  const bobRes2   = fqRes2.payload.results.find((r: any) => r.playerName === 'Bob');

  aliceRes2?.isCorrect === true && aliceRes2?.pointsAwarded === 2
    ? pass('Alice Q2: correct +2')
    : fail('Alice Q2 scoring', `correct=${aliceRes2?.isCorrect} pts=${aliceRes2?.pointsAwarded}`);

  bobRes2?.isCorrect === true && bobRes2?.pointsAwarded === 2
    ? pass('Bob Q2: correct +2')
    : fail('Bob Q2 scoring', `correct=${bobRes2?.isCorrect} pts=${bobRes2?.pointsAwarded}`);

  fqRes2.payload.nextQuestionIndex === null
    ? pass('RESULTS Q2 nextQuestionIndex = null (sequence done)')
    : fail('nextQuestionIndex Q2', `got ${fqRes2.payload.nextQuestionIndex}`);

  // ── 14. SCOREBOARD_UPDATE (sequence complete) ────────────────────────────
  log('14. Waiting for SCOREBOARD_UPDATE …');
  const scoreboard = await waitFor(hostMsgs, (m: any) => m.type === 'SCOREBOARD_UPDATE', 'SCOREBOARD_UPDATE', 3000);
  pass('SCOREBOARD_UPDATE received after sequence end');

  // verify Alice has +4 more than destination baseline, Bob +2 more
  const aliceEntry = scoreboard.payload.scoreboard.find((s: any) => s.name === 'Alice');
  const bobEntry   = scoreboard.payload.scoreboard.find((s: any) => s.name === 'Bob');
  const aliceFqPts = aliceEntry?.score ?? 0;
  const bobFqPts   = bobEntry?.score  ?? 0;

  // Neither locked a destination answer so base = 0; Alice +4, Bob +2 from followups
  aliceFqPts === 4
    ? pass(`Alice final score = ${aliceFqPts} (0 dest + 2 + 2)`)
    : fail('Alice final score', `got ${aliceFqPts}, expected 4`);

  bobFqPts === 2
    ? pass(`Bob final score = ${bobFqPts} (0 dest + 0 + 2)`)
    : fail('Bob final score', `got ${bobFqPts}, expected 2`);

  // ── cleanup ───────────────────────────────────────────────────────────────
  hostWs.close();
  aliceWs.close();
  bobWs.close();

  // ── summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════');
  results.forEach(r =>
    console.log(r.passed ? `  ✅ ${r.name}` : `  ❌ ${r.name}: ${r.error}`)
  );
  const passed = results.filter(r =>  r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log('───────────────────────────────────────────────────────');
  console.log(`  ${passed}/${results.length} passed`);
  if (failed) console.log(`  ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════');
  process.exit(failed ? 1 : 0);
}

main().catch((err: any) => {
  console.error('\n💥 Fatal:', err.message);
  console.error(err.stack);
  process.exit(1);
});
