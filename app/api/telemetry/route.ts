import { NextRequest, NextResponse } from 'next/server';
import { TelemetryEvent } from '@/lib/telemetry/eventQueue';

// Memory Buffer (local testing - NOT Edge yet)
let eventBuffer: TelemetryEvent[] = [];
const MAX_BUFFER_SIZE = 2000;
const SEEN_EVENT_IDS = new Set<string>(); // For deduplication

// Simulate failure for testing (30% failure rate)
const SIMULATE_FAILURE = true;

export async function POST(request: NextRequest) {
  try {
    const { events } = await request.json();

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Invalid events array' }, { status: 400 });
    }

    // Simulate failure for testing (30% failure rate)
    if (SIMULATE_FAILURE && Math.random() < 0.3) {
      console.log('[TELEMETRY] Simulating failure (30% rate)');
      return NextResponse.json({ error: 'Simulated failure' }, { status: 500 });
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

    console.log('[TELEMETRY] Batch processed:', {
      received: events.length,
      deduplicated: deduplicatedEvents.length,
      bufferSize: eventBuffer.length,
      batchSize: deduplicatedEvents.length
    });

    return NextResponse.json({
      success: true,
      processed: deduplicatedEvents.length,
      deduplicated: events.length - deduplicatedEvents.length,
      bufferSize: eventBuffer.length
    });

  } catch (error) {
    console.error('[TELEMETRY] API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint for debugging
export async function GET() {
  return NextResponse.json({
    bufferSize: eventBuffer.length,
    sampleEvents: eventBuffer.slice(-5), // Last 5 events
    seenEventIdsCount: SEEN_EVENT_IDS.size
  });
}
