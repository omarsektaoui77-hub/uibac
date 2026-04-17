# Scalable Edge-Ready Telemetry System

**Role:** Expert Full-Stack Engineer (Next.js/Vercel/Edge Runtime)

**Objective:**
Develop a lightweight, non-blocking Event Buffering & Batching System to handle high-frequency telemetry (gamification streaks, reward events, engagement metrics) without impacting UI performance or exceeding Vercel API rate limits.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client-Side (Browser)                    │
├─────────────────────────────────────────────────────────────┤
│  Quiz Component → trackEvent() → Event Queue (Array)       │
│                          ↓                                  │
│                   Batch (max 10)                            │
│                          ↓                                  │
│  Dual-Trigger Flush:                                        │
│    • Periodic (5000ms heartbeat)                            │
│    • Lifecycle (sendBeacon on beforeunload)               │
│                          ↓                                  │
│           POST /api/telemetry (Vercel Edge)                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              Edge Backend (Vercel Edge Runtime)             │
├─────────────────────────────────────────────────────────────┤
│  POST Handler → Deduplication → Memory Buffer              │
│                          ↓                                  │
│  Memory Guard (2000 records max, sliding window)            │
│                          ↓                                  │
│  Server Timestamp for Ordering                              │
│                          ↓                                  │
│  Vercel KV (Temporary Ingestion Buffer, 48h TTL)          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│           Aggregation Layer (Future/Manual)                  │
├─────────────────────────────────────────────────────────────┤
│  Cron Job / Manual Script → KV → Structured Storage        │
│                          ↓                                  │
│  Analytics: Streak trends, XP accumulation, engagement      │
└─────────────────────────────────────────────────────────────┘
```

**Architecture Note:**
- Edge KV serves as a **short-lived ingestion buffer** (not a database)
- Events are temporary (48h TTL) before aggregation
- This is intentional: forces aggregation design, keeps costs low for MVP

---

## Phase 1: Client-Side Event Queue & Batching

### 1.1 Event Queue Implementation

**Location:** `lib/telemetry/eventQueue.ts`

```typescript
// Event Schema (TypeScript)
interface TelemetryEvent {
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
    rewardType?: string;
    rewardValue?: number;
    engagementScore?: number;
    accuracy?: number;
    level?: string;
    atRisk?: boolean;
    topic?: string;
  };
}

// Event Queue State
interface EventQueueState {
  queue: TelemetryEvent[];
  isFlushing: boolean;
  lastFlushTime: number;
}
```

**Requirements:**
- Use `performance.now()` for high-resolution timestamps
- Queue is an in-memory array (no localStorage to avoid blocking)
- `isFlushing` flag prevents concurrent flushes
- Zero synchronous operations in `trackEvent()`

### 1.2 trackEvent Utility

```typescript
// lib/telemetry/trackEvent.ts

export function trackEvent(event: Omit<TelemetryEvent, 'id' | 'timestamp' | 'serverTimestamp'>): void {
  // Non-blocking push to queue with unique ID for deduplication
  eventQueue.queue.push({
    ...event,
    id: crypto.randomUUID(),
    timestamp: performance.now(),
    serverTimestamp: 0 // Will be set by server for ordering
  });

  // Auto-flush if queue reaches threshold
  if (eventQueue.queue.length >= 10 && !eventQueue.isFlushing) {
    flushEvents();
  }
}
```

**Critical:**
- No `await` operations
- No localStorage writes
- Returns immediately (non-blocking)
- Queue push is O(1)

---

## Phase 2: Atomic Batching Strategy

### 2.1 flushEvents Implementation

**Location:** `lib/telemetry/flushEvents.ts`

```typescript
async function flushEvents(): Promise<void> {
  if (eventQueue.isFlushing || eventQueue.queue.length === 0) return;

  eventQueue.isFlushing = true;

  try {
    // Atomic batch extraction (max 10 events)
    const batch = eventQueue.queue.splice(0, 10);
    
    // Fire-and-forget POST (no await)
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch })
    }).catch(error => {
      // Failure Recovery: Unshift back to queue head
      eventQueue.queue.unshift(...batch);
      console.error('Telemetry flush failed, events restored to queue:', error);
    });

    eventQueue.lastFlushTime = Date.now();
  } catch (error) {
    console.error('Critical error in flushEvents:', error);
  } finally {
    eventQueue.isFlushing = false;
  }
}
```

**Requirements:**
- Atomic batch extraction (splice is atomic)
- Max 10 events per request (Vercel rate limit safe)
- Fire-and-forget pattern (no await on fetch)
- Failure recovery: unshift failed batch back to queue
- No blocking operations

---

## Phase 3: Persistence & Persistence Efficiency

### 3.1 Dual-Trigger Flush System

**Location:** `lib/telemetry/persistence.ts`

```typescript
// Periodic Flush (5000ms heartbeat)
let flushInterval: NodeJS.Timeout | null = null;

export function startPeriodicFlush(): void {
  if (flushInterval) return;

  flushInterval = setInterval(() => {
    flushEvents();
  }, 5000);
}

export function stopPeriodicFlush(): void {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
}

// Lifecycle-Based Flush (sendBeacon)
export function setupLifecycleFlush(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeunload', () => {
    if (eventQueue.queue.length === 0) return;

    // sendBeacon is non-blocking and survives page unload
    const data = JSON.stringify({ events: eventQueue.queue.splice(0, 10) });
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/telemetry', new Blob([data], { type: 'application/json' }));
    }
  });
}
```

**Requirements:**
- Periodic: 5000ms heartbeat (consistent updates)
- Lifecycle: sendBeacon on beforeunload (survives page exit)
- sendBeacon is non-blocking (doesn't delay user transition)
- Cleanup interval on component unmount

---

## Phase 4: Stateless Edge Backend Optimization

### 4.1 Edge API Handler

**Location:** `app/api/telemetry/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Memory Buffer (stateless per-instance)
let eventBuffer: TelemetryEvent[] = [];
const MAX_BUFFER_SIZE = 2000;
const SEEN_EVENT_IDS = new Set<string>(); // For deduplication

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { events } = await request.json();

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Invalid events array' }, { status: 400 });
    }

    const serverTimestamp = Date.now();
    const deduplicatedEvents: TelemetryEvent[] = [];

    // Deduplication: Filter out events we've already seen
    for (const event of events) {
      if (!SEEN_EVENT_IDS.has(event.id)) {
        SEEN_EVENT_IDS.add(event.id);
        deduplicatedEvents.push({
          ...event,
          serverTimestamp // Set server timestamp for ordering
        });
      }
    }

    // Memory Guard: Hard-cap with sliding window
    const totalSize = eventBuffer.length + deduplicatedEvents.length;
    
    if (totalSize > MAX_BUFFER_SIZE) {
      // Sliding window: remove oldest 1000
      eventBuffer = eventBuffer.slice(1000);
    }

    // Append deduplicated events
    eventBuffer.push(...deduplicatedEvents);

    // Write to KV (temporary ingestion buffer, 48h TTL)
    // This is fire-and-forget - doesn't block the response
    try {
      await kv.set(`telemetry:${serverTimestamp}`, JSON.stringify(deduplicatedEvents), { ex: 172800 }); // 48h TTL
    } catch (kvError) {
      // KV write failure is non-critical - events still in memory buffer
      console.error('KV write failed:', kvError);
    }
    
    return NextResponse.json({ 
      success: true, 
      processed: deduplicatedEvents.length,
      deduplicated: events.length - deduplicatedEvents.length,
      bufferSize: eventBuffer.length 
    });

  } catch (error) {
    console.error('Telemetry API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint for debugging (remove in production)
export async function GET() {
  return NextResponse.json({ 
    bufferSize: eventBuffer.length,
    sampleEvents: eventBuffer.slice(-5) // Last 5 events
  });
}
```

**Requirements:**
- Edge runtime (stateless)
- Memory guard: 2000 records max
- Sliding window: remove oldest 1000 when buffer exceeds limit
- No await on database operations (fire-and-forget pattern)
- Returns immediately (non-blocking)

---

## Phase 5: Strategic Data Filtering

### 5.1 High-Value Signals Only

**Allowed Event Types:**
```typescript
type TelemetryEventType = 
  | 'STREAK_UPDATED'      // Streak changes (critical for retention)
  | 'QUIZ_COMPLETED'      // Quiz finished (core engagement)
  | 'REWARD_GRANTED'      // Reward unlocked (gamification)
  | 'ENGAGEMENT_UPDATED'; // Engagement score changes (churn prediction)
```

**Filtered Events (Do NOT track):**
- Individual answers (too noisy)
- Timer ticks (high-frequency, low value)
- Page views (handled by analytics)
- UI interactions (too noisy)

### 5.2 Schema-Less but Typed

**Payload Structure:**
```typescript
// Schema-less flexibility for future expansion
payload: Record<string, any>;

// But ensure required fields for gamification analysis
requiredFields: {
  streak?: number;           // Required for retention analysis
  streakMultiplier?: number; // Required for reward calculations
  xp?: number;               // Required for progression
  engagementScore?: number; // Required for churn prediction
  accuracy?: number;         // Required for difficulty tuning
}
```

---

## Phase 4.5: Aggregation Layer (Future/Manual)

### 4.5.1 Simple Aggregation Story

**Location:** `scripts/aggregate-telemetry.ts` (or Vercel Cron Job)

```typescript
// Simple aggregation script (run manually or via cron)
import { kv } from '@vercel/kv';

export async function aggregateTelemetry() {
  // Fetch all telemetry keys from KV
  const keys = await kv.keys('telemetry:*');
  
  const aggregatedData = {
    totalQuizzesCompleted: 0,
    totalRewardsGranted: 0,
    averageStreak: 0,
    averageEngagementScore: 0,
    streakTrends: [] as number[],
    xpAccumulation: [] as number[],
    userEngagement: [] as { userId: string; score: number }[]
  };

  for (const key of keys) {
    const events = JSON.parse(await kv.get(key) as string);
    
    for (const event of events) {
      switch (event.eventType) {
        case 'QUIZ_COMPLETED':
          aggregatedData.totalQuizzesCompleted++;
          aggregatedData.averageStreak += event.payload.streak || 0;
          aggregatedData.averageEngagementScore += event.payload.engagementScore || 0;
          break;
        case 'REWARD_GRANTED':
          aggregatedData.totalRewardsGranted++;
          break;
      }
    }
  }

  // Calculate averages
  const eventCount = aggregatedData.totalQuizzesCompleted || 1;
  aggregatedData.averageStreak /= eventCount;
  aggregatedData.averageEngagementScore /= eventCount;

  // Write aggregated data to structured storage (PostgreSQL, etc.)
  // This is where you'd persist the analytics for long-term querying
  console.log('Aggregated telemetry:', aggregatedData);
  
  // Optionally delete processed events from KV
  // await kv.del(...keys);
}
```

**Implementation Options:**
- **MVP:** Manual script run weekly/monthly
- **Production:** Vercel Cron Job (hourly/daily)
- **Future:** Real-time streaming pipeline (Kafka, ClickHouse)

**Purpose:**
- Extract value from raw events
- Enable analytics and reporting
- Move data from temporary buffer to structured storage

---

## Phase 6: Integration with Quiz Component

### 6.1 Initialize Telemetry in Quiz Component

**Location:** `app/[locale]/quiz/page.tsx`

```typescript
import { trackEvent } from '@/lib/telemetry/trackEvent';
import { startPeriodicFlush, setupLifecycleFlush } from '@/lib/telemetry/persistence';

// In QuizPage component
export default function QuizPage() {
  // ... existing code

  useEffect(() => {
    // Initialize telemetry
    startPeriodicFlush();
    setupLifecycleFlush();

    return () => {
      stopPeriodicFlush();
    };
  }, []);

  // Track streak updates
  useEffect(() => {
    if (state.status === "result") {
      trackEvent({
        eventType: 'QUIZ_COMPLETED',
        sessionId: getSessionId(),
        userId: 'omar',
        payload: {
          streak: state.streak,
          streakMultiplier: state.streakMultiplier,
          xp: state.xp,
          accuracy: state.correctAnswers / state.questions.length,
          level: state.level,
          engagementScore: state.engagementScore,
          atRisk: state.atRisk
        }
      });
    }
  }, [state.status, state.streak, state.xp, state.engagementScore, state.atRisk]);

  // Track reward grants
  useEffect(() => {
    if (state.reward) {
      trackEvent({
        eventType: 'REWARD_GRANTED',
        sessionId: getSessionId(),
        userId: 'omar',
        payload: {
          rewardType: state.reward.type,
          rewardValue: state.reward.value,
          streak: state.streak
        }
      });
    }
  }, [state.reward, state.streak]);
}
```

---

## Phase 7: Performance Requirements

### 7.1 Main Thread Impact

**Target:**
- `trackEvent()`: < 0.1ms (no blocking)
- Queue operations: O(1) time complexity
- Flush operations: Non-blocking (fire-and-forget)
- Memory usage: < 1MB for queue (10 events × ~1KB each)

### 7.2 Edge Runtime Constraints

**Vercel Edge Limits:**
- Execution time: < 50ms per request
- Memory: < 128MB per instance
- Cold starts: < 100ms

**Optimizations:**
- No database awaits (fire-and-forget)
- Minimal JSON parsing
- Sliding window prevents memory growth
- Stateless design (no persistent connections)

---

## Phase 8: Testing & Validation

### 8.1 Unit Tests

```typescript
// lib/telemetry/__tests__/eventQueue.test.ts
describe('Event Queue', () => {
  it('should add events to queue without blocking', () => {
    const start = performance.now();
    trackEvent({ eventType: 'TEST', sessionId: '123', userId: 'test', payload: {} });
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(0.1); // < 0.1ms
  });

  it('should flush when queue reaches threshold', () => {
    for (let i = 0; i < 10; i++) {
      trackEvent({ eventType: 'TEST', sessionId: '123', userId: 'test', payload: {} });
    }
    expect(eventQueue.queue.length).toBe(0); // Flushed
  });

  it('should recover failed batches', async () => {
    // Mock failed fetch
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
    
    trackEvent({ eventType: 'TEST', sessionId: '123', userId: 'test', payload: {} });
    await flushEvents();
    
    expect(eventQueue.queue.length).toBeGreaterThan(0); // Restored
  });
});
```

### 8.2 Load Testing

**Scenarios:**
- 100 events/second (stress test)
- 1000 events queued (memory test)
- Network failure recovery (resilience test)
- Deduplication test (simulated retries)

### 8.3 Demo Strategy (Safe Approach)

**Recommended Demo Flow:**
1. **Live Event Count:** Show event counter incrementing in real-time
2. **Queue Visualization:** Display queue size and flush status
3. **KV Inspection:** Show KV entries via debug endpoint (remove in production)
4. **Deduplication Demo:** Trigger duplicate events and show they're filtered
5. **Aggregation Preview:** Run manual aggregation script and show results

**Avoid:**
- ❌ Relying on sendBeacon for critical demo (browser-dependent, can fail silently)
- ❌ "Close the tab and show data survived" (risky, especially on mobile)
- ❌ Claims of "99.9% data persistence" (TTL = intentional deletion)

**Safe Demo Narrative:**
"We use Edge KV as a short-lived ingestion buffer before aggregation. This keeps costs low for MVP while ensuring we can extract insights from user behavior patterns."

---

## Phase 9: Deployment Checklist

### 9.1 Pre-Deployment

- [ ] Remove GET endpoint (debugging only)
- [ ] Add rate limiting (optional, at API level)
- [ ] Add authentication (if needed)
- [ ] Set up monitoring (Vercel Analytics)
- [ ] Test with real Vercel Edge deployment

### 9.2 Post-Deployment

- [ ] Monitor buffer size (should stay < 2000)
- [ ] Monitor API latency (should be < 50ms)
- [ ] Monitor error rate (should be < 1%)
- [ ] Verify no UI performance degradation

---

## Success Criteria

**Functional:**
- ✅ All gamification events tracked
- ✅ High-reliability event capture with graceful degradation on network loss
- ✅ Deduplication prevents metric inflation
- ✅ Server-side timestamps ensure event ordering
- ✅ No UI performance impact

**Performance:**
- ✅ trackEvent() < 0.1ms
- ✅ Queue operations O(1)
- ✅ Flush operations non-blocking
- ✅ Memory usage < 1MB

**Edge Runtime:**
- ✅ Execution time < 50ms
- ✅ Memory usage < 128MB
- ✅ Cold start < 100ms
- ✅ Stateless design
- ✅ KV serves as temporary ingestion buffer (48h TTL)

**Data Integrity:**
- ✅ Event IDs enable deduplication
- ✅ Server timestamps ensure ordering
- ✅ Deduplication prevents metric inflation from retries
- ✅ Aggregation layer extracts value from raw events

**Production:**
- ✅ Zero blocking operations on main thread
- ✅ Graceful degradation on network failure (sendBeacon best-effort)
- ✅ Handles network failures gracefully (queue recovery)
- ✅ Respects Vercel rate limits
- ✅ Clear data lifecycle (48h TTL → aggregation)

---

## Implementation Order

1. **Phase 1:** Event Queue & trackEvent utility (with event IDs)
2. **Phase 2:** Atomic Batching (flushEvents)
3. **Phase 3:** Persistence (dual-trigger flush)
4. **Phase 4:** Edge Backend (POST handler with deduplication and server timestamps)
5. **Phase 4.5:** Aggregation Layer (manual script or cron job)
6. **Phase 5:** Data Filtering (event types)
7. **Phase 6:** Quiz Component Integration
8. **Phase 7:** Performance Validation
9. **Phase 8:** Testing (including deduplication tests)
10. **Phase 9:** Deployment

---

## Notes

**Architecture Decisions:**
- Edge KV serves as a **short-lived ingestion buffer** (not a database)
- 48h TTL is intentional: forces aggregation design, keeps costs low for MVP
- Event IDs (crypto.randomUUID()) enable deduplication to prevent metric inflation
- Server-side timestamps ensure event ordering for streak/XP logic
- This system is designed for MVP scale (thousands of events per day)

**Limitations (MVP):**
- No real-time analytics (aggregation is manual/batch)
- No complex querying (KV is not a database)
- Edge functions are stateless (memory buffer resets on cold starts)
- sendBeacon is best-effort (browser-dependent, can fail silently)

**Future Scaling:**
- For enterprise scale, consider: Kafka, Redis, ClickHouse
- Add persistent storage (PostgreSQL, TimescaleDB) for long-term analytics
- Implement real-time aggregation (streaming pipeline)
- Add complex querying and dashboards

**Technical Notes:**
- sendBeacon has size limits (64KB), batch size is safe (10 events × ~1KB = ~10KB)
- Deduplication prevents metric inflation from edge/client retries
- Server timestamps are critical for event ordering (streak logic depends on sequence)
- Graceful degradation: network failures don't block UI
