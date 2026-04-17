import { flushEvents } from './flush';
import { DEBUG_TELEMETRY } from './eventQueue';

let flushInterval: NodeJS.Timeout | null = null;

export function startAutoFlush(intervalMs: number = 5000): void {
  if (flushInterval) {
    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Auto-flush already started');
    }
    return;
  }

  if (DEBUG_TELEMETRY) {
    console.log(`[TELEMETRY] Starting auto-flush (${intervalMs}ms interval)`);
  }

  flushInterval = setInterval(() => {
    // Non-blocking: flushEvents is async but we don't await it
    flushEvents().catch(err => {
      if (DEBUG_TELEMETRY) {
        console.error('[TELEMETRY] Auto-flush error:', err);
      }
    });
  }, intervalMs);
}

export function stopAutoFlush(): void {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Auto-flush stopped');
    }
  }
}

export function isAutoFlushRunning(): boolean {
  return flushInterval !== null;
}
