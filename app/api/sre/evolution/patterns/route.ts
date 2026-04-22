/**
 * Evolution Patterns API
 * 
 * GET /api/sre/evolution/patterns
 * Returns detected systemic patterns
 */

import { NextResponse } from 'next/server';
import { getPatterns, getCriticalPatterns, getPatternStats } from '@/core/sre/patternDetection';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const criticalOnly = searchParams.get('critical') === 'true';
    
    const patterns = criticalOnly ? getCriticalPatterns() : getPatterns();
    const stats = getPatternStats();

    return NextResponse.json({
      patterns: patterns.map(p => ({
        id: p.id,
        type: p.type,
        location: p.location,
        frequency: p.frequency,
        impact_score: p.impact_score,
        confidence: Math.round(p.confidence * 100),
        first_seen: p.first_seen,
        last_seen: p.last_seen,
        evidence_count: p.evidence.length,
      })),
      stats: {
        total: stats.total_patterns,
        by_type: stats.by_type,
        high_impact: stats.high_impact_count,
        avg_impact: stats.avg_impact_score,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[PATTERNS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patterns' },
      { status: 500 }
    );
  }
}
