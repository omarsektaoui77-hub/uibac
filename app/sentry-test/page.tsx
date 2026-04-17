'use client';

import * as Sentry from "@sentry/nextjs";

export default function SentryTestPage() {
  const handleClientError = () => {
    console.log("[Sentry Test] Throwing client error...");
    throw new Error("Sentry client test");
  };

  const handleManualCapture = () => {
    console.log("[Sentry Test] Capturing exception manually...");
    Sentry.captureException(new Error("Manual captured test"), {
      tags: {
        test: "phase-2",
        module: "sentry-test",
        surface: "client",
      },
      extra: {
        action: "button_click",
        surface: "client",
        timestamp: new Date().toISOString(),
      },
    });
    console.log("[Sentry Test] Exception captured with metadata");
  };

  const handleBreadcrumb = () => {
    Sentry.addBreadcrumb({
      message: "User clicked breadcrumb button",
      level: "info",
      category: "user-action",
    });
    console.log("[Sentry Test] Breadcrumb added");
  };

  const setUserContext = () => {
    Sentry.setUser({
      id: "test-user-123",
      email: "test@example.com",
      username: "testuser",
    });
    console.log("[Sentry Test] User context set");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Sentry Test Page (Production-Grade)</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300 }}>
        <button onClick={handleClientError}>
          1. Trigger Client Error
        </button>

        <button onClick={handleManualCapture}>
          2. Capture With Metadata
        </button>

        <button onClick={handleBreadcrumb}>
          3. Add Breadcrumb
        </button>

        <button onClick={setUserContext}>
          4. Set User Context
        </button>
      </div>

      <div style={{ marginTop: 20, padding: 10, background: '#f0f0f0' }}>
        <h3>Test Checklist:</h3>
        <ul>
          <li>✓ Structured error metadata (tags, extra)</li>
          <li>✓ Breadcrumbs tracking</li>
          <li>✓ User context enrichment</li>
          <li>✓ Environment tagging</li>
        </ul>
      </div>
    </div>
  );
}
