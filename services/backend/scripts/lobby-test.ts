/**
 * Lobby realtime update test script
 *
 * Tests:
 * 1. Host creates session and connects
 * 2. Player joins via REST (Host receives LOBBY_UPDATED)
 * 3. Player connects via WS (Host receives LOBBY_UPDATED)
 * 4. Player disconnects (Host receives LOBBY_UPDATED)
 */

import WebSocket from 'ws';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

interface Event {
  type: string;
  sessionId: string;
  serverTimeMs: number;
  payload: any;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  console.log('\n🧪 Lobby Realtime Update Test\n');
  console.log('=' .repeat(60));

  // 1. Create session
  console.log('\n[1] Creating session...');
  const { data: session } = await axios.post(`${BASE_URL}/v1/sessions`);
  console.log(`✓ Session created: ${session.sessionId}`);
  console.log(`  Join code: ${session.joinCode}`);

  await sleep(500);

  // 2. Connect host
  console.log('\n[2] Connecting host via WebSocket...');
  const hostWs = new WebSocket(`${WS_URL}?token=${session.hostAuthToken}`);

  const hostEvents: Event[] = [];
  hostWs.on('message', (data: Buffer) => {
    const event: Event = JSON.parse(data.toString());
    hostEvents.push(event);
    console.log(`  Host received: ${event.type}`);
    if (event.type === 'LOBBY_UPDATED') {
      console.log(`    Players: ${event.payload.players.map((p: any) =>
        `${p.name} (${p.isConnected ? 'connected' : 'disconnected'})`
      ).join(', ')}`);
    }
  });

  await sleep(1000);

  // 3. Player joins via REST
  console.log('\n[3] Player joining via REST...');
  const { data: player } = await axios.post(
    `${BASE_URL}/v1/sessions/${session.sessionId}/join`,
    { name: 'Alice' }
  );
  console.log(`✓ Player joined: ${player.playerId}`);

  await sleep(1000);

  // Check if host received LOBBY_UPDATED
  const lobbyUpdate1 = hostEvents.find(e =>
    e.type === 'LOBBY_UPDATED' &&
    e.payload.players.some((p: any) => p.name === 'Alice')
  );
  if (lobbyUpdate1) {
    console.log('✅ Host received LOBBY_UPDATED (Alice joined, not connected)');
  } else {
    console.log('❌ Host did NOT receive LOBBY_UPDATED after player join');
  }

  // 4. Player connects via WebSocket
  console.log('\n[4] Player connecting via WebSocket...');
  const playerWs = new WebSocket(`${WS_URL}?token=${player.playerAuthToken}`);

  playerWs.on('message', (data: Buffer) => {
    const event: Event = JSON.parse(data.toString());
    console.log(`  Player received: ${event.type}`);
  });

  await sleep(1000);

  // Check if host received LOBBY_UPDATED with player connected
  const lobbyUpdate2 = hostEvents.filter(e =>
    e.type === 'LOBBY_UPDATED' &&
    e.payload.players.some((p: any) => p.name === 'Alice' && p.isConnected)
  );
  if (lobbyUpdate2.length > 0) {
    console.log('✅ Host received LOBBY_UPDATED (Alice connected)');
  } else {
    console.log('❌ Host did NOT receive LOBBY_UPDATED after player connect');
  }

  // 5. Player disconnects
  console.log('\n[5] Player disconnecting...');
  playerWs.close();

  await sleep(1000);

  // Check if host received LOBBY_UPDATED with player disconnected
  const lobbyUpdate3 = hostEvents.filter(e =>
    e.type === 'LOBBY_UPDATED' &&
    e.payload.players.some((p: any) => p.name === 'Alice' && !p.isConnected)
  );
  if (lobbyUpdate3.length > 0) {
    console.log('✅ Host received LOBBY_UPDATED (Alice disconnected)');
  } else {
    console.log('❌ Host did NOT receive LOBBY_UPDATED after player disconnect');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:');
  console.log(`  Total events received by host: ${hostEvents.length}`);
  console.log(`  WELCOME: ${hostEvents.filter(e => e.type === 'WELCOME').length}`);
  console.log(`  STATE_SNAPSHOT: ${hostEvents.filter(e => e.type === 'STATE_SNAPSHOT').length}`);
  console.log(`  LOBBY_UPDATED: ${hostEvents.filter(e => e.type === 'LOBBY_UPDATED').length}`);

  // Cleanup
  hostWs.close();
  console.log('\n✅ Test completed!\n');
  process.exit(0);
}

test().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
