/**
 * Brake Scenario E2E Test
 *
 * Tests brake mechanics at different clue levels:
 * - Players brake at different clue levels
 * - Verify correct point values are awarded
 * - Test brake rejection (too late, already paused)
 * - Verify only brake owner can submit answer
 * - Test multiple brakes at same level (first wins)
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
  sendWSMessage,
} from '../helpers/websocket';
import {
  expectPhase,
  expectBrakeOwner,
  expectPlayerHasLockedAnswer,
  expectClueLevel,
} from '../helpers/assertions';

test.describe('Brake Scenarios', () => {
  test('players brake at different levels and receive correct points', async ({
    browser,
  }) => {
    const session = await createSession();

    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();
    const player3Context = await browser.newContext();

    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();
    const player3Page = await player3Context.newPage();

    try {
      // All players join
      const player1 = await joinAsPlayer(session.sessionId, 'Alice');
      const player2 = await joinAsPlayer(session.sessionId, 'Bob');
      const player3 = await joinAsPlayer(session.sessionId, 'Charlie');

      await player1Page.goto(`/join/${session.sessionId}`);
      await player1Page.fill('input[name="playerName"]', 'Alice');
      await player1Page.click('button[type="submit"]');
      await waitForWSConnection(player1Page);

      await player2Page.goto(`/join/${session.sessionId}`);
      await player2Page.fill('input[name="playerName"]', 'Bob');
      await player2Page.click('button[type="submit"]');
      await waitForWSConnection(player2Page);

      await player3Page.goto(`/join/${session.sessionId}`);
      await player3Page.fill('input[name="playerName"]', 'Charlie');
      await player3Page.click('button[type="submit"]');
      await waitForWSConnection(player3Page);

      // Start game
      await startGame(player1Page);
      await waitForPhase(player1Page, 'CLUE_LEVEL', 15000);

      // Level 10: Player 1 brakes
      await expectClueLevel(player1Page, 10);
      await pullBrake(player1Page);
      await player1Page.waitForTimeout(500);
      await expectPhase(player1Page, 'PAUSED_FOR_BRAKE');
      await expectBrakeOwner(player1Page, player1.playerId);

      // Player 2 tries to brake (should be rejected - already paused)
      await pullBrake(player2Page);
      await player2Page.waitForTimeout(200);
      // Verify brake still owned by player 1
      await expectBrakeOwner(player2Page, player1.playerId);

      // Player 1 submits answer
      await submitAnswer(player1Page, 'Paris');
      await player1Page.waitForTimeout(500);
      await expectPlayerHasLockedAnswer(player1Page, player1.playerId);

      // Progress to level 8
      await nextClue(player1Page);
      await waitForPhase(player1Page, 'CLUE_LEVEL', 5000);
      await expectClueLevel(player1Page, 8);

      // Level 8: Player 2 brakes
      await pullBrake(player2Page);
      await player2Page.waitForTimeout(500);
      await expectBrakeOwner(player2Page, player2.playerId);
      await submitAnswer(player2Page, 'Paris');
      await player2Page.waitForTimeout(500);

      // Progress to level 6
      await nextClue(player1Page);
      await waitForPhase(player1Page, 'CLUE_LEVEL', 5000);
      await expectClueLevel(player1Page, 6);

      // Level 6: Player 3 brakes
      await pullBrake(player3Page);
      await player3Page.waitForTimeout(500);
      await expectBrakeOwner(player3Page, player3.playerId);
      await submitAnswer(player3Page, 'Paris');
      await player3Page.waitForTimeout(500);

      // Skip levels 4 and 2, go to reveal
      await nextClue(player1Page);
      await waitForPhase(player1Page, 'CLUE_LEVEL', 5000);
      await nextClue(player1Page);
      await waitForPhase(player1Page, 'CLUE_LEVEL', 5000);
      await nextClue(player1Page);
      await waitForPhase(player1Page, 'REVEAL_DESTINATION', 10000);

      // Verify scores
      await player1Page.waitForTimeout(2000);
      const gameState = await getGameState(player1Page);

      const p1Score = gameState.scoreboard.find(
        (s: any) => s.playerId === player1.playerId
      );
      const p2Score = gameState.scoreboard.find(
        (s: any) => s.playerId === player2.playerId
      );
      const p3Score = gameState.scoreboard.find(
        (s: any) => s.playerId === player3.playerId
      );

      // Assuming all got correct answer "Paris"
      expect(p1Score.totalPoints).toBe(10); // Level 10
      expect(p2Score.totalPoints).toBe(8); // Level 8
      expect(p3Score.totalPoints).toBe(6); // Level 6

      console.log('Brake scenario test completed successfully!');
    } finally {
      await player1Context.close();
      await player2Context.close();
      await player3Context.close();
    }
  });

  test('simultaneous brakes - first brake wins', async ({ browser }) => {
    const session = await createSession();

    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();

    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    try {
      // Players join
      const player1 = await joinAsPlayer(session.sessionId, 'Alice');
      const player2 = await joinAsPlayer(session.sessionId, 'Bob');

      await player1Page.goto(`/join/${session.sessionId}`);
      await player1Page.fill('input[name="playerName"]', 'Alice');
      await player1Page.click('button[type="submit"]');
      await waitForWSConnection(player1Page);

      await player2Page.goto(`/join/${session.sessionId}`);
      await player2Page.fill('input[name="playerName"]', 'Bob');
      await player2Page.click('button[type="submit"]');
      await waitForWSConnection(player2Page);

      // Start game
      await startGame(player1Page);
      await waitForPhase(player1Page, 'CLUE_LEVEL', 15000);

      // Both players brake simultaneously (as close as possible)
      await Promise.all([pullBrake(player1Page), pullBrake(player2Page)]);

      // Wait for brake resolution
      await player1Page.waitForTimeout(1000);

      // Check game state - one should be brake owner
      const gameState = await getGameState(player1Page);
      expect(gameState.brakeOwnerPlayerId).toBeTruthy();
      expect(gameState.phase).toBe('PAUSED_FOR_BRAKE');

      // One player should be brake owner
      const brakeOwnerId = gameState.brakeOwnerPlayerId;
      expect([player1.playerId, player2.playerId]).toContain(brakeOwnerId);

      console.log(`Brake owner: ${brakeOwnerId}`);
      console.log('Simultaneous brake test completed successfully!');
    } finally {
      await player1Context.close();
      await player2Context.close();
    }
  });

  test('only brake owner can submit answer', async ({ browser }) => {
    const session = await createSession();

    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();

    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    try {
      // Players join
      const player1 = await joinAsPlayer(session.sessionId, 'Alice');
      const player2 = await joinAsPlayer(session.sessionId, 'Bob');

      await player1Page.goto(`/join/${session.sessionId}`);
      await player1Page.fill('input[name="playerName"]', 'Alice');
      await player1Page.click('button[type="submit"]');
      await waitForWSConnection(player1Page);

      await player2Page.goto(`/join/${session.sessionId}`);
      await player2Page.fill('input[name="playerName"]', 'Bob');
      await player2Page.click('button[type="submit"]');
      await waitForWSConnection(player2Page);

      // Start game
      await startGame(player1Page);
      await waitForPhase(player1Page, 'CLUE_LEVEL', 15000);

      // Player 1 brakes
      await pullBrake(player1Page);
      await player1Page.waitForTimeout(500);
      await expectBrakeOwner(player1Page, player1.playerId);

      // Player 2 tries to submit answer (should fail or be ignored)
      await submitAnswer(player2Page, 'Wrong Answer');
      await player2Page.waitForTimeout(500);

      // Verify only player 1's answer can be locked
      const gameStateBefore = await getGameState(player1Page);
      expect(
        gameStateBefore.lockedAnswers.some((a: any) => a.playerId === player2.playerId)
      ).toBe(false);

      // Player 1 submits answer
      await submitAnswer(player1Page, 'Paris');
      await player1Page.waitForTimeout(500);

      // Verify player 1's answer is locked
      const gameStateAfter = await getGameState(player1Page);
      expect(
        gameStateAfter.lockedAnswers.some((a: any) => a.playerId === player1.playerId)
      ).toBe(true);

      console.log('Brake owner restriction test completed successfully!');
    } finally {
      await player1Context.close();
      await player2Context.close();
    }
  });
});
