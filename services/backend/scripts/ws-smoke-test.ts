/**
 * WebSocket smoke test
 * Tests authentication, WELCOME, STATE_SNAPSHOT, and RESUME_SESSION
 *
 * Run with: npx tsx scripts/ws-smoke-test.ts
 */

import WebSocket from 'ws';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const WS_BASE = API_BASE.replace('http', 'ws');

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error });
  const status = passed ? '✓' : '✗';
  console.log(`${status} ${name}`);
  if (error) {
    console.log(`  Error: ${error}`);
  }
}

async function createSession(): Promise<{
  sessionId: string;
  hostAuthToken: string;
  joinCode: string;
}> {
  const response = await fetch(`${API_BASE}/v1/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status}`);
  }

  const data = await response.json();
  return {
    sessionId: data.sessionId,
    hostAuthToken: data.hostAuthToken,
    joinCode: data.joinCode,
  };
}

async function joinSession(sessionId: string, playerName: string): Promise<{
  playerId: string;
  playerAuthToken: string;
}> {
  const response = await fetch(`${API_BASE}/v1/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: playerName }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to join session: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    playerId: data.playerId,
    playerAuthToken: data.playerAuthToken,
  };
}

function connectWebSocket(token: string): Promise<{
  ws: WebSocket;
  welcomeEvent: any;
  snapshotEvent: any;
}> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);
    let welcomeEvent: any = null;
    let snapshotEvent: any = null;
    let messageCount = 0;

    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
      ws.close();
    }, 5000);

    ws.on('open', () => {
      console.log('  WebSocket connection opened');
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      messageCount++;

      if (message.type === 'WELCOME') {
        welcomeEvent = message;
        console.log('  Received WELCOME event');
      } else if (message.type === 'STATE_SNAPSHOT') {
        snapshotEvent = message;
        console.log('  Received STATE_SNAPSHOT event');
      }

      // After receiving both events, resolve
      if (welcomeEvent && snapshotEvent) {
        clearTimeout(timeout);
        resolve({ ws, welcomeEvent, snapshotEvent });
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      if (!welcomeEvent || !snapshotEvent) {
        clearTimeout(timeout);
        reject(new Error(`Connection closed before receiving events: ${code} ${reason}`));
      }
    });
  });
}

async function testInvalidToken() {
  console.log('\n[Test] Invalid token rejection');

  return new Promise<void>((resolve) => {
    const ws = new WebSocket(`${WS_BASE}/ws?token=invalid-token`);

    const timeout = setTimeout(() => {
      logTest('Invalid token rejection', false, 'Timeout waiting for close');
      ws.close();
      resolve();
    }, 5000);

    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      // Accept either 4001 (Invalid token) or 4002 (Token expired) for malformed tokens
      const passed = (code === 4001 || code === 4002) && reason.toString().length > 0;
      logTest(
        'Invalid token rejection',
        passed,
        passed ? undefined : `Expected code 4001 or 4002, got ${code} ${reason}`
      );
      resolve();
    });

    ws.on('error', () => {
      // Expected to error/close
    });
  });
}

async function testValidConnection() {
  console.log('\n[Test] Valid connection with WELCOME and STATE_SNAPSHOT');

  try {
    // Create session
    const { sessionId, hostAuthToken, joinCode } = await createSession();
    console.log(`  Created session: ${sessionId} (code: ${joinCode})`);
    logTest('Create session', true);

    // Connect as host
    const { ws, welcomeEvent, snapshotEvent } = await connectWebSocket(hostAuthToken);

    // Validate WELCOME event
    const welcomeValid =
      welcomeEvent.type === 'WELCOME' &&
      welcomeEvent.sessionId === sessionId &&
      typeof welcomeEvent.serverTimeMs === 'number' &&
      typeof welcomeEvent.payload.connectionId === 'string' &&
      welcomeEvent.payload.role === 'HOST' &&
      typeof welcomeEvent.payload.playerId === 'string';

    logTest(
      'WELCOME event structure',
      welcomeValid,
      welcomeValid ? undefined : 'Invalid WELCOME event structure'
    );

    // Validate STATE_SNAPSHOT event
    const snapshotValid =
      snapshotEvent.type === 'STATE_SNAPSHOT' &&
      snapshotEvent.sessionId === sessionId &&
      typeof snapshotEvent.serverTimeMs === 'number' &&
      snapshotEvent.payload.state !== undefined &&
      snapshotEvent.payload.state.phase === 'LOBBY';

    logTest(
      'STATE_SNAPSHOT event structure',
      snapshotValid,
      snapshotValid ? undefined : 'Invalid STATE_SNAPSHOT event structure'
    );

    // Validate HOST sees full state
    const state = snapshotEvent.payload.state;
    const hostSeesFullState =
      state.players.length > 0 &&
      state.joinCode === joinCode &&
      state.sessionId === sessionId;

    logTest(
      'HOST sees full state',
      hostSeesFullState,
      hostSeesFullState ? undefined : 'HOST state is incomplete'
    );

    ws.close();
    return sessionId;
  } catch (error: any) {
    logTest('Valid connection flow', false, error.message);
    throw error;
  }
}

async function testPlayerConnection(sessionId: string) {
  console.log('\n[Test] Player connection with filtered state');

  try {
    // Join as player
    const { playerId, playerAuthToken } = await joinSession(sessionId, 'Test Player');
    console.log(`  Joined as player: ${playerId}`);
    logTest('Join session as player', true);

    // Connect as player
    const { ws, welcomeEvent, snapshotEvent } = await connectWebSocket(playerAuthToken);

    // Validate player WELCOME
    const welcomeValid =
      welcomeEvent.type === 'WELCOME' &&
      welcomeEvent.payload.role === 'PLAYER' &&
      welcomeEvent.payload.playerId === playerId;

    logTest(
      'PLAYER WELCOME event',
      welcomeValid,
      welcomeValid ? undefined : 'Invalid PLAYER WELCOME'
    );

    // Validate player sees filtered state
    const state = snapshotEvent.payload.state;
    const playerSeesState =
      state.phase === 'LOBBY' &&
      state.players.some((p: any) => p.playerId === playerId);

    logTest(
      'PLAYER sees state',
      playerSeesState,
      playerSeesState ? undefined : 'PLAYER state is invalid'
    );

    ws.close();
    return { playerId, playerAuthToken };
  } catch (error: any) {
    logTest('Player connection flow', false, error.message);
    throw error;
  }
}

async function testResumeSession(sessionId: string, playerId: string, token: string) {
  console.log('\n[Test] RESUME_SESSION event');

  try {
    const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for initial events'));
        ws.close();
      }, 5000);

      let receivedWelcome = false;
      let receivedSnapshot = false;

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'WELCOME') {
          receivedWelcome = true;
        } else if (message.type === 'STATE_SNAPSHOT') {
          receivedSnapshot = true;
        }

        if (receivedWelcome && receivedSnapshot) {
          clearTimeout(timeout);
          resolve();
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    // Send RESUME_SESSION event
    const resumeEvent = {
      type: 'RESUME_SESSION',
      sessionId,
      serverTimeMs: Date.now(),
      payload: {
        playerId,
        lastReceivedEventId: 'test-event-id',
      },
    };

    // Wait for STATE_SNAPSHOT response after sending RESUME_SESSION
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for RESUME_SESSION response'));
        ws.close();
      }, 5000);

      // Set up listener first, then send the event
      const messageHandler = (data: any) => {
        const message = JSON.parse(data.toString());

        // After RESUME_SESSION, we expect a STATE_SNAPSHOT response
        if (message.type === 'STATE_SNAPSHOT') {
          clearTimeout(timeout);
          ws.off('message', messageHandler);
          logTest('RESUME_SESSION response', true);
          resolve();
        }
      };

      ws.on('message', messageHandler);

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Send the RESUME_SESSION event
      ws.send(JSON.stringify(resumeEvent));
      console.log('  Sent RESUME_SESSION event');
    });

    ws.close();
  } catch (error: any) {
    logTest('RESUME_SESSION flow', false, error.message);
    throw error;
  }
}

async function main() {
  console.log('=== WebSocket Smoke Test ===\n');
  console.log(`API Base: ${API_BASE}`);
  console.log(`WS Base: ${WS_BASE}\n`);

  try {
    // Test 1: Invalid token
    await testInvalidToken();

    // Test 2: Valid host connection
    const sessionId = await testValidConnection();

    // Test 3: Player connection
    const { playerId, playerAuthToken } = await testPlayerConnection(sessionId);

    // Test 4: Resume session
    await testResumeSession(sessionId, playerId, playerAuthToken);

    // Summary
    console.log('\n=== Test Summary ===');
    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    console.log(`Passed: ${passed}/${total}`);

    if (passed === total) {
      console.log('\n✓ All tests passed!');
      process.exit(0);
    } else {
      console.log('\n✗ Some tests failed');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n✗ Test suite failed:', error.message);
    process.exit(1);
  }
}

main();
