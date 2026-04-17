import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  release: process.env.NEXT_PUBLIC_RELEASE,

  // Production safety: 20% sampling in prod, 100% in dev
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,

  // Session Replay configuration
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enrich all client events + noise filtering
  beforeSend(event) {
    // Noise filtering - ignore known noisy browser errors
    if (event.message?.includes("ResizeObserver loop limit exceeded")) {
      return null;
    }
    if (event.message?.includes("Non-Error exception captured")) {
      return null;
    }

    event.tags = {
      ...event.tags,
      app: "uibac",
      platform: "nextjs-client",
    };
    return event;
  },

  debug: false,
});