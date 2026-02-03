/**
 * WebSocket authentication utilities
 */

import { IncomingMessage } from 'http';
import { verifyToken, JWTPayload } from './auth';
import { logger } from './logger';

export interface WSAuthResult {
  success: boolean;
  payload?: JWTPayload;
  error?: {
    code: number;
    reason: string;
  };
}

/**
 * Extracts JWT token from WebSocket connection request
 * Supports both Authorization header and query parameter
 */
export function extractToken(req: IncomingMessage): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fall back to query parameter
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const tokenParam = url.searchParams.get('token');
  if (tokenParam) {
    return tokenParam;
  }

  return null;
}

/**
 * Authenticates WebSocket connection and extracts JWT payload
 */
export function authenticateWSConnection(req: IncomingMessage): WSAuthResult {
  const token = extractToken(req);

  if (!token) {
    logger.warn('WebSocket auth failed: No token provided', {
      ip: req.socket.remoteAddress,
    });
    return {
      success: false,
      error: {
        code: 4001,
        reason: 'Invalid token',
      },
    };
  }

  try {
    const payload = verifyToken(token);

    // Validate role format (must be lowercase)
    if (!['host', 'player', 'tv'].includes(payload.role)) {
      logger.warn('WebSocket auth failed: Invalid role', {
        role: payload.role,
        ip: req.socket.remoteAddress,
      });
      return {
        success: false,
        error: {
          code: 4001,
          reason: 'Invalid token',
        },
      };
    }

    logger.info('WebSocket auth successful', {
      sessionId: payload.sessionId,
      role: payload.role,
      playerId: payload.playerId,
      ip: req.socket.remoteAddress,
    });

    return {
      success: true,
      payload,
    };
  } catch (error: any) {
    const isExpired = error.message?.includes('expired');

    logger.warn('WebSocket auth failed: Token verification error', {
      error: error.message,
      isExpired,
      ip: req.socket.remoteAddress,
    });

    return {
      success: false,
      error: {
        code: isExpired ? 4002 : 4001,
        reason: isExpired ? 'Token expired' : 'Invalid token',
      },
    };
  }
}
