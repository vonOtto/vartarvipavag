/**
 * Test client helper for WebSocket integration tests
 * Wraps WebSocket connection with helpers for testing
 */

import WebSocket from 'ws';
import type { Event, Role } from '../../../src/types/events';

export interface TestClientOptions {
  token: string;
  wsUrl: string;
  name?: string;
  logPrefix?: string;
  debug?: boolean;
}

export class TestClient {
  private ws: WebSocket | null = null;
  private messages: Event[] = [];
  private token: string;
  private wsUrl: string;
  private logPrefix: string;
  private debug: boolean;
  private eventHandlers: Map<string, Array<(event: Event) => void>> = new Map();

  public playerId: string | null = null;
  public role: Role | null = null;
  public sessionId: string | null = null;
  public connectionId: string | null = null;

  constructor(options: TestClientOptions) {
    this.token = options.token;
    this.wsUrl = options.wsUrl;
    this.logPrefix = options.logPrefix || '[TEST CLIENT]';
    this.debug = options.debug || false;
  }

  /**
   * Connect to WebSocket and wait for WELCOME + STATE_SNAPSHOT
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${this.wsUrl}?token=${this.token}`);

      const welcomeTimeout = setTimeout(() => {
        reject(new Error('Connection timeout waiting for WELCOME'));
      }, 5000);

      this.ws.on('open', () => {
        if (this.debug) console.log(`${this.logPrefix} WebSocket connected`);
      });

      this.ws.on('message', (data: Buffer) => {
        const event = JSON.parse(data.toString()) as Event;
        this.messages.push(event);

        if (this.debug) {
          console.log(`${this.logPrefix} ← ${event.type}`);
        }

        // Handle WELCOME
        if (event.type === 'WELCOME') {
          this.playerId = event.payload.playerId;
          this.role = event.payload.role;
          this.sessionId = event.sessionId;
          this.connectionId = event.payload.connectionId;
          clearTimeout(welcomeTimeout);
          resolve();
        }

        // Call registered handlers
        const handlers = this.eventHandlers.get(event.type);
        if (handlers) {
          handlers.forEach(handler => handler(event));
        }
      });

      this.ws.on('error', (error) => {
        clearTimeout(welcomeTimeout);
        reject(error);
      });

      this.ws.on('close', () => {
        if (this.debug) console.log(`${this.logPrefix} WebSocket closed`);
      });
    });
  }

  /**
   * Send an event to the server
   */
  send(type: string, payload: any = {}): void {
    if (!this.ws) {
      throw new Error('WebSocket not connected');
    }

    const event = {
      type,
      sessionId: this.sessionId || '',
      serverTimeMs: Date.now(),
      payload,
    };

    if (this.debug) {
      console.log(`${this.logPrefix} → ${type}`);
    }

    this.ws.send(JSON.stringify(event));
  }

  /**
   * Register event handler
   */
  on(eventType: string, handler: (event: Event) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Wait for a specific event type
   */
  async waitForEvent(eventType: string, timeoutMs: number = 5000): Promise<Event> {
    // Check if we already received it
    const existing = this.messages.find(m => m.type === eventType);
    if (existing) return existing;

    // Wait for new message
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${eventType}`));
      }, timeoutMs);

      const handler = (event: Event) => {
        if (event.type === eventType) {
          clearTimeout(timeout);
          this.eventHandlers.get(eventType)!.splice(
            this.eventHandlers.get(eventType)!.indexOf(handler),
            1
          );
          resolve(event);
        }
      };

      this.on(eventType, handler);
    });
  }

  /**
   * Wait for multiple events in any order
   */
  async waitForEvents(eventTypes: string[], timeoutMs: number = 5000): Promise<Event[]> {
    const results: Event[] = [];
    const remaining = new Set(eventTypes);

    // Check existing messages first
    for (const type of eventTypes) {
      const existing = this.messages.find(m => m.type === type);
      if (existing) {
        results.push(existing);
        remaining.delete(type);
      }
    }

    if (remaining.size === 0) {
      return results;
    }

    // Wait for remaining
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for events: ${Array.from(remaining).join(', ')}`));
      }, timeoutMs);

      const handlers: Array<(event: Event) => void> = [];

      for (const type of remaining) {
        const handler = (event: Event) => {
          if (event.type === type) {
            results.push(event);
            remaining.delete(type);

            if (remaining.size === 0) {
              clearTimeout(timeout);
              // Clean up handlers
              handlers.forEach((h, i) => {
                const eventType = eventTypes[i];
                const typeHandlers = this.eventHandlers.get(eventType);
                if (typeHandlers) {
                  const idx = typeHandlers.indexOf(h);
                  if (idx !== -1) typeHandlers.splice(idx, 1);
                }
              });
              resolve(results);
            }
          }
        };

        handlers.push(handler);
        this.on(type, handler);
      }
    });
  }

  /**
   * Get all messages of a specific type
   */
  getMessages(eventType?: string): Event[] {
    if (eventType) {
      return this.messages.filter(m => m.type === eventType);
    }
    return [...this.messages];
  }

  /**
   * Get latest message of a specific type
   */
  getLatestMessage(eventType: string): Event | undefined {
    const filtered = this.messages.filter(m => m.type === eventType);
    return filtered[filtered.length - 1];
  }

  /**
   * Clear message history
   */
  clearMessages(): void {
    this.messages = [];
  }

  /**
   * Get current state from latest STATE_SNAPSHOT
   */
  getCurrentState(): any | null {
    const snapshot = this.getLatestMessage('STATE_SNAPSHOT');
    return snapshot?.payload?.state || null;
  }

  /**
   * Close connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
