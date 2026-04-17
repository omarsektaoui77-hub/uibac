/**
 * Insights API
 * 
 * GET /api/sre/metrics/insights
 * Returns generated insights for dashboard display
 */

import { NextResponse } from 'next/server';
import { generateInsights, generateWeeklySummary, getSystemHealthSnapshot } from '@/lib/sre/insightsEngine';

export async function GET() {
  try {
    const insights = generateInsights();
    const weekly = generateWeeklySummary();
    const health = getSystemHealthSnapshot();

    return NextResponse.json({
      insights: insights.slice(0, 10),
      weekly_summary: {
        stability_change: weekly.stability_score_change,
        fixes_improvement: weekly.fixes_improvement_pct,
        auto_fix_efficiency_change: weekly.auto_fix_efficiency_change,
        key_achievements: weekly.key_achievements,
        areas_for_attention: weekly.areas_for_attention,
      },
      health_snapshot: health,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[INSIGHTS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
