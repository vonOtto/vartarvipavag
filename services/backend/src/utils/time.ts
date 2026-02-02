/**
 * Time utilities for server monotonic time
 */

const SERVER_START_TIME = Date.now();

/**
 * Get current server monotonic time in milliseconds
 */
export function getServerTimeMs(): number {
  return Date.now();
}

/**
 * Get server uptime in seconds
 */
export function getUptimeSeconds(): number {
  return Math.floor((Date.now() - SERVER_START_TIME) / 1000);
}
