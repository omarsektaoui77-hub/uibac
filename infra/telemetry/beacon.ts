import {
  getQueueSize,
  DEBUG_TELEMETRY,
  TelemetryEvent,
} from './eventQueue';
import { flushAllRemaining, flushWithBeacon as flushWithBeaconInternal } from './flush';

const ENDPOINT = '/api/telemetry';

// For manual beacon flushing with event tracking
export function flushWithBeacon(events?: TelemetryEvent[]): boolean {
  if (typeof window === 'undefined') {
    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Beacon flush skipped (not in browser)');
    }
    return false;
  }

  // If no events provided, use the internal function from flush.ts
  if (!events || events.length === 0) {
    return flushWithBeaconInternal();
  }

  // Manual beacon flush with specific events
  try {
    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Flushing with beacon:', {
        batchSize: events.length,
        remainingQueue: getQueueSize()
      });
    }

    const data = JSON.stringify({
      events,
      source: 'beacon-manual',
      timestamp: Date.now(),
    });

    const blob = new Blob([data], { type: 'application/json' });

    if (navigator.sendBeacon) {
      const success = navigator.sendBeacon(ENDPOINT, blob);

      if (DEBUG_TELEMETRY) {
        console.log('[TELEMETRY] Beacon flush result:', success ? '✓ sent' : '✗ failed');
      }

      return success;
    } else {
      if (DEBUG_TELEMETRY) {
        console.warn('[TELEMETRY] sendBeacon not supported, events may be lost');
      }
      return false;
    }
  } catch (err) {
    // Must NOT throw errors
    if (DEBUG_TELEMETRY) {
      console.error('[TELEMETRY] Beacon flush error (silently ignored):', err);
    }
    return false;
  }
}

/**
 * Handle page exit - uses sendBeacon for reliable delivery
 * This is critical for zero event loss
 */
async function handlePageExit(): Promise<void> {
  if (DEBUG_TELEMETRY) {
    console.log('[TELEMETRY] Page exit detected - emergency flush...');
  }

  // Try to flush all remaining events
  await flushAllRemaining();

  // Final beacon flush as backup
  flushWithBeaconInternal();
}

/**
 * Handle visibility change - flush when tab is hidden
 * This catches many "soft" exits before beforeunload
 */
function handleVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Tab hidden - flushing remaining events...');
    }
    // Use beacon for reliable delivery when tab is hidden
    flushWithBeaconInternal();
  }
}

export function setupBeaconListener(): void {
  if (typeof window === 'undefined') {
    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Beacon listener skipped (not in browser)');
    }
    return;
  }

  // Visibility change - catches tab switching, minimizing
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Page unload - last chance for critical events
  window.addEventListener('beforeunload', () => {
    flushWithBeaconInternal();
  });

  // Page hide - for mobile browsers and some desktop cases
  window.addEventListener('pagehide', () => {
    flushWithBeaconInternal();
  });

  // Freeze/resume - for modern page lifecycle
  if ('onfreeze' in document) {
    document.addEventListener('freeze', () => {
      if (DEBUG_TELEMETRY) {
        console.log('[TELEMETRY] Page frozen - beacon flush');
      }
      flushWithBeaconInternal();
    });
  }

  if (DEBUG_TELEMETRY) {
    console.log('[TELEMETRY] ✓ Page exit handlers setup complete');
    console.log('[TELEMETRY]   - visibilitychange: for tab hide/switch');
    console.log('[TELEMETRY]   - beforeunload: for page close');
    console.log('[TELEMETRY]   - pagehide: for mobile/SPA navigation');
  }
}

export function removeBeaconListener(): void {
  if (typeof window === 'undefined') {
    return;
  }

  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('beforeunload', flushWithBeaconInternal);
  window.removeEventListener('pagehide', flushWithBeaconInternal);

  if ('onfreeze' in document) {
    document.removeEventListener('freeze', () => {
      flushWithBeaconInternal();
    });
  }

  if (DEBUG_TELEMETRY) {
    console.log('[TELEMETRY] Page exit handlers removed');
  }
}
