/**
 * Entry point for På Spåret Party Backend
 */

import dotenv from 'dotenv';
import { createServer as createHTTPServer } from 'http';
import { createServer, createWebSocketServer } from './server';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = createServer();

// Create HTTP server
const httpServer = createHTTPServer(app);

// Create WebSocket server
const wss = createWebSocketServer(httpServer);

// Start server
httpServer.listen(PORT, () => {
  logger.info(`Backend server started`, {
    port: PORT,
    env: NODE_ENV,
    endpoints: {
      http: `http://localhost:${PORT}`,
      ws: `ws://localhost:${PORT}/ws`,
      health: `http://localhost:${PORT}/health`,
    },
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');

  wss.close(() => {
    logger.info('WebSocket server closed');
  });

  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');

  wss.close(() => {
    logger.info('WebSocket server closed');
  });

  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});
