import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set traces sample rate to 0.1 for production (10% of transactions)
  // Adjust this value based on your traffic volume
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Set environment
  environment: process.env.NODE_ENV || 'development',

  // Filter out common development errors and reduce noise
  beforeSend(event, hint) {
    // Ignore errors from localhost in development
    if (process.env.NODE_ENV === 'development' && event.request?.url?.includes('localhost')) {
      return null;
    }

    // Ignore validation errors (handled by the API)
    if (event.tags?.code === 'VALIDATION_ERROR' || event.tags?.code === 'INVALID_JSON') {
      return null;
    }

    // Ignore expected API failures (rate limits, etc.)
    if (event.tags?.code === 'RATE_LIMITED') {
      return null;
    }

    return event;
  },
});
