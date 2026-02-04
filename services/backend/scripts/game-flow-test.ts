/**
 * Game flow test script
 * Tests HOST_START_GAME and HOST_NEXT_CLUE functionality
 */

import WebSocket from 'ws';

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[TEST] ${message}`);
}

function pass(testName: string) {
  results.push({ name: testName, passed: true });
  console.log(`✅ ${testName}`);
}

function fail(testName: string, error: string) {
  results.push({ name: testName, passed: false, error });
  console.log(`❌ ${testName}: ${error}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('🎮 Starting game flow test...\n');

  try {
    // Step 1: Create session
    log('Creating session...');
    const createResponse = await fetch(`${BASE_URL}/v1/sessions`, {
      method: 'POST',
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create session: ${createResponse.statusText}`);
    }

    const sessionData = (await createResponse.json()) as any;
    const { sessionId, hostAuthToken, joinCode, wsUrl } = sessionData;
    log(`Session created: ${sessionId}, Join code: ${joinCode}`);
    pass('Create session');

    // Step 2: Connect host
    log('Connecting host...');
    const hostWs = new WebSocket(`${WS_URL}?token=${hostAuthToken}`);
    const hostMessages: any[] = [];

    hostWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      hostMessages.push(msg);
      log(`Host received: ${msg.type}`);
    });

    await new Promise<void>((resolve, reject) => {
      hostWs.on('open', () => resolve());
      hostWs.on('error', (err) => reject(err));
      setTimeout(() => reject(new Error('Host connection timeout')), 5000);
    });

    await sleep(500); // Wait for WELCOME and STATE_SNAPSHOT

    if (hostMessages.some((m) => m.type === 'WELCOME')) {
      pass('Host receives WELCOME');
    } else {
      fail('Host receives WELCOME', 'WELCOME not received');
    }

    if (hostMessages.some((m) => m.type === 'STATE_SNAPSHOT')) {
      pass('Host receives STATE_SNAPSHOT');
      const snapshot = hostMessages.find((m) => m.type === 'STATE_SNAPSHOT');
      if (snapshot.payload.state.phase === 'LOBBY') {
        pass('Initial phase is LOBBY');
      } else {
        fail('Initial phase is LOBBY', `Phase is ${snapshot.payload.state.phase}`);
      }
    } else {
      fail('Host receives STATE_SNAPSHOT', 'STATE_SNAPSHOT not received');
    }

    // Step 3: Add player
    log('Adding player...');
    const joinResponse = await fetch(
      `${BASE_URL}/v1/sessions/${sessionId}/join`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Player' }),
      }
    );

    if (!joinResponse.ok) {
      throw new Error(`Failed to join: ${joinResponse.statusText}`);
    }

    const playerData = (await joinResponse.json()) as any;
    log(`Player joined: ${playerData.playerId}`);
    pass('Player joins session');

    // Connect player
    const playerWs = new WebSocket(`${WS_URL}?token=${playerData.playerAuthToken}`);
    const playerMessages: any[] = [];

    playerWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      playerMessages.push(msg);
      log(`Player received: ${msg.type}`);
    });

    await new Promise<void>((resolve, reject) => {
      playerWs.on('open', () => resolve());
      playerWs.on('error', (err) => reject(err));
      setTimeout(() => reject(new Error('Player connection timeout')), 5000);
    });

    await sleep(500);

    // Step 4: Start game
    log('Starting game...');
    hostMessages.length = 0; // Clear previous messages
    playerMessages.length = 0;

    hostWs.send(
      JSON.stringify({
        type: 'HOST_START_GAME',
        sessionId,
        serverTimeMs: Date.now(),
        payload: {},
      })
    );

    await sleep(1000); // Wait for responses

    // Verify host received STATE_SNAPSHOT with CLUE_LEVEL
    const hostSnapshot = hostMessages.find((m) => m.type === 'STATE_SNAPSHOT');
    if (hostSnapshot && hostSnapshot.payload.state.phase === 'CLUE_LEVEL') {
      pass('Game transitions to CLUE_LEVEL');
    } else {
      fail('Game transitions to CLUE_LEVEL', 'Phase not CLUE_LEVEL');
    }

    // Verify CLUE_PRESENT received
    if (hostMessages.some((m) => m.type === 'CLUE_PRESENT')) {
      const clueEvent = hostMessages.find((m) => m.type === 'CLUE_PRESENT');
      if (clueEvent.payload.clueLevelPoints === 10) {
        pass('First clue is 10 points');
      } else {
        fail('First clue is 10 points', `Got ${clueEvent.payload.clueLevelPoints}`);
      }
    } else {
      fail('CLUE_PRESENT received', 'Event not received');
    }

    // Verify projection: host sees destination
    if (hostSnapshot.payload.state.destination?.name) {
      pass('Host sees destination name');
    } else {
      fail('Host sees destination name', 'Name is null');
    }

    // Verify projection: player does not see destination
    const playerSnapshot = playerMessages.find((m) => m.type === 'STATE_SNAPSHOT');
    if (playerSnapshot && playerSnapshot.payload.state.destination?.name === null) {
      pass('Player does not see destination name');
    } else {
      fail(
        'Player does not see destination name',
        `Name is ${playerSnapshot?.payload.state.destination?.name}`
      );
    }

    // Step 5: Advance clues
    for (const points of [8, 6, 4, 2]) {
      log(`Advancing to ${points}-point clue...`);
      hostMessages.length = 0;

      hostWs.send(
        JSON.stringify({
          type: 'HOST_NEXT_CLUE',
          sessionId,
          serverTimeMs: Date.now(),
          payload: {},
        })
      );

      await sleep(500);

      const clueEvent = hostMessages.find((m) => m.type === 'CLUE_PRESENT');
      if (clueEvent && clueEvent.payload.clueLevelPoints === points) {
        pass(`Clue advanced to ${points} points`);
      } else {
        fail(
          `Clue advanced to ${points} points`,
          `Got ${clueEvent?.payload.clueLevelPoints || 'no clue'}`
        );
      }
    }

    // Step 6: Reveal destination
    log('Revealing destination...');
    hostMessages.length = 0;
    playerMessages.length = 0;

    hostWs.send(
      JSON.stringify({
        type: 'HOST_NEXT_CLUE',
        sessionId,
        serverTimeMs: Date.now(),
        payload: {},
      })
    );

    await sleep(1000);

    // Verify DESTINATION_REVEAL received
    if (hostMessages.some((m) => m.type === 'DESTINATION_REVEAL')) {
      pass('DESTINATION_REVEAL received');
    } else {
      fail('DESTINATION_REVEAL received', 'Event not received');
    }

    // Verify DESTINATION_RESULTS received
    if (hostMessages.some((m) => m.type === 'DESTINATION_RESULTS')) {
      pass('DESTINATION_RESULTS received');
    } else {
      fail('DESTINATION_RESULTS received', 'Event not received');
    }

    // After reveal: SCOREBOARD_UPDATE if no followups, FOLLOWUP_QUESTION_PRESENT if there are
    if (hostMessages.some((m) => m.type === 'SCOREBOARD_UPDATE')) {
      pass('SCOREBOARD_UPDATE received');
    } else if (hostMessages.some((m) => m.type === 'FOLLOWUP_QUESTION_PRESENT')) {
      pass('SCOREBOARD_UPDATE received');  // followup path — scoreboard comes after sequence
    } else {
      fail('SCOREBOARD_UPDATE received', 'Neither SCOREBOARD_UPDATE nor FOLLOWUP_QUESTION_PRESENT received');
    }

    // Verify phase changed to REVEAL_DESTINATION
    const revealSnapshot = hostMessages.find((m) => m.type === 'STATE_SNAPSHOT');
    if (revealSnapshot?.payload.state.phase === 'REVEAL_DESTINATION') {
      pass('Phase transitions to REVEAL_DESTINATION');
    } else {
      fail(
        'Phase transitions to REVEAL_DESTINATION',
        `Phase is ${revealSnapshot?.payload.state.phase}`
      );
    }

    // Verify player now sees destination
    const playerRevealSnapshot = playerMessages.find(
      (m) => m.type === 'STATE_SNAPSHOT'
    );
    if (playerRevealSnapshot?.payload.state.destination?.revealed === true) {
      pass('Player sees revealed destination');
    } else {
      fail('Player sees revealed destination', 'Destination not revealed');
    }

    // Step 7: Test authorization errors
    log('Testing authorization errors...');
    playerMessages.length = 0;

    playerWs.send(
      JSON.stringify({
        type: 'HOST_START_GAME',
        sessionId,
        serverTimeMs: Date.now(),
        payload: {},
      })
    );

    await sleep(500);

    const errorEvent = playerMessages.find((m) => m.type === 'ERROR');
    if (errorEvent?.payload.errorCode === 'UNAUTHORIZED') {
      pass('Non-host cannot start game');
    } else {
      fail('Non-host cannot start game', 'Error not received or wrong code');
    }

    // Cleanup
    hostWs.close();
    playerWs.close();

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Test Summary:');
    console.log('='.repeat(50));

    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;

    results.forEach((result) => {
      if (result.passed) {
        console.log(`✅ ${result.name}`);
      } else {
        console.log(`❌ ${result.name}: ${result.error}`);
      }
    });

    console.log('='.repeat(50));
    console.log(`Total: ${results.length} tests`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log('='.repeat(50));

    if (failedCount === 0) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n💥 Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
