// REST API service for backend communication

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface SessionInfo {
  sessionId: string;
  joinCode: string;
  phase: string;
  playerCount: number;
}

export interface JoinResponse {
  playerId: string;
  playerAuthToken: string;
  wsUrl: string;
}

export async function lookupSession(joinCode: string): Promise<SessionInfo> {
  const response = await fetch(`${API_BASE_URL}/v1/sessions/by-code/${joinCode}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Session not found. Please check the join code.');
    }
    throw new Error(`Failed to lookup session: ${response.statusText}`);
  }

  return response.json();
}

export async function joinSession(sessionId: string, name: string): Promise<JoinResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || 'Failed to join session');
  }

  return response.json();
}
