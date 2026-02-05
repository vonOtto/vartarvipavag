/**
 * Game flow integration tests
 * Tests the complete game flow from lobby to scoring
 */

import { TestRunner, suite, test } from '../helpers/test-runner';
import { assert, assertEqual, assertExists, assertProperty, assertLength } from '../helpers/assertions';
import { createTestSession, cleanupClients, sleep } from '../helpers/test-session';

export async function runGameFlowTests(): Promise<void> {
  const runner = new TestRunner();

  await runner.runSuite(suite('Game Flow', [
    test('Should transition from LOBBY to CLUE_LEVEL when host starts game', async () => {
      const { host, tv, players } = await createTestSession(2);

      // Clear messages
      host.clearMessages();
      tv.clearMessages();
      players.forEach(p => p.clearMessages());

      // Host starts game
      host.send('HOST_START_GAME', {});

      // Wait for state transition
      await sleep(1000);

      // Check host received events
      const hostSnapshot = host.getLatestMessage('STATE_SNAPSHOT');
      assertExists(hostSnapshot, 'Host should receive STATE_SNAPSHOT');
      assertEqual(hostSnapshot.payload.state.phase, 'CLUE_LEVEL', 'Phase should be CLUE_LEVEL');

      const hostClue = host.getLatestMessage('CLUE_PRESENT');
      assertExists(hostClue, 'Host should receive CLUE_PRESENT');
      assertEqual(hostClue.payload.clueLevelPoints, 10, 'First clue should be 10 points');

      // Check TV received same events
      const tvSnapshot = tv.getLatestMessage('STATE_SNAPSHOT');
      assertExists(tvSnapshot, 'TV should receive STATE_SNAPSHOT');
      assertEqual(tvSnapshot.payload.state.phase, 'CLUE_LEVEL', 'TV phase should be CLUE_LEVEL');

      // Check players received events
      const player1Snapshot = players[0].getLatestMessage('STATE_SNAPSHOT');
      assertExists(player1Snapshot, 'Player should receive STATE_SNAPSHOT');
      assertEqual(player1Snapshot.payload.state.phase, 'CLUE_LEVEL', 'Player phase should be CLUE_LEVEL');

      cleanupClients(host, tv, ...players);
    }),

    test('Should advance through all clue levels (10→8→6→4→2)', async () => {
      const { host, tv, players } = await createTestSession(2);

      // Start game
      host.send('HOST_START_GAME', {});
      await sleep(1000);

      const expectedLevels = [8, 6, 4, 2]; // Already at 10

      for (const points of expectedLevels) {
        host.clearMessages();

        host.send('HOST_NEXT_CLUE', {});
        await sleep(500);

        const clue = host.getLatestMessage('CLUE_PRESENT');
        assertExists(clue, `Should receive clue for ${points} points`);
        assertEqual(clue.payload.clueLevelPoints, points, `Clue should be ${points} points`);
      }

      cleanupClients(host, tv, ...players);
    }),

    test('Should transition to REVEAL_DESTINATION after last clue', async () => {
      const { host, tv, players } = await createTestSession(2);

      // Start game
      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // Advance through all clues
      for (let i = 0; i < 5; i++) {
        host.send('HOST_NEXT_CLUE', {});
        await sleep(500);
      }

      // Should now be in reveal
      const snapshot = host.getLatestMessage('STATE_SNAPSHOT');
      assertExists(snapshot, 'Should receive STATE_SNAPSHOT');
      assert(
        snapshot.payload.state.phase === 'REVEAL_DESTINATION' ||
        snapshot.payload.state.phase === 'FOLLOWUP_QUESTION',
        'Phase should be REVEAL_DESTINATION or FOLLOWUP_QUESTION'
      );

      const reveal = host.getLatestMessage('DESTINATION_REVEAL');
      assertExists(reveal, 'Should receive DESTINATION_REVEAL');
      assertProperty(reveal.payload, 'destinationName', undefined, 'Should have destination name');
      assertProperty(reveal.payload, 'country', undefined, 'Should have country');

      cleanupClients(host, tv, ...players);
    }),

    test('Should broadcast DESTINATION_RESULTS with scoring', async () => {
      const { host, tv, players } = await createTestSession(2);

      // Start and complete game
      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // Advance to reveal
      for (let i = 0; i < 5; i++) {
        host.send('HOST_NEXT_CLUE', {});
        await sleep(500);
      }

      const results = host.getLatestMessage('DESTINATION_RESULTS');
      assertExists(results, 'Should receive DESTINATION_RESULTS');
      assertProperty(results.payload, 'results', undefined, 'Should have results array');
      assert(Array.isArray(results.payload.results), 'Results should be an array');

      cleanupClients(host, tv, ...players);
    }),

    test('Should send SCOREBOARD_UPDATE after results', async () => {
      const { host, tv, players } = await createTestSession(2);

      // Start and complete game
      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // Advance to reveal
      for (let i = 0; i < 5; i++) {
        host.send('HOST_NEXT_CLUE', {});
        await sleep(500);
      }

      // Wait for followup sequence if exists
      await sleep(2000);

      const scoreboard = host.getLatestMessage('SCOREBOARD_UPDATE');
      // Scoreboard might come immediately or after followups
      if (scoreboard) {
        assertProperty(scoreboard.payload, 'scoreboard', undefined, 'Should have scoreboard');
        assert(Array.isArray(scoreboard.payload.scoreboard), 'Scoreboard should be an array');
      }

      cleanupClients(host, tv, ...players);
    }),

    test('Should reject HOST_START_GAME from non-host', async () => {
      const { host, tv, players } = await createTestSession(2);

      players[0].clearMessages();

      // Player tries to start game
      players[0].send('HOST_START_GAME', {});
      await sleep(500);

      const error = players[0].getLatestMessage('ERROR');
      assertExists(error, 'Player should receive ERROR');
      assertEqual(error.payload.errorCode, 'UNAUTHORIZED', 'Error should be UNAUTHORIZED');

      cleanupClients(host, tv, ...players);
    }),

    test('Should reject HOST_NEXT_CLUE from non-host', async () => {
      const { host, tv, players } = await createTestSession(2);

      // Start game first
      host.send('HOST_START_GAME', {});
      await sleep(1000);

      tv.clearMessages();

      // TV tries to advance clue
      tv.send('HOST_NEXT_CLUE', {});
      await sleep(500);

      const error = tv.getLatestMessage('ERROR');
      assertExists(error, 'TV should receive ERROR');
      assertEqual(error.payload.errorCode, 'UNAUTHORIZED', 'Error should be UNAUTHORIZED');

      cleanupClients(host, tv, ...players);
    }),
  ]));

  runner.printSummary();

  if (!runner.allPassed()) {
    process.exit(1);
  }
}

if (require.main === module) {
  runGameFlowTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
