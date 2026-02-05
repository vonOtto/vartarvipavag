/**
 * Brake fairness and concurrency tests
 */

import { TestRunner, suite, test } from '../helpers/test-runner';
import { assert, assertEqual, assertExists } from '../helpers/assertions';
import { createTestSession, cleanupClients, sleep } from '../helpers/test-session';

export async function runBrakeFairnessTests(): Promise<void> {
  const runner = new TestRunner();

  await runner.runSuite(suite('Brake Fairness', [
    test('Should accept first brake and reject others', async () => {
      const { host, tv, players } = await createTestSession(5);

      // Start game
      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // Clear messages
      players.forEach(p => p.clearMessages());

      // All players pull brake simultaneously (staggered by 10ms for testing)
      const pullPromises = players.map((player, index) => {
        return sleep(index * 10).then(() => {
          player.send('BRAKE_PULL', {
            playerId: player.playerId,
            clientTimeMs: Date.now(),
          });
        });
      });

      await Promise.all(pullPromises);
      await sleep(1000);

      // Count accepted vs rejected
      const acceptedCount = players.filter(p =>
        p.getMessages('BRAKE_ACCEPTED').length > 0
      ).length;

      const rejectedCount = players.filter(p =>
        p.getMessages('BRAKE_REJECTED').length > 0
      ).length;

      assertEqual(acceptedCount, 1, 'Exactly 1 player should get BRAKE_ACCEPTED');
      assertEqual(rejectedCount, 4, 'Exactly 4 players should get BRAKE_REJECTED');

      cleanupClients(host, tv, ...players);
    }),

    test('Should reject brake with reason "too_late"', async () => {
      const { host, tv, players } = await createTestSession(2);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // Player 1 pulls brake
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(300);

      // Player 2 pulls brake after
      players[1].clearMessages();
      players[1].send('BRAKE_PULL', {
        playerId: players[1].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(300);

      const rejection = players[1].getLatestMessage('BRAKE_REJECTED');
      assertExists(rejection, 'Player 2 should receive BRAKE_REJECTED');
      assert(
        rejection.payload.reason === 'too_late' || rejection.payload.reason === 'already_paused',
        'Reason should be too_late or already_paused'
      );

      cleanupClients(host, tv, ...players);
    }),

    test('Should enforce rate limiting (1 brake per 2 seconds)', async () => {
      const { host, tv, players } = await createTestSession(1);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // First brake - should succeed
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      const accepted = players[0].getLatestMessage('BRAKE_ACCEPTED');
      assertExists(accepted, 'First brake should be accepted');

      // Submit answer to release brake
      players[0].send('BRAKE_ANSWER_SUBMIT', {
        playerId: players[0].playerId,
        answerText: 'Test',
      });
      await sleep(500);

      // Advance to next clue
      host.send('HOST_NEXT_CLUE', {});
      await sleep(500);

      // Second brake immediately (< 2 seconds) - should be rate limited
      players[0].clearMessages();
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      const rejection = players[0].getLatestMessage('BRAKE_REJECTED');
      assertExists(rejection, 'Second brake should be rejected');
      assertEqual(rejection.payload.reason, 'rate_limited', 'Should be rate_limited');

      cleanupClients(host, tv, ...players);
    }),

    test('Should reject brake in wrong phase', async () => {
      const { host, tv, players } = await createTestSession(1);

      // Try to brake in LOBBY phase
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      const rejection = players[0].getLatestMessage('BRAKE_REJECTED');
      assertExists(rejection, 'Should receive BRAKE_REJECTED');
      assertEqual(rejection.payload.reason, 'invalid_phase', 'Should be invalid_phase');

      cleanupClients(host, tv, ...players);
    }),

    test('Should broadcast BRAKE_ACCEPTED to all clients', async () => {
      const { host, tv, players } = await createTestSession(3);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // Clear messages
      host.clearMessages();
      tv.clearMessages();
      players.forEach(p => p.clearMessages());

      // Player 1 pulls brake
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      // All clients should receive BRAKE_ACCEPTED
      const hostAccepted = host.getLatestMessage('BRAKE_ACCEPTED');
      const tvAccepted = tv.getLatestMessage('BRAKE_ACCEPTED');
      const player2Accepted = players[1].getLatestMessage('BRAKE_ACCEPTED');

      assertExists(hostAccepted, 'Host should receive BRAKE_ACCEPTED');
      assertExists(tvAccepted, 'TV should receive BRAKE_ACCEPTED');
      assertExists(player2Accepted, 'Other players should receive BRAKE_ACCEPTED');

      assertEqual(hostAccepted.payload.playerId, players[0].playerId, 'PlayerId should match');
      assertEqual(tvAccepted.payload.playerId, players[0].playerId, 'PlayerId should match');

      cleanupClients(host, tv, ...players);
    }),

    test('Should only accept answer from brake owner', async () => {
      const { host, tv, players } = await createTestSession(2);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // Player 1 pulls brake
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      // Player 2 tries to submit answer (not brake owner)
      players[1].clearMessages();
      players[1].send('BRAKE_ANSWER_SUBMIT', {
        playerId: players[1].playerId,
        answerText: 'Paris',
      });
      await sleep(500);

      const error = players[1].getLatestMessage('ERROR');
      assertExists(error, 'Player 2 should receive ERROR');

      cleanupClients(host, tv, ...players);
    }),

    test('Should prevent duplicate answers for same destination', async () => {
      const { host, tv, players } = await createTestSession(1);

      host.send('HOST_START_GAME', {});
      await sleep(1000);

      // First brake and answer
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

      // Advance to next clue
      host.send('HOST_NEXT_CLUE', {});
      await sleep(2500); // Wait for rate limit

      // Try to brake again on same destination
      players[0].clearMessages();
      players[0].send('BRAKE_PULL', {
        playerId: players[0].playerId,
        clientTimeMs: Date.now(),
      });
      await sleep(500);

      const rejection = players[0].getLatestMessage('BRAKE_REJECTED');
      assertExists(rejection, 'Should reject second brake for same destination');

      cleanupClients(host, tv, ...players);
    }),
  ]));

  runner.printSummary();

  if (!runner.allPassed()) {
    process.exit(1);
  }
}

if (require.main === module) {
  runBrakeFairnessTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
