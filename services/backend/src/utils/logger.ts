/**
 * Simple logging utility with timestamps
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel;

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[LOG_LEVEL];
}

function formatLog(level: LogLevel, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: any) {
    if (shouldLog('debug')) {
      console.debug(formatLog('debug', message, meta));
    }
  },

  info(message: string, meta?: any) {
    if (shouldLog('info')) {
      console.info(formatLog('info', message, meta));
    }
  },

  warn(message: string, meta?: any) {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, meta));
    }
  },

  error(message: string, meta?: any) {
    if (shouldLog('error')) {
      console.error(formatLog('error', message, meta));
    }
  },
};
