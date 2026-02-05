/**
 * Test session helper
 * Creates sessions and players for integration tests
 */

import { TestClient } from './test-client';

export interface SessionInfo {
  sessionId: string;
  joinCode: string;
  hostAuthToken: string;
  tvAuthToken: string;
  wsUrl: string;
}

export interface PlayerInfo {
  playerId: string;
  name: string;
  playerAuthToken: string;
}

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const WS_URL = process.env.TEST_WS_URL || 'ws://localhost:3000/ws';

/**
 * Create a new session
 */
export async function createSession(): Promise<SessionInfo> {
  const response = await fetch(`${BASE_URL}/v1/sessions`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    sessionId: data.sessionId,
    joinCode: data.joinCode,
    hostAuthToken: data.hostAuthToken,
    tvAuthToken: data.tvAuthToken,
    wsUrl: data.wsUrl || WS_URL,
  };
}

/**
 * Join a session as a player
 */
export async function joinSession(sessionId: string, name: string): Promise<PlayerInfo> {
  const response = await fetch(`${BASE_URL}/v1/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`Failed to join session: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    playerId: data.playerId,
    name,
    playerAuthToken: data.playerAuthToken,
  };
}

/**
 * Create a test client and connect
 */
export async function createClient(
  token: string,
  options?: { logPrefix?: string; debug?: boolean }
): Promise<TestClient> {
  const client = new TestClient({
    token,
    wsUrl: WS_URL,
    ...options,
  });

  await client.connect();
  return client;
}

/**
 * Create a full test session with host, TV, and players
 */
export async function createTestSession(
  playerCount: number = 3,
  options?: { debug?: boolean }
): Promise<{
  session: SessionInfo;
  host: TestClient;
  tv: TestClient;
  players: TestClient[];
}> {
  // Create session
  const session = await createSession();

  // Connect host
  const host = await createClient(session.hostAuthToken, {
    logPrefix: '[HOST]',
    debug: options?.debug,
  });

  // Connect TV
  const tv = await createClient(session.tvAuthToken, {
    logPrefix: '[TV]',
    debug: options?.debug,
  });

  // Wait for initial state snapshots
  await sleep(500);

  // Create and connect players
  const players: TestClient[] = [];
  for (let i = 1; i <= playerCount; i++) {
    const playerInfo = await joinSession(session.sessionId, `Player ${i}`);
    const player = await createClient(playerInfo.playerAuthToken, {
      logPrefix: `[P${i}]`,
      debug: options?.debug,
    });
    players.push(player);
  }

  // Wait for lobby updates to propagate
  await sleep(500);

  return { session, host, tv, players };
}

/**
 * Sleep helper
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cleanup all clients
 */
export function cleanupClients(...clients: TestClient[]): void {
  clients.forEach(client => client.close());
}
