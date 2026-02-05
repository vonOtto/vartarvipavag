/**
 * Host Controls E2E Test
 *
 * Tests host control functionality:
 * - Host can start game
 * - Host can advance through clue levels
 * - Host can override brake pause (HOST_NEXT_CLUE during PAUSED_FOR_BRAKE)
 * - Host sees correct answers and player submissions
 * - Host controls affect all clients in real-time
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
  expectClueLevel,
  expectPlayerCount,
} from '../helpers/assertions';

test.describe('Host Controls', () => {
  test('host can start game and all players see state change', async ({
    browser,
  }) => {
    const session = await createSession();

    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();

    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    try {
      // Players join
      await joinAsPlayer(session.sessionId, 'Alice');
      await player1Page.goto(`/join/${session.sessionId}`);
      await player1Page.fill('input[name="playerName"]', 'Alice');
      await player1Page.click('button[type="submit"]');
      await waitForWSConnection(player1Page);

      await joinAsPlayer(session.sessionId, 'Bob');
      await player2Page.goto(`/join/${session.sessionId}`);
      await player2Page.fill('input[name="playerName"]', 'Bob');
      await player2Page.click('button[type="submit"]');
      await waitForWSConnection(player2Page);

      // Both in lobby
      await waitForPhase(player1Page, 'LOBBY');
      await waitForPhase(player2Page, 'LOBBY');

      // Host starts game
      await startGame(player1Page);

      // Both players see game start
      await waitForPhase(player1Page, 'CLUE_LEVEL', 15000);
      await waitForPhase(player2Page, 'CLUE_LEVEL', 15000);

      // Both should be at level 10
      await expectClueLevel(player1Page, 10);
      await expectClueLevel(player2Page, 10);

      console.log('Host start game test completed successfully!');
    } finally {
      await player1Context.close();
      await player2Context.close();
    }
  });

  test('host can advance through clue levels', async ({ browser }) => {
    const session = await createSession();

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    try {
      // Player joins
      await joinAsPlayer(session.sessionId, 'Alice');
      await playerPage.goto(`/join/${session.sessionId}`);
      await playerPage.fill('input[name="playerName"]', 'Alice');
      await playerPage.click('button[type="submit"]');
      await waitForWSConnection(playerPage);

      // Start game
      await startGame(playerPage);
      await waitForPhase(playerPage, 'CLUE_LEVEL', 15000);
      await expectClueLevel(playerPage, 10);

      // Advance through all clue levels
      const levels = [8, 6, 4, 2];
      for (const level of levels) {
        await nextClue(playerPage);
        await waitForPhase(playerPage, 'CLUE_LEVEL', 5000);
        await expectClueLevel(playerPage, level);
      }

      // After level 2, advance to reveal
      await nextClue(playerPage);
      await waitForPhase(playerPage, 'REVEAL_DESTINATION', 10000);
      await expectPhase(playerPage, 'REVEAL_DESTINATION');

      console.log('Host advance through clues test completed successfully!');
    } finally {
      await playerContext.close();
    }
  });

  test('host can override brake pause with HOST_NEXT_CLUE', async ({ browser }) => {
    const session = await createSession();

    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();

    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    try {
      // Players join
      const player1 = await joinAsPlayer(session.sessionId, 'Alice');
      await player1Page.goto(`/join/${session.sessionId}`);
      await player1Page.fill('input[name="playerName"]', 'Alice');
      await player1Page.click('button[type="submit"]');
      await waitForWSConnection(player1Page);

      const player2 = await joinAsPlayer(session.sessionId, 'Bob');
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
      await expectPhase(player1Page, 'PAUSED_FOR_BRAKE');
      await expectPhase(player2Page, 'PAUSED_FOR_BRAKE');

      // Host overrides brake without answer submission
      await nextClue(player1Page);

      // Should advance to next level
      await waitForPhase(player1Page, 'CLUE_LEVEL', 5000);
      await waitForPhase(player2Page, 'CLUE_LEVEL', 5000);

      // Should be at level 8
      await expectClueLevel(player1Page, 8);
      await expectClueLevel(player2Page, 8);

      // Verify brake is released (brakeOwnerPlayerId should be null)
      const gameState = await getGameState(player1Page);
      expect(gameState.brakeOwnerPlayerId).toBeNull();

      console.log('Host override brake test completed successfully!');
    } finally {
      await player1Context.close();
      await player2Context.close();
    }
  });

  test('host can see locked answers before reveal', async ({ browser }) => {
    const session = await createSession();

    // For this test, we'd need a host client implementation
    // This is a placeholder test showing what should be tested
    // In real implementation, host should have special projection

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    try {
      // Player joins
      const player = await joinAsPlayer(session.sessionId, 'Alice');
      await playerPage.goto(`/join/${session.sessionId}`);
      await playerPage.fill('input[name="playerName"]', 'Alice');
      await playerPage.click('button[type="submit"]');
      await waitForWSConnection(playerPage);

      // Start game
      await startGame(playerPage);
      await waitForPhase(playerPage, 'CLUE_LEVEL', 15000);

      // Player brakes and submits answer
      await pullBrake(playerPage);
      await playerPage.waitForTimeout(500);
      await submitAnswer(playerPage, 'Paris');
      await playerPage.waitForTimeout(500);

      // In a real host client, the host would see:
      // - Player name
      // - Answer text ("Paris")
      // - Locked at level (10)
      // - Timestamp

      // This would require a separate host page/context testing
      // For now, verify the answer exists in game state
      const gameState = await getGameState(playerPage);
      const lockedAnswer = gameState.lockedAnswers.find(
        (a: any) => a.playerId === player.playerId
      );

      expect(lockedAnswer).toBeDefined();
      expect(lockedAnswer.lockedAtLevelPoints).toBe(10);

      console.log('Host visibility test completed (placeholder)!');
    } finally {
      await playerContext.close();
    }
  });

  test('host controls sync across multiple players in real-time', async ({
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
      await joinAsPlayer(session.sessionId, 'Alice');
      await player1Page.goto(`/join/${session.sessionId}`);
      await player1Page.fill('input[name="playerName"]', 'Alice');
      await player1Page.click('button[type="submit"]');
      await waitForWSConnection(player1Page);

      await joinAsPlayer(session.sessionId, 'Bob');
      await player2Page.goto(`/join/${session.sessionId}`);
      await player2Page.fill('input[name="playerName"]', 'Bob');
      await player2Page.click('button[type="submit"]');
      await waitForWSConnection(player2Page);

      await joinAsPlayer(session.sessionId, 'Charlie');
      await player3Page.goto(`/join/${session.sessionId}`);
      await player3Page.fill('input[name="playerName"]', 'Charlie');
      await player3Page.click('button[type="submit"]');
      await waitForWSConnection(player3Page);

      // All in lobby
      await waitForPhase(player1Page, 'LOBBY');
      await waitForPhase(player2Page, 'LOBBY');
      await waitForPhase(player3Page, 'LOBBY');

      // Verify all see 3 players
      await expectPlayerCount(player1Page, 3);
      await expectPlayerCount(player2Page, 3);
      await expectPlayerCount(player3Page, 3);

      // Host starts game
      await startGame(player1Page);

      // All should see game start simultaneously
      await Promise.all([
        waitForPhase(player1Page, 'CLUE_LEVEL', 15000),
        waitForPhase(player2Page, 'CLUE_LEVEL', 15000),
        waitForPhase(player3Page, 'CLUE_LEVEL', 15000),
      ]);

      // All should be at level 10
      await expectClueLevel(player1Page, 10);
      await expectClueLevel(player2Page, 10);
      await expectClueLevel(player3Page, 10);

      // Host advances to level 8
      await nextClue(player1Page);

      // All should advance simultaneously
      await Promise.all([
        waitForPhase(player1Page, 'CLUE_LEVEL', 5000),
        waitForPhase(player2Page, 'CLUE_LEVEL', 5000),
        waitForPhase(player3Page, 'CLUE_LEVEL', 5000),
      ]);

      await expectClueLevel(player1Page, 8);
      await expectClueLevel(player2Page, 8);
      await expectClueLevel(player3Page, 8);

      console.log('Host sync across players test completed successfully!');
    } finally {
      await player1Context.close();
      await player2Context.close();
      await player3Context.close();
    }
  });
});
