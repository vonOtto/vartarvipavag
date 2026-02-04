/**
 * Answer submission integration test
 *
 * Full flow: start game → brake → submit answer → verify locked + projection
 *
 * Assertions:
 *  1. BRAKE_ACCEPTED received by all after BRAKE_PULL
 *  2. BRAKE_ANSWER_LOCKED received by all after submit
 *  3. HOST copy of BRAKE_ANSWER_LOCKED carries answerText
 *  4. PLAYER copy does NOT carry answerText
 *  5. Phase returns to CLUE_LEVEL after lock
 *  6. lockedAnswers in subsequent STATE_SNAPSHOT is non-empty
 *  7. HOST override (HOST_NEXT_CLUE in PAUSED_FOR_BRAKE) works
 */

import WebSocket from 'ws';

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

function log(msg: string) { console.log(`[TEST] ${msg}`); }
function pass(name: string) { console.log(`  ✅ ${name}`); }
function fail(name: string, detail: string) { console.log(`  ❌ ${name}: ${detail}`); results.push(false); }

const results: boolean[] = [];

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

function connect(token: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('connect timeout')), 5000);
  });
}

/** Collect messages from a socket until timeout */
function collectMessages(ws: WebSocket, timeoutMs: number): Promise<any[]> {
  return new Promise((resolve) => {
    const msgs: any[] = [];
    const handler = (data: Buffer) => msgs.push(JSON.parse(data.toString()));
    ws.on('message', handler);
    setTimeout(() => { ws.off('message', handler); resolve(msgs); }, timeoutMs);
  });
}

function send(ws: WebSocket, event: any) {
  ws.send(JSON.stringify(event));
}

async function main() {
  console.log('🧪 Answer Submission Integration Test\n');

  // ── Setup ──────────────────────────────────────────────────────────────────
  log('Creating session...');
  const sessionRes = await (await fetch(`${BASE_URL}/v1/sessions`, { method: 'POST' })).json();
  const { sessionId, hostAuthToken } = sessionRes;

  log('Joining Alice...');
  const aliceRes = await (await fetch(`${BASE_URL}/v1/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Alice' }),
  })).json();

  log('Connecting WebSockets (host + Alice)...');
  const hostWs = await connect(hostAuthToken);
  const aliceWs = await connect(aliceRes.playerAuthToken);
  await sleep(500);

  // ── Start game ─────────────────────────────────────────────────────────────
  log('Starting game...');
  send(hostWs, { type: 'HOST_START_GAME', sessionId, serverTimeMs: Date.now(), payload: {} });
  await sleep(1000);

  // ── TEST BLOCK A: brake → submit → locked ─────────────────────────────────
  log('\n--- Block A: Brake + Submit ---');

  // Start collecting on both sockets
  const hostMsgsPromise = collectMessages(hostWs, 4000);
  const aliceMsgsPromise = collectMessages(aliceWs, 4000);

  // Alice pulls brake
  log('Alice pulls brake...');
  send(aliceWs, {
    type: 'BRAKE_PULL',
    sessionId,
    serverTimeMs: Date.now(),
    payload: { playerId: aliceRes.playerId, clientTimeMs: Date.now() },
  });
  await sleep(500);

  // Alice submits answer
  log('Alice submits answer "Paris"...');
  send(aliceWs, {
    type: 'BRAKE_ANSWER_SUBMIT',
    sessionId,
    serverTimeMs: Date.now(),
    payload: { playerId: aliceRes.playerId, answerText: 'Paris' },
  });

  // Wait for messages to accumulate
  const [hostMsgs, aliceMsgs] = await Promise.all([hostMsgsPromise, aliceMsgsPromise]);

  // ── Assertions ─────────────────────────────────────────────────────────────
  log('\n📊 Assertions:\n');

  // 1. BRAKE_ACCEPTED received
  const hostAccepted = hostMsgs.find((m: any) => m.type === 'BRAKE_ACCEPTED');
  const aliceAccepted = aliceMsgs.find((m: any) => m.type === 'BRAKE_ACCEPTED');
  if (hostAccepted && aliceAccepted) { pass('BRAKE_ACCEPTED received by host + player'); results.push(true); }
  else { fail('BRAKE_ACCEPTED', `host=${!!hostAccepted} alice=${!!aliceAccepted}`); }

  // 2. BRAKE_ANSWER_LOCKED received by both
  const hostLocked = hostMsgs.find((m: any) => m.type === 'BRAKE_ANSWER_LOCKED');
  const aliceLocked = aliceMsgs.find((m: any) => m.type === 'BRAKE_ANSWER_LOCKED');
  if (hostLocked && aliceLocked) { pass('BRAKE_ANSWER_LOCKED received by host + player'); results.push(true); }
  else { fail('BRAKE_ANSWER_LOCKED', `host=${!!hostLocked} alice=${!!aliceLocked}`); }

  // 3. HOST sees answerText
  if (hostLocked?.payload?.answerText === 'Paris') { pass('HOST payload.answerText = "Paris"'); results.push(true); }
  else { fail('HOST answerText', `got: ${JSON.stringify(hostLocked?.payload)}`); }

  // 4. PLAYER does NOT see answerText
  if (!('answerText' in (aliceLocked?.payload ?? {}))) { pass('PLAYER payload has no answerText'); results.push(true); }
  else { fail('PLAYER answerText leak', `got: ${aliceLocked?.payload?.answerText}`); }

  // 5. remainingClues present
  if (typeof hostLocked?.payload?.remainingClues === 'boolean') { pass(`remainingClues = ${hostLocked.payload.remainingClues}`); results.push(true); }
  else { fail('remainingClues', 'missing from payload'); }

  // 6. Phase returns to CLUE_LEVEL (latest STATE_SNAPSHOT after lock)
  const hostSnapshots = hostMsgs.filter((m: any) => m.type === 'STATE_SNAPSHOT');
  const lastSnapshot = hostSnapshots[hostSnapshots.length - 1];
  if (lastSnapshot?.payload?.state?.phase === 'CLUE_LEVEL') { pass('Phase returned to CLUE_LEVEL'); results.push(true); }
  else { fail('Phase after lock', `got: ${lastSnapshot?.payload?.state?.phase}`); }

  // 7. lockedAnswers in state is non-empty
  if (lastSnapshot?.payload?.state?.lockedAnswers?.length > 0) { pass('lockedAnswers non-empty in STATE_SNAPSHOT'); results.push(true); }
  else { fail('lockedAnswers', `count: ${lastSnapshot?.payload?.state?.lockedAnswers?.length}`); }

  // ── TEST BLOCK B: host override ────────────────────────────────────────────
  log('\n--- Block B: Host Override (HOST_NEXT_CLUE in PAUSED_FOR_BRAKE) ---');

  // We need a fresh brake — currently at CLUE_LEVEL after the lock above
  // Alice can't brake again at this clue level (already won), so advance first
  send(hostWs, { type: 'HOST_NEXT_CLUE', sessionId, serverTimeMs: Date.now(), payload: {} });
  await sleep(500);

  // Now collect for override test
  const hostMsgs2Promise = collectMessages(hostWs, 3000);

  // Alice brakes again at new clue level
  log('Alice brakes at new clue level...');
  send(aliceWs, {
    type: 'BRAKE_PULL',
    sessionId,
    serverTimeMs: Date.now(),
    payload: { playerId: aliceRes.playerId, clientTimeMs: Date.now() },
  });
  await sleep(500);

  // Host overrides with HOST_NEXT_CLUE while paused
  log('Host overrides brake with HOST_NEXT_CLUE...');
  send(hostWs, { type: 'HOST_NEXT_CLUE', sessionId, serverTimeMs: Date.now(), payload: {} });

  const hostMsgs2 = await hostMsgs2Promise;

  // Check phase returned to CLUE_LEVEL (not stuck in PAUSED_FOR_BRAKE)
  const snapshots2 = hostMsgs2.filter((m: any) => m.type === 'STATE_SNAPSHOT');
  const lastSnap2 = snapshots2[snapshots2.length - 1];
  if (lastSnap2?.payload?.state?.phase === 'CLUE_LEVEL') { pass('Host override: phase back to CLUE_LEVEL'); results.push(true); }
  else { fail('Host override phase', `got: ${lastSnap2?.payload?.state?.phase}`); }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(40));
  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log(`${passed}/${total} assertions passed`);

  hostWs.close();
  aliceWs.close();

  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED\n');
    process.exit(0);
  } else {
    console.log('\n💥 SOME TESTS FAILED\n');
    process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
