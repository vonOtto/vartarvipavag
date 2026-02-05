/**
 * Reconnect E2E Test
 *
 * Tests reconnection mechanics:
 * - Player disconnects and reconnects, sees current state
 * - State snapshot includes all relevant game data
 * - Reconnect works during different game phases
 * - Multiple reconnects work correctly
 * - Reconnect after answer submission preserves locked answer
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
  expectPlayerHasLockedAnswer,
  expectClueLevel,
} from '../helpers/assertions';

test.describe('Reconnect Mechanics', () => {
  test('player reconnects during lobby and sees current state', async ({
    browser,
  }) => {
    const session = await createSession();

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    try {
      // Player joins
      const player = await joinAsPlayer(session.sessionId, 'Alice');

      await playerPage.goto(`/join/${session.sessionId}`);
      await playerPage.fill('input[name="playerName"]', 'Alice');
      await playerPage.click('button[type="submit"]');
      await waitForWSConnection(playerPage);
      await waitForPhase(playerPage, 'LOBBY');

      // Get initial state
      const initialState = await getGameState(playerPage);
      expect(initialState.phase).toBe('LOBBY');

      // Simulate disconnect and reconnect by reloading page
      await playerPage.reload();
      await waitForWSConnection(playerPage);
      await waitForPhase(playerPage, 'LOBBY');

      // Verify state is restored
      const reconnectedState = await getGameState(playerPage);
      expect(reconnectedState.phase).toBe('LOBBY');
      expect(reconnectedState.players.length).toBeGreaterThanOrEqual(1);

      console.log('Lobby reconnect test completed successfully!');
    } finally {
      await playerContext.close();
    }
  });

  test('player reconnects during clue level and sees current state', async ({
    browser,
  }) => {
    const session = await createSession();

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    try {
      // Player joins
      const player = await joinAsPlayer(session.sessionId, 'Alice');

      await playerPage.goto(`/join/${session.sessionId}`);
      await playerPage.fill('input[name="playerName"]', 'Alice');
      await playerPage.click('button[type="submit"]');
      await waitForWSConnection(playerPage);
      await waitForPhase(playerPage, 'LOBBY');

      // Start game
      await startGame(playerPage);
      await waitForPhase(playerPage, 'CLUE_LEVEL', 15000);
      await expectClueLevel(playerPage, 10);

      // Progress to level 8
      await nextClue(playerPage);
      await waitForPhase(playerPage, 'CLUE_LEVEL', 5000);
      await expectClueLevel(playerPage, 8);

      // Get state before disconnect
      const stateBeforeDisconnect = await getGameState(playerPage);

      // Simulate disconnect and reconnect
      await playerPage.reload();
      await waitForWSConnection(playerPage, 10000);

      // Wait for state to be restored
      await playerPage.waitForTimeout(1000);

      // Verify state is restored
      const stateAfterReconnect = await getGameState(playerPage);
      expect(stateAfterReconnect.phase).toBe('CLUE_LEVEL');
      expect(stateAfterReconnect.currentRound?.currentClueLevel?.levelPoints).toBe(8);

      console.log('Clue level reconnect test completed successfully!');
    } finally {
      await playerContext.close();
    }
  });

  test('player reconnects after locking answer and answer persists', async ({
    browser,
  }) => {
    const session = await createSession();

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

      // Verify answer is locked
      await expectPlayerHasLockedAnswer(playerPage, player.playerId);

      // Progress to next level
      await nextClue(playerPage);
      await waitForPhase(playerPage, 'CLUE_LEVEL', 5000);

      // Simulate disconnect and reconnect
      await playerPage.reload();
      await waitForWSConnection(playerPage, 10000);
      await playerPage.waitForTimeout(1000);

      // Verify answer is still locked after reconnect
      await expectPlayerHasLockedAnswer(playerPage, player.playerId);

      const gameState = await getGameState(playerPage);
      const lockedAnswer = gameState.lockedAnswers.find(
        (a: any) => a.playerId === player.playerId
      );
      expect(lockedAnswer).toBeDefined();
      expect(lockedAnswer.lockedAtLevelPoints).toBe(10);

      console.log('Answer persistence after reconnect test completed successfully!');
    } finally {
      await playerContext.close();
    }
  });

  test('multiple reconnects work correctly', async ({ browser }) => {
    const session = await createSession();

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

      // First reconnect
      await playerPage.reload();
      await waitForWSConnection(playerPage, 10000);
      await playerPage.waitForTimeout(500);
      await expectPhase(playerPage, 'CLUE_LEVEL');

      // Progress to next level
      await nextClue(playerPage);
      await waitForPhase(playerPage, 'CLUE_LEVEL', 5000);

      // Second reconnect
      await playerPage.reload();
      await waitForWSConnection(playerPage, 10000);
      await playerPage.waitForTimeout(500);
      await expectPhase(playerPage, 'CLUE_LEVEL');

      // Progress to next level
      await nextClue(playerPage);
      await waitForPhase(playerPage, 'CLUE_LEVEL', 5000);

      // Third reconnect
      await playerPage.reload();
      await waitForWSConnection(playerPage, 10000);
      await playerPage.waitForTimeout(500);
      await expectPhase(playerPage, 'CLUE_LEVEL');

      console.log('Multiple reconnects test completed successfully!');
    } finally {
      await playerContext.close();
    }
  });

  test('reconnect during paused brake state preserves brake owner', async ({
    browser,
  }) => {
    const session = await createSession();

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

      // Player brakes
      await pullBrake(playerPage);
      await playerPage.waitForTimeout(500);
      await expectPhase(playerPage, 'PAUSED_FOR_BRAKE');

      // Get brake owner before disconnect
      const stateBefore = await getGameState(playerPage);
      expect(stateBefore.brakeOwnerPlayerId).toBe(player.playerId);

      // Simulate disconnect and reconnect
      await playerPage.reload();
      await waitForWSConnection(playerPage, 10000);
      await playerPage.waitForTimeout(1000);

      // Verify brake owner is still set
      const stateAfter = await getGameState(playerPage);
      expect(stateAfter.phase).toBe('PAUSED_FOR_BRAKE');
      expect(stateAfter.brakeOwnerPlayerId).toBe(player.playerId);

      console.log('Brake owner persistence after reconnect test completed successfully!');
    } finally {
      await playerContext.close();
    }
  });
});
