/**
 * Frontend Logger Utility
 * - Only logs in development mode
 * - Silent in production (no sensitive data leaks)
 * - Can be extended to send errors to external services
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: any[]) => {
    // Always log errors, but could be sent to Sentry/etc in production
    if (isDev) {
      console.error(...args);
    }
    // In production, errors are captured by ErrorBoundary and Sentry
  },
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  },
};

export default logger;
