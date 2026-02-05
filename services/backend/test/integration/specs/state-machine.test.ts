/**
 * State machine transition tests
 */

import { TestRunner, suite, test } from '../helpers/test-runner';
import { assert, assertEqual, assertExists, assertProperty } from '../helpers/assertions';
import { createTestSession, cleanupClients, sleep } from '../helpers/test-session';

export async function runStateMachineTests(): Promise<void> {
  const runner = new TestRunner();

  await runner.runSuite(suite('State Machine Transitions', [
    test('Should start in LOBBY phase', async () => {
      const { host, tv, players } = await createTestSession(2);

      const state = host.getCurrentState();
      assertEqual(state.phase, 'LOBBY', 'Initial phase should be LOBBY');

      cleanupClients(host, tv, ...players);
    }),

    test('LOBBY → CLUE_LEVEL transition', async () => {
      const { host, tv, players } = await createTestSession(2);

      const initialState = host.getCurrentState();
      assertEqual(initialState.phase, 'LOBBY', 'Should start in LOBBY');

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      const newState = host.getCurrentState();
      assertEqual(newState.phase, 'CLUE_LEVEL', 'Should transition to CLUE_LEVEL');
      assertEqual(newState.clueLevelPoints, 10, 'Should start at 10 points');

      cleanupClients(host, tv, ...players);
    }),

    test('CLUE_LEVEL → PAUSED_FOR_BRAKE transition', async () => {
      const { host, tv, players } = await createTestSession(2);

      // Start game
      host.send('HOST_START_GAME', {});
      await sleep(1000);

      players[0].clearMessages();

      // Player pulls brake
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });

      await sleep(500);

      const brakeAccepted = players[0].getLatestMessage('BRAKE_ACCEPTED');
      assertExists(brakeAccepted, 'Should receive BRAKE_ACCEPTED');

      const state = players[0].getCurrentState();
      assertEqual(state.phase, 'PAUSED_FOR_BRAKE', 'Phase should be PAUSED_FOR_BRAKE');
      assertEqual(state.brakeOwnerPlayerId, players[0].playerId, 'Brake owner should be set');

      cleanupClients(host, tv, ...players);
    }),

    test('PAUSED_FOR_BRAKE → CLUE_LEVEL after answer submission', async () => {
      const { host, tv, players } = await createTestSession(2);

      // Start game and pull brake
      host.send('HOST_START_GAME', {});
      await sleep(1000);

      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      players[0].clearMessages();

      // Submit answer
      players[0].send('BRAKE_ANSWER_SUBMIT', {
        playerId: players[0].playerId,
        answerText: 'Paris',
      });

      await sleep(500);

      const state = players[0].getCurrentState();
      assertEqual(state.phase, 'CLUE_LEVEL', 'Should return to CLUE_LEVEL');
      assertEqual(state.brakeOwnerPlayerId, null, 'Brake owner should be cleared');

      cleanupClients(host, tv, ...players);
    }),

    test('CLUE_LEVEL → REVEAL_DESTINATION after last clue', async () => {
      const { host, tv, players } = await createTestSession(2);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // Advance through all 5 clues (already at 10, advance 4 more times, then reveal)
      for (let i = 0; i < 5; i++) {
        host.send('HOST_NEXT_CLUE', {});
        await sleep(500);
      }

      const state = host.getCurrentState();
      assert(
        state.phase === 'REVEAL_DESTINATION' || state.phase === 'FOLLOWUP_QUESTION',
        'Should be in REVEAL_DESTINATION or FOLLOWUP_QUESTION'
      );

      cleanupClients(host, tv, ...players);
    }),

    test('Should maintain scoreboard through transitions', async () => {
      const { host, tv, players } = await createTestSession(3);

      // Initial scoreboard
      const initialState = host.getCurrentState();
      assertExists(initialState.scoreboard, 'Scoreboard should exist');
      assert(initialState.scoreboard.length >= 3, 'Scoreboard should have all players');

      // Start game
      host.send('HOST_START_GAME', {});
      await sleep(1000);

      const gameState = host.getCurrentState();
      assertExists(gameState.scoreboard, 'Scoreboard should exist during game');

      cleanupClients(host, tv, ...players);
    }),

    test('Should track locked answers in state', async () => {
      const { host, tv, players } = await createTestSession(2);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // Player pulls brake and submits answer
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      players[0].send('BRAKE_ANSWER_SUBMIT', {
        playerId: players[0].playerId,
        answerText: 'Paris',
      });
      await sleep(500);

      const hostState = host.getCurrentState();
      assertExists(hostState.lockedAnswers, 'Should have lockedAnswers array');
      assertEqual(hostState.lockedAnswers.length, 1, 'Should have 1 locked answer');

      const lockedAnswer = hostState.lockedAnswers[0];
      assertEqual(lockedAnswer.playerId, players[0].playerId, 'PlayerId should match');
      assertEqual(lockedAnswer.lockedAtLevelPoints, 10, 'Should be locked at 10 points');

      cleanupClients(host, tv, ...players);
    }),

    test('Should clear brakeOwnerPlayerId when host advances during brake', async () => {
      const { host, tv, players } = await createTestSession(2);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // Player pulls brake
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      const pausedState = host.getCurrentState();
      assertEqual(pausedState.phase, 'PAUSED_FOR_BRAKE', 'Should be paused');

      // Host forces advance
      host.send('HOST_NEXT_CLUE', {});
      await sleep(500);

      const advancedState = host.getCurrentState();
      assertEqual(advancedState.phase, 'CLUE_LEVEL', 'Should be back to CLUE_LEVEL');
      assertEqual(advancedState.brakeOwnerPlayerId, null, 'Brake owner should be cleared');
      assertEqual(advancedState.clueLevelPoints, 8, 'Should advance to 8 points');

      cleanupClients(host, tv, ...players);
    }),
  ]));

  runner.printSummary();

  if (!runner.allPassed()) {
    process.exit(1);
  }
}

if (require.main === module) {
  runStateMachineTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
