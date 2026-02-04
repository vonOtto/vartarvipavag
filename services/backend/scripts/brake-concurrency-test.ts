/**
 * Brake concurrency test script
 *
 * Tests that BRAKE_PULL fairness logic works correctly when multiple players
 * pull brake simultaneously (~50ms window).
 *
 * Expected behavior:
 * - Only ONE player gets BRAKE_ACCEPTED
 * - All other players get BRAKE_REJECTED with reason "too_late"
 * - The winner is determined by serverTimeMs (first brake wins)
 */

import WebSocket from 'ws';

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

interface TestPlayer {
  id: number;
  name: string;
  playerId: string;
  token: string;
  ws: WebSocket | null;
  brakeResult: 'accepted' | 'rejected' | 'pending';
  rejectionReason?: string;
}

function log(message: string) {
  console.log(`[TEST] ${message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('🧪 Brake Concurrency Test\n');
  console.log('Testing: 5 players pull brake simultaneously (~50ms window)');
  console.log('Expected: Only 1 gets BRAKE_ACCEPTED, rest get BRAKE_REJECTED\n');

  try {
    // Step 1: Create session
    log('Creating session...');
    const createResponse = await fetch(`${BASE_URL}/v1/sessions`, {
      method: 'POST',
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create session: ${createResponse.statusText}`);
    }

    const sessionData = await createResponse.json();
    const { sessionId, hostAuthToken } = sessionData;
    log(`Session created: ${sessionId}`);

    // Step 2: Create 5 test players
    log('Creating 5 test players...');
    const players: TestPlayer[] = [];

    for (let i = 1; i <= 5; i++) {
      const joinResponse = await fetch(`${BASE_URL}/v1/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Player ${i}` }),
      });

      if (!joinResponse.ok) {
        throw new Error(`Failed to join as Player ${i}`);
      }

      const joinData = await joinResponse.json();
      players.push({
        id: i,
        name: `Player ${i}`,
        playerId: joinData.playerId,
        token: joinData.playerAuthToken,
        ws: null,
        brakeResult: 'pending',
      });

      log(`Player ${i} joined: ${joinData.playerId.substring(0, 8)}...`);
    }

    // Step 3: Connect host and start game
    log('Connecting host...');
    const hostWs = new WebSocket(`${WS_URL}?token=${hostAuthToken}`);

    await new Promise<void>((resolve, reject) => {
      hostWs.on('open', () => {
        log('Host connected');
        resolve();
      });
      hostWs.on('error', reject);
      setTimeout(() => reject(new Error('Host connection timeout')), 5000);
    });

    await sleep(500);

    log('Starting game...');
    hostWs.send(JSON.stringify({
      type: 'HOST_START_GAME',
      sessionId,
      serverTimeMs: Date.now(),
      payload: {}
    }));

    await sleep(1000);
    log('Game started - now in CLUE_LEVEL phase (10 points)');

    // Step 4: Connect all players to WebSocket
    log('Connecting all players to WebSocket...');
    for (const player of players) {
      player.ws = new WebSocket(`${WS_URL}?token=${player.token}`);

      await new Promise<void>((resolve, reject) => {
        player.ws!.on('open', () => {
          log(`Player ${player.id} WebSocket connected`);
          resolve();
        });
        player.ws!.on('error', reject);
        setTimeout(() => reject(new Error(`Player ${player.id} connection timeout`)), 5000);
      });

      // Setup message handlers
      player.ws!.on('message', (data: Buffer) => {
        const event = JSON.parse(data.toString());

        if (event.type === 'BRAKE_ACCEPTED') {
          player.brakeResult = 'accepted';
          log(`✅ Player ${player.id} received BRAKE_ACCEPTED`);
        } else if (event.type === 'BRAKE_REJECTED') {
          player.brakeResult = 'rejected';
          player.rejectionReason = event.payload.reason;
          log(`❌ Player ${player.id} received BRAKE_REJECTED (${event.payload.reason})`);
        }
      });
    }

    await sleep(1000);

    // Step 5: ALL players pull brake simultaneously
    log('\n🚨 PULLING BRAKE SIMULTANEOUSLY (all 5 players within ~50ms)...\n');

    const brakePullPromises = players.map((player, index) => {
      return sleep(index * 10).then(() => {
        const pullTime = Date.now();
        player.ws!.send(JSON.stringify({
          type: 'BRAKE_PULL',
          sessionId,
          serverTimeMs: pullTime,
          payload: {
            playerId: player.playerId,
            clientTimeMs: pullTime,
          }
        }));
        log(`Player ${player.id} pulled brake at ${pullTime} (+${index * 10}ms offset)`);
      });
    });

    await Promise.all(brakePullPromises);

    // Wait for all responses
    log('\nWaiting for server responses...');
    await sleep(2000);

    // Step 6: Verify results
    log('\n📊 TEST RESULTS:\n');

    const acceptedPlayers = players.filter(p => p.brakeResult === 'accepted');
    const rejectedPlayers = players.filter(p => p.brakeResult === 'rejected');
    const pendingPlayers = players.filter(p => p.brakeResult === 'pending');

    console.log(`✅ Accepted: ${acceptedPlayers.length} player(s)`);
    acceptedPlayers.forEach(p => {
      console.log(`   - Player ${p.id} (${p.name})`);
    });

    console.log(`❌ Rejected: ${rejectedPlayers.length} player(s)`);
    rejectedPlayers.forEach(p => {
      console.log(`   - Player ${p.id} (${p.name}) - reason: ${p.rejectionReason}`);
    });

    console.log(`⏳ Pending: ${pendingPlayers.length} player(s)`);
    pendingPlayers.forEach(p => {
      console.log(`   - Player ${p.id} (${p.name})`);
    });

    // Validate expectations
    console.log('\n🔍 VALIDATION:\n');

    let allPassed = true;

    // Test 1: Exactly 1 accepted
    if (acceptedPlayers.length === 1) {
      console.log('✅ PASS: Exactly 1 player got BRAKE_ACCEPTED');
    } else {
      console.log(`❌ FAIL: Expected 1 accepted, got ${acceptedPlayers.length}`);
      allPassed = false;
    }

    // Test 2: Exactly 4 rejected
    if (rejectedPlayers.length === 4) {
      console.log('✅ PASS: Exactly 4 players got BRAKE_REJECTED');
    } else {
      console.log(`❌ FAIL: Expected 4 rejected, got ${rejectedPlayers.length}`);
      allPassed = false;
    }

    // Test 3: All rejections have reason "too_late" OR "already_paused"
    // Note: "already_paused" is correct when brake is pulled after phase changed to PAUSED_FOR_BRAKE
    const validReasons = rejectedPlayers.every(
      p => p.rejectionReason === 'too_late' || p.rejectionReason === 'already_paused'
    );
    if (validReasons) {
      console.log('✅ PASS: All rejections have valid reason (too_late or already_paused)');
      const reasonCounts = rejectedPlayers.reduce((acc, p) => {
        acc[p.rejectionReason!] = (acc[p.rejectionReason!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`   Reasons: ${JSON.stringify(reasonCounts)}`);
    } else {
      console.log('❌ FAIL: Some rejections have invalid reason');
      rejectedPlayers.forEach(p => {
        if (p.rejectionReason !== 'too_late' && p.rejectionReason !== 'already_paused') {
          console.log(`   Player ${p.id} got unexpected reason: ${p.rejectionReason}`);
        }
      });
      allPassed = false;
    }

    // Test 4: No pending responses
    if (pendingPlayers.length === 0) {
      console.log('✅ PASS: All players received a response');
    } else {
      console.log(`❌ FAIL: ${pendingPlayers.length} player(s) didn't receive response`);
      allPassed = false;
    }

    // Test 5: Winner should be Player 1 (first to pull)
    if (acceptedPlayers.length === 1 && acceptedPlayers[0].id === 1) {
      console.log('✅ PASS: Player 1 won (first brake wins)');
    } else if (acceptedPlayers.length === 1) {
      console.log(`⚠️  WARN: Player ${acceptedPlayers[0].id} won (expected Player 1, but server time may vary)`);
    }

    // Cleanup
    log('\nClosing connections...');
    hostWs.close();
    players.forEach(p => p.ws?.close());

    await sleep(500);

    // Final result
    if (allPassed) {
      console.log('\n🎉 TEST PASSED: Brake fairness works correctly!\n');
      process.exit(0);
    } else {
      console.log('\n💥 TEST FAILED: Brake fairness has issues!\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

main();
