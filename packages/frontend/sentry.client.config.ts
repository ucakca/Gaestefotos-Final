import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Adjust sample rate for production
    tracesSampleRate: 0,
    
    // Capture only errors, not performance traces
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    
    // Filter out known errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      
      // Network errors (handled by retry logic)
      'NetworkError',
      'Network request failed',
      'Failed to fetch',
      
      // Tus errors (already logged)
      'tus: ',
    ],
    
    beforeSend(event, hint) {
      // Don't send in development
      if (process.env.NODE_ENV === 'development') {
        return null;
      }
      return event;
    },
  });
}
