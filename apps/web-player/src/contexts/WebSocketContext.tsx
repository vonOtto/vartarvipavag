import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import type { GameEvent, GameState, LobbyUpdatedPayload } from '../types/game';
import { loadSession } from '../services/storage';

interface WebSocketContextValue {
  isConnected: boolean;
  lastEvent: GameEvent | null;
  gameState: GameState | null;
  error: string | null;
  serverTimeOffsetMs: number;
  getServerNowMs: () => number;
  sendMessage: (type: string, payload: any) => void;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 10000;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<GameEvent | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);
  const serverTimeOffsetRef = useRef(0);
  const hasServerTimeOffsetRef = useRef(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const isConnectingRef = useRef(false);
  const generationRef = useRef(0);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const updateServerTimeOffset = useCallback((serverTimeMs: number) => {
    const localNow = Date.now();
    const sampleOffset = serverTimeMs - localNow;
    if (!hasServerTimeOffsetRef.current) {
      hasServerTimeOffsetRef.current = true;
      serverTimeOffsetRef.current = sampleOffset;
      setServerTimeOffsetMs(sampleOffset);
      return;
    }
    const blended = serverTimeOffsetRef.current * 0.85 + sampleOffset * 0.15;
    serverTimeOffsetRef.current = blended;
    setServerTimeOffsetMs(blended);
  }, []);

  const getServerNowMs = useCallback(() => Date.now() + serverTimeOffsetRef.current, []);

  const connect = useCallback(() => {
    const session = loadSession();

    if (!session?.wsUrl || !session?.playerAuthToken) {
      console.log('WebSocket: No session found, skipping connection');
      return;
    }

    // Guard against concurrent connect() calls
    if (isConnectingRef.current) {
      console.log('WebSocket: Connection already in progress, skipping');
      return;
    }

    isConnectingRef.current = true;
    generationRef.current += 1;
    const myGeneration = generationRef.current;

    // Cancel any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = `${session.wsUrl}?token=${encodeURIComponent(session.playerAuthToken)}`;
    console.log('WebSocket: Connecting to', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      (window as any).__ws = ws;
      if (!(window as any).__wsMessages) {
        (window as any).__wsMessages = [];
      }

      ws.onopen = () => {
        if (myGeneration !== generationRef.current) {
          isConnectingRef.current = false;
          return;
        }

        console.log('WebSocket: Connected');
        (window as any).__wsStatus = { state: 'open' };
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
        isConnectingRef.current = false;
      };

      ws.onmessage = (event) => {
        if (myGeneration !== generationRef.current) return;

        try {
          const message = JSON.parse(event.data) as GameEvent;
          if (typeof message.serverTimeMs === 'number') {
            updateServerTimeOffset(message.serverTimeMs);
          }
          (window as any).__wsMessages?.push(message);
          console.log('WebSocket: Received event', message.type, message);

          if (message.type === 'STATE_SNAPSHOT') {
            try {
              const payload = message.payload as { state: GameState };
              setGameState(payload.state);
              (window as any).__gameState = payload.state;
            } catch (stateErr) {
              console.error('WebSocket: Failed to update game state', stateErr, message);
            }
          }
          if (message.type === 'LOBBY_UPDATED') {
            const payload = message.payload as LobbyUpdatedPayload;
            const currentState = gameStateRef.current;
            if (currentState) {
              const hostEntry = currentState.players.find((p) => p.role === 'host');
              const updatedPlayers = payload.players.map((p) => {
                const existing = currentState.players.find((pl) => pl.playerId === p.playerId);
                return {
                  playerId: p.playerId,
                  name: p.name,
                  role: 'player',
                  isConnected: p.isConnected,
                  joinedAtMs: existing?.joinedAtMs ?? Date.now(),
                  score: existing?.score ?? 0,
                };
              });
              const nextState = {
                ...currentState,
                joinCode: payload.joinCode || currentState.joinCode,
                players: hostEntry ? [hostEntry, ...updatedPlayers] : updatedPlayers,
              };
              setGameState(nextState);
              (window as any).__gameState = nextState;
            }
          }
          if (message.type === 'PLAYER_LEFT') {
            console.log('WebSocket: PLAYER_LEFT payload', message.payload);
          }

          setLastEvent(message);
        } catch (err) {
          console.error('WebSocket: Failed to parse message', err, event.data);
          setError('Failed to process server message');
          setTimeout(() => setError(null), 3000);
        }
      };

      ws.onerror = (event) => {
        if (myGeneration !== generationRef.current) {
          isConnectingRef.current = false;
          return;
        }

        console.error('WebSocket: Error', event);
        (window as any).__wsStatus = { state: 'error' };
        setError('Connection error occurred');
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        if (myGeneration !== generationRef.current) {
          console.log('WebSocket: Ignoring close from stale generation', myGeneration);
          isConnectingRef.current = false;
          return;
        }

        console.log('WebSocket: Closed', event.code, event.reason);
        (window as any).__wsStatus = { state: 'closed', code: event.code, reason: event.reason };
        setIsConnected(false);
        isConnectingRef.current = false;
        if ((window as any).__ws === ws) {
          (window as any).__ws = null;
        }

        // 4xxx = auth / session error — do not retry
        if (event.code >= 4000 && event.code < 5000) {
          const messages: Record<number, string> = {
            4001: 'Invalid token. Please rejoin the game.',
            4002: 'Session token expired. Please rejoin the game.',
            4003: 'Session not found. Please rejoin the game.',
          };
          setError(messages[event.code] || event.reason || 'Authentication error.');
          return;
        }

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            reconnectDelayRef.current * Math.pow(2, reconnectAttemptsRef.current),
            MAX_RECONNECT_DELAY
          );
          console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          setError('Connection lost. Please refresh the page.');
        }
      };
    } catch (err) {
      console.error('WebSocket: Failed to create connection', err);
      setError('Failed to connect to server');
      isConnectingRef.current = false;
    }
  }, []);

  const sendMessage = useCallback((type: string, payload: any) => {
    const session = loadSession();

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type,
        sessionId: gameState?.sessionId || session?.sessionId || '',
        serverTimeMs: getServerNowMs(),
        payload,
      };
      console.log('WebSocket: Sending message', message);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket: Cannot send message, not connected');
    }
  }, [gameState?.sessionId, getServerNowMs]);

  const reconnectFn = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Connect when session exists
  useEffect(() => {
    const session = loadSession();
    if (session) {
      connect();
    }

    return () => {
      generationRef.current += 1;
      isConnectingRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Handle phone lock/unlock and app backgrounding
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('WebSocket: Visibility changed, hidden =', document.hidden);

      // When page becomes visible again (phone unlocked, app foregrounded)
      if (!document.hidden) {
        // If we're not connected, attempt to reconnect immediately
        if (!isConnected && loadSession()) {
          console.log('WebSocket: Page visible and disconnected, reconnecting...');
          reconnectAttemptsRef.current = 0; // Reset reconnect attempts
          reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
          connect();
        }
      }
    };

    const handleOnline = () => {
      console.log('WebSocket: Network online, checking connection...');

      // Network came back online, reconnect if needed
      if (!isConnected && loadSession()) {
        console.log('WebSocket: Network restored and disconnected, reconnecting...');
        reconnectAttemptsRef.current = 0;
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
        connect();
      }
    };

    const handleFocus = () => {
      console.log('WebSocket: Window focused, checking connection...');

      // Window regained focus (user returned to tab/app)
      if (!isConnected && loadSession()) {
        console.log('WebSocket: Window focused and disconnected, reconnecting...');
        reconnectAttemptsRef.current = 0;
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
        connect();
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);

    return () => {
      // Cleanup
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isConnected, connect]);

  const value: WebSocketContextValue = {
    isConnected,
    lastEvent,
    gameState,
    error,
    serverTimeOffsetMs,
    getServerNowMs,
    sendMessage,
    reconnect: reconnectFn,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}
