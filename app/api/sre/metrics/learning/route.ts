/**
 * Learning Metrics API
 * 
 * GET /api/sre/metrics/learning
 * Returns learning engine statistics and trends
 */

import { NextResponse } from 'next/server';
import { getLearningStats, getTrendHistory, getTopPatterns } from '@/lib/sre/learningEngine';

export async function GET() {
  try {
    const stats = getLearningStats();
    const trend = getTrendHistory(30);
    const topPatterns = getTopPatterns(5);

    return NextResponse.json({
      total_fixes: stats.total_fixes,
      success_rate: stats.overall_success_rate,
      successful_fixes: stats.successful_fixes,
      rolled_back_fixes: stats.rolled_back_fixes,
      patterns_learned: stats.patterns_learned,
      average_quality_score: stats.average_quality_score,
      improvement_trend: stats.improvement_trend,
      trend_history: trend,
      top_patterns: topPatterns.map(p => ({
        hash: p.root_cause_hash.substring(0, 8),
        success_rate: Math.round(p.success_rate * 100),
        weight: Math.round(p.weight * 100) / 100,
        attempts: p.total_attempts,
      })),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[LEARNING API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning metrics' },
      { status: 500 }
    );
  }
}
