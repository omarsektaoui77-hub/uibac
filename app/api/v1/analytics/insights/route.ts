/**
 * Insights API
 *
 * GET /api/analytics/insights
 * Returns behavior analysis insights for users
 */

import { NextResponse } from 'next/server';
import { BehaviorAnalyzer } from '@/app/lib/analytics/behaviorAnalyzer';
import { storeTelemetryEvent, getStoredEvents } from '@/app/lib/analytics/telemetryStore';

export async function GET() {
  try {
    const eventStore = getStoredEvents();
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

    const event = {
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

    const eventStore = getStoredEvents();

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
