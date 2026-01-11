import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Server-side performance monitoring disabled
    tracesSampleRate: 0,
    
    // Filter out expected errors
    ignoreErrors: [
      'ECONNREFUSED',
      'ETIMEDOUT',
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
