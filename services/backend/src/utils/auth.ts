/**
 * JWT authentication utilities
 */

import jwt from 'jsonwebtoken';
import { logger } from './logger';

export type Role = 'host' | 'player' | 'tv';

export interface JWTPayload {
  sessionId: string;
  role: Role;
  playerId?: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const TOKEN_EXPIRATION = '24h';

/**
 * Signs a JWT token with the given payload
 */
export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRATION,
    });
    return token;
  } catch (error) {
    logger.error('Failed to sign JWT token', { error });
    throw new Error('Token generation failed');
  }
}

/**
 * Verifies and decodes a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    logger.error('Failed to verify JWT token', { error });
    throw new Error('Invalid or expired token');
  }
}

/**
 * Decodes a JWT token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    logger.error('Failed to decode JWT token', { error });
    return null;
  }
}
