/**
 * WebSocket Helper Functions for E2E Tests
 * Provides utilities for WebSocket communication with the backend
 */

import { Page } from '@playwright/test';

export type GamePhase =
  | 'LOBBY'
  | 'PREPARING_ROUND'
  | 'CLUE_LEVEL'
  | 'PAUSED_FOR_BRAKE'
  | 'REVEAL_DESTINATION'
  | 'SCOREBOARD'
  | 'FOLLOWUP_QUESTION'
  | 'FOLLOWUP_RESULTS'
  | 'ROUND_END'
  | 'FINAL_RESULTS';

export interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp?: number;
}

/**
 * Wait for a specific WebSocket event
 */
export async function waitForWSEvent(
  page: Page,
  eventType: string,
  timeout = 5000
): Promise<WebSocketMessage> {
  return page.evaluate(
    ({ eventType, timeout }) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timeout waiting for event: ${eventType}`));
        }, timeout);

        const messageHandler = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === eventType) {
              clearTimeout(timeoutId);
              window.removeEventListener('message', messageHandler);
              resolve(message);
            }
          } catch (error) {
            // Ignore parse errors
          }
        };

        window.addEventListener('message', messageHandler);
      });
    },
    { eventType, timeout }
  );
}

/**
 * Wait for a specific game phase
 */
export async function waitForPhase(
  page: Page,
  phase: GamePhase,
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(
    (targetPhase) => {
      const gameState = (window as any).__gameState;
      return gameState?.phase === targetPhase;
    },
    phase,
    { timeout }
  );
}

/**
 * Get current game state from page
 */
export async function getGameState(page: Page): Promise<any> {
  return page.evaluate(() => {
    return (window as any).__gameState;
  });
}

/**
 * Send WebSocket message
 */
export async function sendWSMessage(
  page: Page,
  message: WebSocketMessage
): Promise<void> {
  await page.evaluate((msg) => {
    const ws = (window as any).__ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      throw new Error('WebSocket not connected');
    }
  }, message);
}

/**
 * Wait for WebSocket connection to be established
 */
export async function waitForWSConnection(page: Page, timeout = 5000): Promise<void> {
  await page.waitForFunction(
    () => {
      const ws = (window as any).__ws;
      return ws && ws.readyState === WebSocket.OPEN;
    },
    { timeout }
  );
}

/**
 * Submit a brake pull
 */
export async function pullBrake(page: Page): Promise<void> {
  await sendWSMessage(page, {
    type: 'BRAKE_PULL',
    timestamp: Date.now(),
  });
}

/**
 * Submit an answer
 */
export async function submitAnswer(page: Page, answerText: string): Promise<void> {
  await sendWSMessage(page, {
    type: 'BRAKE_ANSWER_SUBMIT',
    payload: { answerText },
    timestamp: Date.now(),
  });
}

/**
 * Start game (host only)
 */
export async function startGame(page: Page): Promise<void> {
  await sendWSMessage(page, {
    type: 'HOST_START_GAME',
    timestamp: Date.now(),
  });
}

/**
 * Advance to next clue (host only)
 */
export async function nextClue(page: Page): Promise<void> {
  await sendWSMessage(page, {
    type: 'HOST_NEXT_CLUE',
    timestamp: Date.now(),
  });
}

/**
 * Get all WebSocket messages received
 */
export async function getWSMessages(page: Page): Promise<WebSocketMessage[]> {
  return page.evaluate(() => {
    return (window as any).__wsMessages || [];
  });
}

/**
 * Clear WebSocket message history
 */
export async function clearWSMessages(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as any).__wsMessages = [];
  });
}
