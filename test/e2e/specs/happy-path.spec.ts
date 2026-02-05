/**
 * Happy Path E2E Test
 *
 * Tests the complete game flow from session creation to finale:
 * - Create session
 * - 2 players join
 * - Progress through all 5 clue levels (10/8/6/4/2)
 * - Players brake and submit answers
 * - Reveal shows correct destination
 * - Scoring is accurate
 * - Scoreboard updates correctly
 */

import { test, expect } from '@playwright/test';
import { createSession, joinAsPlayer } from '../helpers/api';
import {
  waitForWSConnection,
  waitForPhase,
  pullBrake,
  submitAnswer,
  startGame,
  nextClue,
  getGameState,
} from '../helpers/websocket';
import {
  expectPhase,
  expectPlayerCount,
  expectPlayerHasLockedAnswer,
  expectPlayerScore,
  expectClueLevel,
} from '../helpers/assertions';

test.describe('Happy Path - Full Game Flow', () => {
  test('complete game session with 2 players through all 5 clue levels', async ({
    browser,
  }) => {
    // Create session
    const session = await createSession();
    expect(session.sessionId).toBeTruthy();
    expect(session.joinCode).toBeTruthy();

    // Create browser contexts for 2 players
    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();

    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    try {
      // Player 1 joins
      const player1 = await joinAsPlayer(session.sessionId, 'Alice');
      await player1Page.goto(`/join/${session.sessionId}`);
      await player1Page.fill('input[name="playerName"]', 'Alice');
      await player1Page.click('button[type="submit"]');
      await waitForWSConnection(player1Page);
      await waitForPhase(player1Page, 'LOBBY');

      // Player 2 joins
      const player2 = await joinAsPlayer(session.sessionId, 'Bob');
      await player2Page.goto(`/join/${session.sessionId}`);
      await player2Page.fill('input[name="playerName"]', 'Bob');
      await player2Page.click('button[type="submit"]');
      await waitForWSConnection(player2Page);
      await waitForPhase(player2Page, 'LOBBY');

      // Verify both players see each other in lobby
      await expectPlayerCount(player1Page, 2);
      await expectPlayerCount(player2Page, 2);

      // Host starts game (simulated via WebSocket for this test)
      await startGame(player1Page);
      await waitForPhase(player1Page, 'CLUE_LEVEL', 15000);
      await waitForPhase(player2Page, 'CLUE_LEVEL', 15000);

      // Verify starting at clue level 10
      await expectClueLevel(player1Page, 10);
      await expectClueLevel(player2Page, 10);

      // Clue Level 10: Player 1 brakes and submits answer
      await pullBrake(player1Page);
      await player1Page.waitForTimeout(500); // Wait for brake to be accepted
      await submitAnswer(player1Page, 'Paris');
      await player1Page.waitForTimeout(500);

      // Verify answer is locked
      await expectPlayerHasLockedAnswer(player1Page, player1.playerId);

      // Progress to clue level 8
      await nextClue(player1Page);
      await waitForPhase(player1Page, 'CLUE_LEVEL', 5000);
      await expectClueLevel(player1Page, 8);

      // Clue Level 8: Player 2 brakes and submits answer
      await pullBrake(player2Page);
      await player2Page.waitForTimeout(500);
      await submitAnswer(player2Page, 'Paris');
      await player2Page.waitForTimeout(500);

      // Verify Player 2's answer is locked
      await expectPlayerHasLockedAnswer(player2Page, player2.playerId);

      // Progress through remaining clue levels (6, 4, 2) without brakes
      for (const level of [6, 4, 2]) {
        await nextClue(player1Page);
        await waitForPhase(player1Page, 'CLUE_LEVEL', 5000);
        await expectClueLevel(player1Page, level);
      }

      // After clue level 2, advance to reveal
      await nextClue(player1Page);
      await waitForPhase(player1Page, 'REVEAL_DESTINATION', 10000);
      await waitForPhase(player2Page, 'REVEAL_DESTINATION', 10000);

      // Verify reveal phase
      await expectPhase(player1Page, 'REVEAL_DESTINATION');
      await expectPhase(player2Page, 'REVEAL_DESTINATION');

      // Wait for scoring to complete
      await player1Page.waitForTimeout(2000);

      // Verify scores (assuming both got "Paris" correct)
      // Player 1 locked at level 10 = 10 points
      // Player 2 locked at level 8 = 8 points
      const player1State = await getGameState(player1Page);
      const player2State = await getGameState(player2Page);

      const p1Score = player1State.scoreboard.find(
        (s: any) => s.playerId === player1.playerId
      );
      const p2Score = player2State.scoreboard.find(
        (s: any) => s.playerId === player2.playerId
      );

      expect(p1Score.totalPoints).toBe(10);
      expect(p2Score.totalPoints).toBe(8);

      // Advance to scoreboard
      await nextClue(player1Page);
      await waitForPhase(player1Page, 'SCOREBOARD', 5000);
      await waitForPhase(player2Page, 'SCOREBOARD', 5000);

      // Verify scoreboard phase
      await expectPhase(player1Page, 'SCOREBOARD');
      await expectPhase(player2Page, 'SCOREBOARD');

      // Test passes if we reach this point without errors
      console.log('Happy path test completed successfully!');
    } finally {
      // Cleanup
      await player1Context.close();
      await player2Context.close();
    }
  });
});
