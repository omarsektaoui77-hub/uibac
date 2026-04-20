/**
 * Telemetry Service
 *
 * Non-blocking telemetry tracking for user behavior.
 * Logs locally, sends failures to Sentry, future DB integration ready.
 */

import { TelemetryEvent } from '../types/telemetry';
// import * as Sentry from '@sentry/nextjs';

export class TelemetryService {
  /**
   * Track a telemetry event (non-blocking)
   */
  static async track(event: TelemetryEvent): Promise<void> {
    try {
      // Log locally
      console.log('[TELEMETRY]', event);

      // Send to Sentry (only failures) - temporarily disabled
      // if (!event.isCorrect && event.failureTag) {
      //   Sentry.captureMessage('User failure event', {
      //     level: 'warning',
      //     tags: {
      //       subject: event.subjectId,
      //       failureTag: event.failureTag,
      //     },
      //     extra: event as any,
      //   });
      // }

      // Future: push to DB / queue
    } catch (err) {
      console.error('Telemetry failed', err);
    }
  }
}
