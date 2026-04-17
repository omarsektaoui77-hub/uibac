import { TelemetryEvent, DEBUG_TELEMETRY, enqueueEvent, getQueueSize } from './eventQueue';

export function trackEvent(
  event: Omit<TelemetryEvent, 'id' | 'timestamp' | 'serverTimestamp' | 'status' | 'retries' | 'lastUpdated'>
): void {
  const newEvent: TelemetryEvent = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: performance.now(),
    serverTimestamp: 0,
    status: 'queued',
    retries: 0,
    lastUpdated: performance.now(),
  };

  enqueueEvent(newEvent);

  if (DEBUG_TELEMETRY) {
    console.log('[TELEMETRY] Event queued:', {
      eventType: newEvent.eventType,
      id: newEvent.id,
      queueSize: getQueueSize()
    });
  }

  if (getQueueSize() >= 10) {
    import('./flush').then(({ flushEvents }) => {
      flushEvents();
    });
  }
}

// ✅ FIX: Proper global exposure
if (typeof window !== 'undefined') {
  (window as any).trackEvent = trackEvent;
}