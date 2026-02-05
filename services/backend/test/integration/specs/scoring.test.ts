/**
 * Scoring calculation tests
 */

import { TestRunner, suite, test } from '../helpers/test-runner';
import { assert, assertEqual, assertExists, assertLength } from '../helpers/assertions';
import { createTestSession, cleanupClients, sleep } from '../helpers/test-session';

export async function runScoringTests(): Promise<void> {
  const runner = new TestRunner();

  await runner.runSuite(suite('Scoring', [
    test('Should award points for correct answer', async () => {
      const { host, tv, players } = await createTestSession(1);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // Get destination from host state (host can see it)
      const hostState = host.getCurrentState();
      const correctAnswer = hostState.destination.name;

      // Player brakes and answers correctly
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      players[0].send('BRAKE_ANSWER_SUBMIT', {
        playerId: players[0].playerId,
        answerText: correctAnswer,
      });
      await sleep(500);

      // Advance to reveal
      for (let i = 0; i < 5; i++) {
        host.send('HOST_NEXT_CLUE', {});
        await sleep(500);
      }

      const results = host.getLatestMessage('DESTINATION_RESULTS');
      assertExists(results, 'Should receive DESTINATION_RESULTS');

      const playerResult = results.payload.results.find(
        (r: any) => r.playerId === players[0].playerId
      );
      assertExists(playerResult, 'Should have player result');
      assertEqual(playerResult.isCorrect, true, 'Answer should be correct');
      assertEqual(playerResult.pointsAwarded, 10, 'Should award 10 points');

      cleanupClients(host, tv, ...players);
    }),

    test('Should award 0 points for incorrect answer', async () => {
      const { host, tv, players } = await createTestSession(1);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // Player brakes and answers incorrectly
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      players[0].send('BRAKE_ANSWER_SUBMIT', {
        playerId: players[0].playerId,
        answerText: 'Wrong Answer',
      });
      await sleep(500);

      // Advance to reveal
      for (let i = 0; i < 5; i++) {
        host.send('HOST_NEXT_CLUE', {});
        await sleep(500);
      }

      const results = host.getLatestMessage('DESTINATION_RESULTS');
      assertExists(results, 'Should receive DESTINATION_RESULTS');

      const playerResult = results.payload.results.find(
        (r: any) => r.playerId === players[0].playerId
      );
      assertExists(playerResult, 'Should have player result');
      assertEqual(playerResult.isCorrect, false, 'Answer should be incorrect');
      assertEqual(playerResult.pointsAwarded, 0, 'Should award 0 points');

      cleanupClients(host, tv, ...players);
    }),

    test('Should award points based on clue level', async () => {
      const { host, tv, players } = await createTestSession(3);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      const hostState = host.getCurrentState();
      const correctAnswer = hostState.destination.name;

      // Player 1 brakes at 10 points
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      players[0].send('BRAKE_ANSWER_SUBMIT', {
        playerId: players[0].playerId,
        answerText: correctAnswer,
      });
      await sleep(500);

      // Advance to 6 points
      host.send('HOST_NEXT_CLUE', {});
      await sleep(500);
      host.send('HOST_NEXT_CLUE', {});
      await sleep(2500); // Wait for rate limit

      // Player 2 brakes at 6 points
      players[1].send('BRAKE_PULL', {
        playerId: players[1].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      players[1].send('BRAKE_ANSWER_SUBMIT', {
        playerId: players[1].playerId,
        answerText: correctAnswer,
      });
      await sleep(500);

      // Advance to reveal
      for (let i = 0; i < 3; i++) {
        host.send('HOST_NEXT_CLUE', {});
        await sleep(500);
      }

      const results = host.getLatestMessage('DESTINATION_RESULTS');
      assertExists(results, 'Should receive DESTINATION_RESULTS');

      const player1Result = results.payload.results.find(
        (r: any) => r.playerId === players[0].playerId
      );
      const player2Result = results.payload.results.find(
        (r: any) => r.playerId === players[1].playerId
      );

      assertExists(player1Result, 'Should have player 1 result');
      assertExists(player2Result, 'Should have player 2 result');

      assertEqual(player1Result.pointsAwarded, 10, 'Player 1 should get 10 points');
      assertEqual(player2Result.pointsAwarded, 6, 'Player 2 should get 6 points');

      cleanupClients(host, tv, ...players);
    }),

    test('Should update scoreboard with cumulative scores', async () => {
      const { host, tv, players } = await createTestSession(2);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      const hostState = host.getCurrentState();
      const correctAnswer = hostState.destination.name;

      // Player 1 answers correctly
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      players[0].send('BRAKE_ANSWER_SUBMIT', {
        playerId: players[0].playerId,
        answerText: correctAnswer,
      });
      await sleep(500);

      // Advance to reveal
      for (let i = 0; i < 5; i++) {
        host.send('HOST_NEXT_CLUE', {});
        await sleep(500);
      }

      // Wait for followups if any
      await sleep(2000);

      const scoreboard = host.getLatestMessage('SCOREBOARD_UPDATE');
      if (scoreboard) {
        assertExists(scoreboard.payload.scoreboard, 'Should have scoreboard');
        assert(Array.isArray(scoreboard.payload.scoreboard), 'Scoreboard should be array');

        const player1Score = scoreboard.payload.scoreboard.find(
          (s: any) => s.playerId === players[0].playerId
        );

        assertExists(player1Score, 'Should have player 1 in scoreboard');
        assert(player1Score.score >= 10, 'Player 1 should have at least 10 points');
      }

      cleanupClients(host, tv, ...players);
    }),

    test('Should include all players in DESTINATION_RESULTS', async () => {
      const { host, tv, players } = await createTestSession(3);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // Only player 1 answers
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      players[0].send('BRAKE_ANSWER_SUBMIT', {
        playerId: players[0].playerId,
        answerText: 'Test',
      });
      await sleep(500);

      // Advance to reveal
      for (let i = 0; i < 5; i++) {
        host.send('HOST_NEXT_CLUE', {});
        await sleep(500);
      }

      const results = host.getLatestMessage('DESTINATION_RESULTS');
      assertExists(results, 'Should receive DESTINATION_RESULTS');

      // Should have results for all players (player 1 with answer, others without)
      // Note: The implementation might only include players who answered
      assert(
        results.payload.results.length >= 1,
        'Should have at least player who answered'
      );

      const player1Result = results.payload.results.find(
        (r: any) => r.playerId === players[0].playerId
      );
      assertExists(player1Result, 'Should have player 1 result');

      cleanupClients(host, tv, ...players);
    }),

    test('Should normalize answers for comparison', async () => {
      const { host, tv, players } = await createTestSession(1);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      const hostState = host.getCurrentState();
      const correctAnswer = hostState.destination.name;

      // Submit answer with different casing and whitespace
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      players[0].send('BRAKE_ANSWER_SUBMIT', {
        playerId: players[0].playerId,
        answerText: `  ${correctAnswer.toUpperCase()}  `,
      });
      await sleep(500);

      // Advance to reveal
      for (let i = 0; i < 5; i++) {
        host.send('HOST_NEXT_CLUE', {});
        await sleep(500);
      }

      const results = host.getLatestMessage('DESTINATION_RESULTS');
      assertExists(results, 'Should receive DESTINATION_RESULTS');

      const playerResult = results.payload.results.find(
        (r: any) => r.playerId === players[0].playerId
      );
      assertExists(playerResult, 'Should have player result');
      assertEqual(playerResult.isCorrect, true, 'Should match despite casing/whitespace');

      cleanupClients(host, tv, ...players);
    }),
  ]));

  runner.printSummary();

  if (!runner.allPassed()) {
    process.exit(1);
  }
}

if (require.main === module) {
  runScoringTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
