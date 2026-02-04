// localStorage helpers for persisting player session data

const STORAGE_KEY = 'pa-sparet-player-session';

export interface StoredSession {
  playerId: string;
  playerAuthToken: string;
  wsUrl: string;
  sessionId: string;
  joinCode: string;
  playerName: string;
}

export function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save session to localStorage:', error);
  }
}

export function loadSession(): StoredSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as StoredSession;
  } catch (error) {
    console.error('Failed to load session from localStorage:', error);
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear session from localStorage:', error);
  }
}

export function hasSession(): boolean {
  return loadSession() !== null;
}
