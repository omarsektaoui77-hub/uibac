/**
 * Insights API
 * 
 * GET /api/analytics/insights
 * Returns behavior analysis insights for users
 */

import { NextResponse } from 'next/server';
import { BehaviorAnalyzer } from '@/app/lib/analytics/behaviorAnalyzer';
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

export async function GET() {
  try {
    const insights = BehaviorAnalyzer.analyze(eventStore);

    return NextResponse.json({
      success: true,
      insights: {
        weakTopics: insights.weakTopics,
        frictionPoints: insights.frictionPoints,
        avgLatency: Math.round(insights.avgLatency),
        totalEvents: eventStore.length,
      },
    });
  } catch (error) {
    console.error('[INSIGHTS API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze behavior',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.userId || !body.subjectId || typeof body.isCorrect !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const event: TelemetryEvent = {
      userId: body.userId,
      subjectId: body.subjectId,
      isCorrect: body.isCorrect,
      timeToAnswer: body.timeToAnswer || 0,
      difficulty: body.difficulty || 'medium',
      timestamp: body.timestamp || new Date().toISOString(),
      dropOff: body.dropOff,
      failureTag: body.failureTag,
    };

    storeTelemetryEvent(event);

    return NextResponse.json({
      success: true,
      message: 'Event recorded',
      totalStored: eventStore.length,
    });
  } catch (error) {
    console.error('[INSIGHTS API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to store event' },
      { status: 500 }
    );
  }
}
