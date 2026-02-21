import * as Sentry from "@sentry/bun";
import config from "@/config";

/**
 * Initialize Sentry error tracking
 * Only initializes if SENTRY_URL is configured
 */
export function initSentry(): void {
  if (!config.app.sentryUrl) {
    return;
  }

  Sentry.init({
    dsn: config.app.sentryUrl,
    environment: config.app.env,
    enableLogs: config.app.env === "production",
    tracesSampleRate: config.app.env === "production" ? 0.1 : 1.0,
    // Set release version
    release: config.app.version,
  });
}

/**
 * Capture an exception to Sentry
 * @param error - The error to capture
 * @param context - Additional context to include
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>,
): void {
  if (!config.app.sentryUrl) {
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message to Sentry
 * @param message - The message to capture
 * @param level - The severity level
 * @param context - Additional context to include
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, unknown>,
): void {
  if (!config.app.sentryUrl) {
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for Sentry
 * @param user - User information
 */
export function setUserContext(user: {
  id?: string;
  email?: string;
  username?: string;
}): void {
  if (!config.app.sentryUrl) {
    return;
  }

  Sentry.setUser(user);
}

/**
 * Clear user context from Sentry
 */
export function clearUserContext(): void {
  if (!config.app.sentryUrl) {
    return;
  }

  Sentry.setUser(null);
}
