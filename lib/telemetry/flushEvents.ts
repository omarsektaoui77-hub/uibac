import { eventQueue, TelemetryEvent, DEBUG_TELEMETRY } from './eventQueue';
import { dequeueBatch, requeueBatch } from "./eventQueue";

const ENDPOINT = "/api/telemetry";

export async function flushEvents(): Promise<void> {
  if (eventQueue.isFlushing || eventQueue.queue.length === 0) {
    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Flush skipped:', {
        isFlushing: eventQueue.isFlushing,
        queueSize: eventQueue.queue.length
      });
    }
    return;
  }

  eventQueue.isFlushing = true;

  try {
    // Atomic batch extraction (max 10 events)
    const batch = eventQueue.queue.splice(0, 10);

    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Flushing batch:', {
        batchSize: batch.length,
        remainingQueue: eventQueue.queue.length
      });
    }

    // Fire-and-forget POST (no await)
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch })
    }).catch(error => {
      // Failure Recovery: Unshift back to queue head
      eventQueue.queue.unshift(...batch);
      console.error('[TELEMETRY] Flush failed, events restored to queue:', error);
    });

    eventQueue.lastFlushTime = Date.now();

    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Flush completed:', {
        batchSize: batch.length,
        lastFlushTime: eventQueue.lastFlushTime
      });
    }
  } catch (error) {
    console.error('[TELEMETRY] Critical error in flushEvents:', error);
  } finally {
    eventQueue.isFlushing = false;
  }
}
if (typeof window !== 'undefined') {
  (window as any).flushEvents = flushEvents;
}