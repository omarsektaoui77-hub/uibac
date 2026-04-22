/**
 * Stability Metrics API
 * 
 * GET /api/sre/metrics/stability
 * Returns current stability score with full breakdown
 */

import { NextResponse } from 'next/server';
import { calculateStabilityScore, getScoreHistory } from '@/core/sre/stabilityScoring';

export async function GET() {
  try {
    const stability = calculateStabilityScore();
    const history = getScoreHistory(60); // Last hour for sparkline

    return NextResponse.json({
      score: stability.overall,
      grade: stability.grade,
      status: stability.status,
      trend: stability.trend,
      components: stability.components,
      recommendation: stability.recommendation,
      history: history.map(h => ({
        timestamp: h.timestamp,
        score: h.score,
      })),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[STABILITY API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate stability score' },
      { status: 500 }
    );
  }
}
