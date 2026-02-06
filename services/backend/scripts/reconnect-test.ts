/**
 * Reconnect & Leave test script
 * Covers three scenarios from docs/web-reconnect-test.md:
 *   1. Refresh mid CLUE_LEVEL   — disconnect + reconnect, verify STATE_SNAPSHOT restores phase + clue
 *   2. Network toggle mid LOBBY — disconnect, 2 s gap, reconnect, verify LOBBY restored
 *   3. Leave game / no resume   — close WS, try no-token + bad-token connections (expect 4xxx),
 *                                  confirm old token is still server-valid (leave is client-side only)
 */

import WebSocket from 'ws';

const BASE_URL = 'http://localhost:3000';
const WS_URL  = 'ws://localhost:3000/ws';

// ─── helpers ────────────────────────────────────────────────────────────────

interface TestResult { name: string; passed: boolean; error?: string; }
const results: TestResult[] = [];

function log (msg: string)                { console.log(`[TEST] ${msg}`); }
function pass(name: string)               { results.push({ name, passed: true  }); console.log(`  ✅ ${name}`); }
function fail(name: string, err: string)  { results.push({ name, passed: false, error: err }); console.log(`  ❌ ${name}: ${err}`); }
function sleep(ms: number)                { return new Promise<void>(r => setTimeout(r, ms)); }

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

/** Open a WS, collect messages, resolve once "open" fires. */
function connectWS(token: string): Promise<{ ws: WebSocket; messages: any[] }> {
  return new Promise((resolve, reject) => {
    const messages: any[] = [];
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      messages.push(msg);
      log(`  ← ${msg.type}`);
    });
    ws.on('open',  () => resolve({ ws, messages }));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('WS open timeout')), 5000);
  });
}

/** Open a WS expecting it to be closed immediately (bad / missing token).
 *  Resolves with { code, reason } from the close event. */
function connectWSExpectClose(token?: string): Promise<{ code: number; reason: string }> {
  return new Promise((resolve, reject) => {
    const url = token ? `${WS_URL}?token=${token}` : WS_URL;
    const ws  = new WebSocket(url);
    ws.on('close', (code, reason) => resolve({ code, reason: reason.toString() }));
    ws.on('error', () => { /* suppress */ });
    setTimeout(() => reject(new Error('close timeout')), 5000);
  });
}

/** Poll messages[] until an event of the given type appears or timeout. */
async function waitForEvent(messages: any[], type: string, ms = 3000): Promise<any> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const evt = messages.find(m => m.type === type);
    if (evt) return evt;
    await sleep(50);
  }
  throw new Error(`timeout waiting for ${type}`);
}

/** Send RESUME_SESSION the same way useWebSocket does after WELCOME. */
function sendResume(ws: WebSocket, sessionId: string, playerId: string) {
  ws.send(JSON.stringify({
    type: 'RESUME_SESSION',
    sessionId,
    serverTimeMs: Date.now(),
    payload: { playerId, lastReceivedEventId: null },
  }));
  log('  → RESUME_SESSION');
}

// ─── TEST 1 ─── refresh mid CLUE_LEVEL ─────────────────────────────────────

async function test1() {
  console.log('\n🔄  Test 1 — Refresh mid CLUE_LEVEL');

  const { sessionId, hostAuthToken } = await createSession();
  const player = await joinSession(sessionId, 'Player-T1');

  // host connects
  const { ws: hostWs } = await connectWS(hostAuthToken);
  await sleep(300);

  // player connects
  const { ws: playerWs, messages: playerMsgs } = await connectWS(player.playerAuthToken);
  await sleep(300);

  // host starts game → CLUE_LEVEL
  log('  host → HOST_START_GAME');
  hostWs.send(JSON.stringify({
    type: 'HOST_START_GAME', sessionId, serverTimeMs: Date.now(), payload: {},
  }));
  await sleep(800);

  // NOTE: Game flow changed - HOST_START_GAME now enters ROUND_INTRO first
  // Wait for ROUND_INTRO phase, then wait for auto-advance to CLUE_LEVEL
  // Auto-advance delay = introDurationMs + 1500ms, or 3000ms if no intro audio
  await sleep(3500); // Wait for auto-advance from ROUND_INTRO to CLUE_LEVEL

  // verify player got STATE_SNAPSHOT with CLUE_LEVEL
  const clueSnap = playerMsgs.find((m: any) =>
    m.type === 'STATE_SNAPSHOT' && m.payload.state.phase === 'CLUE_LEVEL'
  );
  clueSnap && clueSnap.payload.state.clueLevelPoints === 10
    ? pass('Player receives CLUE_LEVEL snapshot (10 pts) before refresh')
    : fail('Player receives CLUE_LEVEL snapshot (10 pts) before refresh',
           `phase=${clueSnap?.payload.state.phase}, points=${clueSnap?.payload.state.clueLevelPoints}`);

  // ── simulate refresh: close WS ──
  log('  closing player WS (refresh)');
  playerWs.close();
  await sleep(400);

  // ── reconnect with same token ──
  log('  reconnecting player');
  const { ws: playerWs2, messages: m2 } = await connectWS(player.playerAuthToken);
  await sleep(300);

  // wait for WELCOME, then send RESUME_SESSION (mirrors useWebSocket)
  await waitForEvent(m2, 'WELCOME');
  pass('WELCOME received after reconnect');
  sendResume(playerWs2, sessionId, player.playerId);

  // wait for STATE_SNAPSHOT
  const snap = await waitForEvent(m2, 'STATE_SNAPSHOT');

  // After reconnect, we should get the current phase (may still be CLUE_LEVEL or advanced)
  (snap.payload.state.phase === 'CLUE_LEVEL' || snap.payload.state.phase === 'ROUND_INTRO')
    ? pass('STATE_SNAPSHOT phase restored (CLUE_LEVEL or ROUND_INTRO)')
    : fail('STATE_SNAPSHOT phase restored', `phase=${snap.payload.state.phase}`);

  (snap.payload.state.clueLevelPoints === 10 && snap.payload.state.clueText)
    ? pass('Clue points + text restored in snapshot')
    : fail('Clue points + text restored in snapshot',
           `points=${snap.payload.state.clueLevelPoints} text=${!!snap.payload.state.clueText}`);

  hostWs.close();
  playerWs2.close();
}

// ─── TEST 2 ─── network toggle mid LOBBY ───────────────────────────────────

async function test2() {
  console.log('\n📶  Test 2 — Network toggle mid LOBBY');

  const { sessionId, hostAuthToken } = await createSession();
  const player = await joinSession(sessionId, 'Player-T2');

  // host connects (keeps session alive)
  const { ws: hostWs } = await connectWS(hostAuthToken);
  await sleep(200);

  // player connects
  const { ws: playerWs, messages: playerMsgs } = await connectWS(player.playerAuthToken);
  await sleep(300);

  // verify initial snapshot = LOBBY
  const initSnap = playerMsgs.find((m: any) => m.type === 'STATE_SNAPSHOT');
  initSnap?.payload.state.phase === 'LOBBY'
    ? pass('Initial STATE_SNAPSHOT phase = LOBBY')
    : fail('Initial STATE_SNAPSHOT phase = LOBBY', `phase=${initSnap?.payload.state.phase}`);

  // ── simulate airplane mode: close WS, wait 2 s ──
  log('  closing player WS (airplane mode)');
  playerWs.close();
  log('  waiting 2 s …');
  await sleep(2000);

  // ── simulate network back on: reconnect ──
  log('  reconnecting player (network restored)');
  const { ws: playerWs2, messages: m2 } = await connectWS(player.playerAuthToken);
  await sleep(300);

  await waitForEvent(m2, 'WELCOME');
  pass('WELCOME received after network restore');
  sendResume(playerWs2, sessionId, player.playerId);

  const snap = await waitForEvent(m2, 'STATE_SNAPSHOT');

  snap.payload.state.phase === 'LOBBY'
    ? pass('STATE_SNAPSHOT phase = LOBBY after network restore')
    : fail('STATE_SNAPSHOT phase = LOBBY after network restore', `phase=${snap.payload.state.phase}`);

  // NOTE: In LOBBY phase, disconnect removes player immediately (no grace period)
  // So players=[] is CORRECT behavior. Player would need to re-join via /join endpoint.
  const me = snap.payload.state.players?.find((p: any) => p.playerId === player.playerId);
  (!me && snap.payload.state.players.length === 0)
    ? pass('Player correctly removed from LOBBY after disconnect (no grace period)')
    : fail('Player correctly removed from LOBBY after disconnect',
           `players=${JSON.stringify(snap.payload.state.players)} (expected: [])`);

  hostWs.close();
  playerWs2.close();
}

// ─── TEST 3 ─── leave game — no auto-resume ────────────────────────────────

async function test3() {
  console.log('\n🚪  Test 3 — Leave game / no auto-resume');

  const { sessionId, hostAuthToken } = await createSession();
  const player = await joinSession(sessionId, 'Player-T3');

  const { ws: hostWs } = await connectWS(hostAuthToken);
  await sleep(200);

  // player connects, verify WELCOME
  const { ws: playerWs, messages: playerMsgs } = await connectWS(player.playerAuthToken);
  await sleep(300);

  playerMsgs.find((m: any) => m.type === 'WELCOME')
    ? pass('Player connected and received WELCOME')
    : fail('Player connected and received WELCOME', 'no WELCOME');

  // ── simulate "Leave game": close WS (client would also clear localStorage) ──
  log('  closing player WS (leave game)');
  playerWs.close();
  await sleep(200);

  // ── attempt 1: no token at all ──
  log('  connecting with NO token …');
  const noToken = await connectWSExpectClose();
  (noToken.code >= 4000 && noToken.code < 5000)
    ? pass(`No-token → rejected ${noToken.code}`)
    : fail(`No-token → rejected 4xxx`, `code=${noToken.code}`);

  // ── attempt 2: garbage token ──
  log('  connecting with invalid token …');
  const badToken = await connectWSExpectClose('not-a-valid-jwt-at-all');
  (badToken.code >= 4000 && badToken.code < 5000)
    ? pass(`Invalid token → rejected ${badToken.code}`)
    : fail(`Invalid token → rejected 4xxx`, `code=${badToken.code}`);

  // ── confirm: old token is still server-valid.
  //    "Leave" is a client-side action (localStorage clear).
  //    The server doesn't invalidate the token — the client simply stops connecting.
  log('  reconnecting with the original (still-valid) token …');
  const { ws: reuse, messages: reuseMsgs } = await connectWS(player.playerAuthToken);
  await sleep(300);

  reuseMsgs.find((m: any) => m.type === 'WELCOME')
    ? pass('Old token still accepted — leave is client-side (localStorage clear)')
    : fail('Old token still accepted', 'no WELCOME with reused token');

  reuse.close();
  hostWs.close();
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Reconnect & Leave — 3 scenario test');
  console.log('═══════════════════════════════════════════════════');

  try {
    await test1();
    await test2();
    await test3();
  } catch (err: any) {
    console.error('\n💥 Fatal:', err.message);
    console.error(err.stack);
  }

  // summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════');
  results.forEach(r =>
    console.log(r.passed ? `  ✅ ${r.name}` : `  ❌ ${r.name}: ${r.error}`)
  );
  const passed = results.filter(r =>  r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log('───────────────────────────────────────────────────');
  console.log(`  ${passed}/${results.length} passed`);
  if (failed) console.log(`  ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════');
  process.exit(failed ? 1 : 0);
}

main();
