import { TelemetryEvent } from '@/app/lib/types/telemetry';

// TEMP: In-memory store - replace with DB later
const eventStore: TelemetryEvent[] = [];

/**
 * Store a telemetry event (called by other APIs)
 */
export function storeTelemetryEvent(event: TelemetryEvent): void {
  eventStore.push(event);

  // Keep only last 1000 events
  if (eventStore.length > 1000) {
    eventStore.shift();
  }
}

/**
 * Get all stored events (for analysis)
 */
export function getStoredEvents(): TelemetryEvent[] {
  return eventStore;
}
