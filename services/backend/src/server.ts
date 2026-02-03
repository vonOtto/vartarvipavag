/**
 * Express + WebSocket server setup
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { Server as HTTPServer } from 'http';
import { logger } from './utils/logger';
import { getServerTimeMs, getUptimeSeconds } from './utils/time';
import sessionRoutes from './routes/sessions';

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  }));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      uptime: getUptimeSeconds(),
      timestamp: new Date().toISOString(),
      serverTimeMs: getServerTimeMs(),
    });
  });

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      service: 'På Spåret Party Edition - Backend',
      version: '1.0.0',
      endpoints: {
        health: 'GET /health',
        websocket: 'WS /ws',
        sessions: 'POST /v1/sessions',
        join: 'POST /v1/sessions/:id/join',
        tvJoin: 'POST /v1/sessions/:id/tv',
        byCode: 'GET /v1/sessions/by-code/:joinCode',
      },
    });
  });

  // API Routes
  app.use(sessionRoutes);

  return app;
}

export function createWebSocketServer(server: HTTPServer) {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
  });

  logger.info('WebSocket server created on path /ws');

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    logger.info('New WebSocket connection attempt', { ip });

    // Basic connection handling (will be expanded in Phase 1)
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        logger.debug('Received message', { type: message.type });

        // Echo for now - actual handling will be implemented in Phase 1
        ws.send(JSON.stringify({
          type: 'ECHO',
          sessionId: 'dev',
          serverTimeMs: getServerTimeMs(),
          payload: { received: message },
        }));
      } catch (error) {
        logger.error('Failed to parse message', { error });
        ws.close(1008, 'Invalid message format');
      }
    });

    ws.on('close', (code, reason) => {
      logger.info('WebSocket connection closed', { code, reason: reason.toString() });
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', { error: error.message });
    });

    // Send initial connection acknowledgment
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      sessionId: 'dev',
      serverTimeMs: getServerTimeMs(),
      payload: { message: 'WebSocket connection established' },
    }));
  });

  return wss;
}
