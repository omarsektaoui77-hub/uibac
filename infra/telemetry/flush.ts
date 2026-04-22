import {
  dequeueBatch,
  requeueBatch,
  getQueueSize,
  eventQueue,
  DEBUG_TELEMETRY,
  SIMULATE_NETWORK_FAILURE,
  printQueueStatus,
} from './eventQueue';
import type { TelemetryEvent } from './eventQueue';

// Maximum retries before dropping event
const MAX_RETRIES = 3;

/**
 * Send events to server with lifecycle tracking
 * - queued → sending → sent → confirmed
 * - On failure: → failed → retry (if < MAX_RETRIES)
 * - Duplicate detection prevents double-sending
 */
export async function flushEvents(): Promise<void> {
  if (eventQueue.isFlushing) {
    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Flush already in progress, skipping');
    }
    return;
  }

  const queueSize = getQueueSize();
  if (queueSize === 0) {
    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Queue empty, nothing to flush');
    }
    return;
  }

  eventQueue.isFlushing = true;

  // Get batch and mark as sending
  const batch = dequeueBatch();

  if (DEBUG_TELEMETRY) {
    console.log(`[TELEMETRY] Flushing ${batch.length} events...`);
  }

  try {
    // Send batch to server
    const result = await sendBatch(batch);

    if (result.success) {
      // Mark events as confirmed
      batch.forEach(event => {
        event.status = 'confirmed';
        eventQueue.sentEventIds.add(event.id);
        eventQueue.confirmedCount++;
      });

      if (DEBUG_TELEMETRY) {
        console.log(`[TELEMETRY] ✓ ${batch.length} events confirmed`);
        printQueueStatus();
      }
    } else {
      throw new Error('Server rejected batch');
    }
  } catch (err) {
    // Handle failures with retry logic
    const failedEvents: TelemetryEvent[] = [];
    const retryEvents: TelemetryEvent[] = [];

    batch.forEach(event => {
      if (eventQueue.sentEventIds.has(event.id)) {
        // Already sent - don't duplicate
        if (DEBUG_TELEMETRY) {
          console.warn(`[TELEMETRY] Duplicate blocked: ${event.id}`);
        }
        return;
      }

      event.status = 'failed';
      eventQueue.failedCount++;

      if (event.retries < MAX_RETRIES) {
        event.retries++;
        retryEvents.push(event);
      } else {
        failedEvents.push(event);
        if (DEBUG_TELEMETRY) {
          console.error(`[TELEMETRY] Event dropped after ${MAX_RETRIES} retries: ${event.id}`);
        }
      }
    });

    // Requeue retryable events
    if (retryEvents.length > 0) {
      requeueBatch(retryEvents);
      if (DEBUG_TELEMETRY) {
        console.log(`[TELEMETRY] ↻ ${retryEvents.length} events requeued for retry`);
      }
    }

    if (DEBUG_TELEMETRY && failedEvents.length > 0) {
      console.error(`[TELEMETRY] ✗ ${failedEvents.length} events failed permanently`);
    }
  } finally {
    eventQueue.isFlushing = false;
    eventQueue.lastFlushTime = performance.now();
  }
}

/**
 * Send batch to server with network failure simulation support
 */
async function sendBatch(events: TelemetryEvent[]): Promise<{ success: boolean }> {
  // Simulate network failure for testing
  if (SIMULATE_NETWORK_FAILURE) {
    if (DEBUG_TELEMETRY) {
      console.warn('[TELEMETRY] Simulating network failure');
    }
    throw new Error('Network failure simulation');
  }

  // Check for duplicates before sending
  const uniqueEvents = events.filter(event => {
    if (eventQueue.sentEventIds.has(event.id)) {
      if (DEBUG_TELEMETRY) {
        console.warn('[TELEMETRY] Duplicate event blocked:', event.id);
      }
      return false;
    }
    return true;
  });

  if (uniqueEvents.length === 0) {
    return { success: true }; // Nothing to send, but not a failure
  }

  // Mark as sent before network request
  uniqueEvents.forEach(event => {
    event.status = 'sent';
  });

  try {
    const res = await fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: uniqueEvents }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return { success: true };
  } catch (err) {
    // Reset status on network failure
    uniqueEvents.forEach(event => {
      event.status = 'failed';
    });
    throw err;
  }
}

/**
 * Send remaining events using navigator.sendBeacon (for page exit)
 * This is the most reliable method for unloading scenarios
 */
export function flushWithBeacon(): boolean {
  const queueSize = getQueueSize();
  if (queueSize === 0) return true;

  const batch = dequeueBatch();

  // Prepare payload
  const payload = JSON.stringify({
    events: batch,
    source: 'beacon',
    timestamp: Date.now(),
  });

  // Use sendBeacon for reliable delivery during page unload
  const success = navigator.sendBeacon('/api/telemetry', new Blob([payload], {
    type: 'application/json',
  }));

  if (success) {
    batch.forEach(event => {
      event.status = 'sent'; // Best effort - actual confirmation not possible with beacon
      eventQueue.sentEventIds.add(event.id);
    });

    if (DEBUG_TELEMETRY) {
      console.log(`[TELEMETRY] Beacon sent ${batch.length} events`);
    }
  } else {
    // Restore to queue if beacon failed
    requeueBatch(batch);
  }

  return success;
}

/**
 * Flush all remaining events immediately (for page exit)
 * Combines fetch + beacon as fallback
 */
export async function flushAllRemaining(): Promise<void> {
  const queueSize = getQueueSize();
  if (queueSize === 0) return;

  if (DEBUG_TELEMETRY) {
    console.log(`[TELEMETRY] Emergency flush of ${queueSize} events...`);
  }

  // Try regular flush first
  while (getQueueSize() > 0 && !eventQueue.isFlushing) {
    await flushEvents();
  }

  // Use beacon for any remaining
  if (getQueueSize() > 0) {
    flushWithBeacon();
  }
}

// Expose for browser testing and debugging
if (typeof window !== 'undefined') {
  (window as any).flushEvents = flushEvents;
  (window as any).flushWithBeacon = flushWithBeacon;
  (window as any).flushAllRemaining = flushAllRemaining;
  (window as any).telemetryQueue = {
    get size() { return getQueueSize(); },
    get sentIds() { return Array.from(eventQueue.sentEventIds); },
    get stats() {
      return {
        confirmed: eventQueue.confirmedCount,
        failed: eventQueue.failedCount,
        sent: eventQueue.sentEventIds.size,
      };
    },
    printStatus: printQueueStatus,
  };
}