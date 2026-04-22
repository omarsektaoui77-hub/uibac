import { flushEvents } from './flushEvents';
import { eventQueue, DEBUG_TELEMETRY } from './eventQueue';

// Periodic Flush (5000ms heartbeat)
let flushInterval: NodeJS.Timeout | null = null;

export function startPeriodicFlush(): void {
  if (flushInterval) {
    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Periodic flush already started');
    }
    return;
  }

  flushInterval = setInterval(() => {
    flushEvents();
  }, 5000);

  if (DEBUG_TELEMETRY) {
    console.log('[TELEMETRY] Periodic flush started (5000ms interval)');
  }
}

export function stopPeriodicFlush(): void {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Periodic flush stopped');
    }
  }
}

// Lifecycle-Based Flush (sendBeacon)
export function setupLifecycleFlush(): void {
  if (typeof window === 'undefined') {
    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Lifecycle flush skipped (not in browser)');
    }
    return;
  }

  window.addEventListener('beforeunload', () => {
    if (eventQueue.queue.length === 0) {
      if (DEBUG_TELEMETRY) {
        console.log('[TELEMETRY] Lifecycle flush skipped (empty queue)');
      }
      return;
    }

    // sendBeacon is non-blocking and survives page unload
    const batch = eventQueue.queue.splice(0, 10);
    const data = JSON.stringify({ events: batch });

    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Lifecycle flush triggered:', {
        batchSize: batch.length
      });
    }

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/telemetry', new Blob([data], { type: 'application/json' }));
    } else {
      if (DEBUG_TELEMETRY) {
        console.log('[TELEMETRY] sendBeacon not supported, events may be lost');
      }
    }
  });

  if (DEBUG_TELEMETRY) {
    console.log('[TELEMETRY] Lifecycle flush setup complete');
  }
}
