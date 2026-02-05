/**
 * API Helper Functions for E2E Tests
 * Provides utilities for interacting with the backend REST API
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export interface SessionResponse {
  sessionId: string;
  joinCode: string;
  tvJoinToken: string;
  hostAuthToken: string;
  wsUrl: string;
}

export interface JoinResponse {
  playerId: string;
  playerAuthToken: string;
  wsUrl: string;
}

export interface TVJoinResponse {
  tvAuthToken: string;
  wsUrl: string;
}

/**
 * Create a new game session
 */
export async function createSession(): Promise<SessionResponse> {
  const response = await fetch(`${BACKEND_URL}/v1/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Join a session as a player
 */
export async function joinAsPlayer(
  sessionId: string,
  playerName: string
): Promise<JoinResponse> {
  const response = await fetch(`${BACKEND_URL}/v1/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playerName }),
  });

  if (!response.ok) {
    throw new Error(`Failed to join session: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Join a session as TV
 */
export async function joinAsTV(sessionId: string): Promise<TVJoinResponse> {
  const response = await fetch(`${BACKEND_URL}/v1/sessions/${sessionId}/tv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to join as TV: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Health check for backend
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}
