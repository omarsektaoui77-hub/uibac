import * as Sentry from "@sentry/nextjs";

export function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    release: process.env.NEXT_PUBLIC_RELEASE,

    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

    environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,

    beforeSend(event) {
      // Noise filtering - ignore known noisy browser errors
      if (event.message?.includes("ResizeObserver loop limit exceeded")) {
        return null;
      }
      if (event.message?.includes("Non-Error exception captured")) {
        return null;
      }

      // Enrich all events with global context
      event.tags = {
        ...event.tags,
        app: "uibac",
        platform: "nextjs-server",
      };
      return event;
    },

    debug: false,
  });
}
