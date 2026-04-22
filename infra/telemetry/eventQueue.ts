// Event Lifecycle Status
type EventStatus = 'queued' | 'sending' | 'sent' | 'confirmed' | 'failed';

// Event Schema (TypeScript)
export interface TelemetryEvent {
  metadata: any;
  id: string; // crypto.randomUUID() for deduplication
  eventType: 'STREAK_UPDATED' | 'QUIZ_COMPLETED' | 'REWARD_GRANTED' | 'ENGAGEMENT_UPDATED';
  timestamp: number; // High-resolution (performance.now())
  serverTimestamp: number; // Server-side timestamp for ordering
  sessionId: string;
  userId: string;
  payload: {
    streak?: number;
    streakMultiplier?: number;
    xp?: number;
    xpEarned?: number;
    rewardType?: string;
    rewardValue?: number;
    engagementScore?: number;
    accuracy?: number;
    level?: string;
    atRisk?: boolean;
    topic?: string;
    score?: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  };
  // Lifecycle tracking
  status: EventStatus;
  retries: number;
  lastUpdated: number;
}

// Event Queue State
export interface EventQueueState {
  queue: TelemetryEvent[];
  isFlushing: boolean;
  lastFlushTime: number;
  sentEventIds: Set<string>; // Deduplication tracking
  failedCount: number;
  confirmedCount: number;
}

// Global queue state
export const eventQueue: EventQueueState = {
  queue: [],
  isFlushing: false,
  lastFlushTime: 0,
  sentEventIds: new Set(),
  failedCount: 0,
  confirmedCount: 0,
};

// Network failure simulation toggle (for testing)
export let SIMULATE_NETWORK_FAILURE = false;

export function toggleNetworkFailure(enable?: boolean) {
  SIMULATE_NETWORK_FAILURE = enable !== undefined ? enable : !SIMULATE_NETWORK_FAILURE;
  console.log(`[TELEMETRY] Network failure simulation: ${SIMULATE_NETWORK_FAILURE ? 'ENABLED' : 'DISABLED'}`);
  return SIMULATE_NETWORK_FAILURE;
}

// Lifecycle tracking helpers
export function updateEventStatus(
  event: TelemetryEvent,
  status: EventStatus,
  incrementRetry: boolean = false
) {
  event.status = status;
  event.lastUpdated = performance.now();
  if (incrementRetry) {
    event.retries++;
  }
}

// Debug mode flag
export const DEBUG_TELEMETRY = true;

// Client-side queue for telemetry events
const clientQueue: TelemetryEvent[] = [];
const MAX_BATCH_SIZE = 10;

export function enqueueEvent(event: TelemetryEvent) {
  // Initialize lifecycle tracking
  event.status = 'queued';
  event.retries = 0;
  event.lastUpdated = performance.now();
  clientQueue.push(event);

  if (DEBUG_TELEMETRY) {
    console.log(`[TELEMETRY] Event queued: ${event.id} (${event.eventType})`);
  }
}

export function dequeueBatch(): TelemetryEvent[] {
  const batch = clientQueue.splice(0, MAX_BATCH_SIZE);
  // Mark events as sending
  batch.forEach(event => {
    event.status = 'sending';
    event.lastUpdated = performance.now();
  });
  return batch;
}

export function requeueBatch(events: TelemetryEvent[]) {
  // Mark as failed and increment retry count
  events.forEach(event => {
    event.status = 'failed';
    event.retries++;
    event.lastUpdated = performance.now();
  });
  // Requeue at the front for immediate retry
  clientQueue.unshift(...events);
}

export function getQueueSize() {
  return clientQueue.length;
}

// Get all events with their current status (for debug dashboard)
export function getAllEvents(): TelemetryEvent[] {
  return [...clientQueue];
}

// Debug: Print queue status as table
export function printQueueStatus() {
  if (!DEBUG_TELEMETRY) return;

  const events = getAllEvents();
  const statusCounts = events.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('[TELEMETRY QUEUE STATUS]');
  console.table({
    total: events.length,
    ...statusCounts,
  });

  if (events.length > 0) {
    console.table(events.map(e => ({
      id: e.id.substring(0, 8) + '...',
      type: e.eventType,
      status: e.status,
      retries: e.retries,
      age: Math.round((performance.now() - e.timestamp) / 1000) + 's',
    })));
  }
}