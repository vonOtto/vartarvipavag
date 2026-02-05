/**
 * WebSocket connection and authentication tests
 */

import { TestRunner, suite, test } from '../helpers/test-runner';
import { assert, assertEqual, assertExists, assertProperty } from '../helpers/assertions';
import { createSession, createClient, cleanupClients, sleep } from '../helpers/test-session';
import WebSocket from 'ws';

const WS_URL = process.env.TEST_WS_URL || 'ws://localhost:3000/ws';

export async function runWebSocketTests(): Promise<void> {
  const runner = new TestRunner();

  await runner.runSuite(suite('WebSocket Connection & Auth', [
    test('Should connect with valid token and receive WELCOME', async () => {
      const session = await createSession();
      const client = await createClient(session.hostAuthToken);

      assert(client.isConnected(), 'Client should be connected');
      assertExists(client.playerId, 'Should have playerId');
      assertExists(client.role, 'Should have role');
      assertEqual(client.role, 'HOST', 'Role should be HOST');
      assertEqual(client.sessionId, session.sessionId, 'SessionId should match');

      cleanupClients(client);
    }),

    test('Should receive STATE_SNAPSHOT after WELCOME', async () => {
      const session = await createSession();
      const client = await createClient(session.hostAuthToken);

      await sleep(500);

      const snapshot = client.getLatestMessage('STATE_SNAPSHOT');
      assertExists(snapshot, 'Should receive STATE_SNAPSHOT');
      assertProperty(snapshot.payload, 'state', undefined, 'Snapshot should have state');

      const state = snapshot.payload.state;
      assertEqual(state.phase, 'LOBBY', 'Initial phase should be LOBBY');
      assertEqual(state.sessionId, session.sessionId, 'State sessionId should match');

      cleanupClients(client);
    }),

    test('Should reject connection with invalid token', async () => {
      const ws = new WebSocket(`${WS_URL}?token=invalid-token`);

      const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
        ws.on('close', (code, reason) => {
          resolve({ code, reason: reason.toString() });
        });
      });

      const result = await closePromise;
      assert(result.code >= 4000, `Should close with error code >= 4000, got ${result.code}`);
    }),

    test('Should reject connection with missing token', async () => {
      const ws = new WebSocket(WS_URL); // No token

      const closePromise = new Promise<{ code: number }>((resolve) => {
        ws.on('close', (code) => {
          resolve({ code });
        });
      });

      const result = await closePromise;
      assert(result.code >= 4000, `Should close with error code >= 4000, got ${result.code}`);
    }),

    test('Should handle multiple clients connecting to same session', async () => {
      const session = await createSession();
      const host = await createClient(session.hostAuthToken);
      const tv = await createClient(session.tvAuthToken);

      await sleep(500);

      assert(host.isConnected(), 'Host should be connected');
      assert(tv.isConnected(), 'TV should be connected');
      assertEqual(tv.role, 'TV', 'TV role should be correct');

      cleanupClients(host, tv);
    }),

    test('Should support reconnection with same token', async () => {
      const session = await createSession();
      const client1 = await createClient(session.hostAuthToken);

      const playerId1 = client1.playerId;
      client1.close();

      await sleep(500);

      const client2 = await createClient(session.hostAuthToken);
      assertEqual(client2.playerId, playerId1, 'PlayerId should be preserved on reconnect');

      cleanupClients(client2);
    }),
  ]));

  runner.printSummary();

  if (!runner.allPassed()) {
    process.exit(1);
  }
}

if (require.main === module) {
  runWebSocketTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
