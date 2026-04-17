import * as Sentry from "@sentry/nextjs";

interface UserContext {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}

/**
 * Set user context for Sentry error tracking
 * Call this after user authentication
 */
export function setSentryUser(user: UserContext) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  // Add role as a tag for easier filtering
  if (user.role) {
    Sentry.setTag("user_role", user.role);
  }
}

/**
 * Clear user context on logout
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Get current Sentry user ID
 */
export function getSentryUserId(): string | null {
  const scope = Sentry.getCurrentScope();
  const user = scope.getUser();
  return user?.id ? String(user.id) : null;
}
