import * as Sentry from "@sentry/nextjs";

export function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event, hint) {
        // Filter out client-side benign errors
        if (event.message?.includes("ResizeObserver loop limit exceeded")) {
          return null;
        }
        if (event.message?.includes("Non-Error exception captured")) {
          return null;
        }
        // Add app-specific tags
        event.tags = {
          ...event.tags,
          app: "uibac",
          platform: "nextjs",
        };
        return event;
      },
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
    });
  }
}
