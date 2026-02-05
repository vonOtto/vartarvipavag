/**
 * Custom Assertion Helpers for E2E Tests
 * Provides game-specific assertion utilities
 */

import { expect } from '@playwright/test';
import { Page } from '@playwright/test';
import { GamePhase, getGameState } from './websocket';

/**
 * Assert that game is in a specific phase
 */
export async function expectPhase(page: Page, expectedPhase: GamePhase) {
  const gameState = await getGameState(page);
  expect(gameState.phase).toBe(expectedPhase);
}

/**
 * Assert that player count matches expected
 */
export async function expectPlayerCount(page: Page, count: number) {
  const gameState = await getGameState(page);
  expect(gameState.players).toHaveLength(count);
}

/**
 * Assert that a player has locked an answer
 */
export async function expectPlayerHasLockedAnswer(
  page: Page,
  playerId: string
) {
  const gameState = await getGameState(page);
  const player = gameState.players.find((p: any) => p.id === playerId);
  expect(player).toBeDefined();
  expect(gameState.lockedAnswers.some((a: any) => a.playerId === playerId)).toBe(true);
}

/**
 * Assert that brake owner is set
 */
export async function expectBrakeOwner(page: Page, playerId: string) {
  const gameState = await getGameState(page);
  expect(gameState.brakeOwnerPlayerId).toBe(playerId);
}

/**
 * Assert scoreboard has correct points for player
 */
export async function expectPlayerScore(
  page: Page,
  playerId: string,
  expectedPoints: number
) {
  const gameState = await getGameState(page);
  const scoreEntry = gameState.scoreboard.find((s: any) => s.playerId === playerId);
  expect(scoreEntry).toBeDefined();
  expect(scoreEntry.totalPoints).toBe(expectedPoints);
}

/**
 * Assert current clue level
 */
export async function expectClueLevel(page: Page, levelPoints: number) {
  const gameState = await getGameState(page);
  expect(gameState.currentRound?.currentClueLevel?.levelPoints).toBe(levelPoints);
}

/**
 * Assert element is visible on page
 */
export async function expectVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible({ timeout: 5000 });
}

/**
 * Assert element contains text
 */
export async function expectText(page: Page, selector: string, text: string) {
  await expect(page.locator(selector)).toContainText(text, { timeout: 5000 });
}

/**
 * Assert element is not visible
 */
export async function expectNotVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).not.toBeVisible();
}

/**
 * Assert button is enabled
 */
export async function expectEnabled(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeEnabled();
}

/**
 * Assert button is disabled
 */
export async function expectDisabled(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeDisabled();
}
