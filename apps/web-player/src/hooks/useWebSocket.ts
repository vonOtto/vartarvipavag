import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameEvent, GameState } from '../types/game';

interface UseWebSocketResult {
  isConnected: boolean;
  lastEvent: GameEvent | null;
  gameState: GameState | null;
  error: string | null;
  sendMessage: (type: string, payload: any) => void;
  reconnect: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 10000;

export function useWebSocket(
  url: string | null,
  token: string | null,
  playerId?: string | null,
  sessionId?: string | null
): UseWebSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<GameEvent | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);

  // Refs so onmessage/onclose closures can read current values without being deps
  const playerIdRef = useRef(playerId);
  const sessionIdRef = useRef(sessionId);
  playerIdRef.current = playerId;
  sessionIdRef.current = sessionId;

  const connect = useCallback(() => {
    if (!url || !token) {
      console.log('WebSocket: Missing url or token');
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = `${url}?token=${encodeURIComponent(token)}`;
    console.log('WebSocket: Connecting to', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket: Connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as GameEvent;
          console.log('WebSocket: Received event', message.type, message);
          setLastEvent(message);

          // Update game state from STATE_SNAPSHOT events
          if (message.type === 'STATE_SNAPSHOT') {
            const payload = message.payload as { state: GameState };
            setGameState(payload.state);
          }

          // Send RESUME_SESSION after WELCOME so server can restore state
          if (message.type === 'WELCOME' && playerIdRef.current && sessionIdRef.current) {
            const resumeMsg = {
              type: 'RESUME_SESSION',
              sessionId: sessionIdRef.current,
              serverTimeMs: Date.now(),
              payload: {
                playerId: playerIdRef.current,
                lastReceivedEventId: null,
              },
            };
            console.log('WebSocket: Sending RESUME_SESSION', resumeMsg);
            ws.send(JSON.stringify(resumeMsg));
          }
        } catch (err) {
          console.error('WebSocket: Failed to parse message', err, event.data);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket: Error', event);
        setError('Connection error occurred');
      };

      ws.onclose = (event) => {
        console.log('WebSocket: Closed', event.code, event.reason);
        setIsConnected(false);

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
    }
  }, [url, token]);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type,
        sessionId: gameState?.sessionId || sessionIdRef.current || '',
        serverTimeMs: Date.now(), // Will be overridden by server
        payload,
      };
      console.log('WebSocket: Sending message', message);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket: Cannot send message, not connected');
    }
  }, [gameState?.sessionId]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Initial connection
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastEvent,
    gameState,
    error,
    sendMessage,
    reconnect,
  };
}
