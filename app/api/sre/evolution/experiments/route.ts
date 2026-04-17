/**
 * Evolution Experiments API
 * 
 * GET /api/sre/evolution/experiments
 * Returns running and completed experiments
 */

import { NextResponse } from 'next/server';
import { getAllExperiments, getExperimentStats } from '@/lib/sre/experimentEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') as import('@/lib/sre/experimentEngine').ExperimentState | null;
    
    let experiments = getAllExperiments();
    
    if (state) {
      experiments = experiments.filter(e => e.state === state);
    }
    
    const stats = getExperimentStats();

    return NextResponse.json({
      experiments: experiments.map(e => ({
        id: e.id,
        proposal_id: e.proposal_id,
        state: e.state,
        created_at: e.created_at,
        completed_at: e.completed_at,
        preview_url: e.preview_url,
        improvement: e.comparison_result?.overall_improvement,
        decision: e.decision?.action,
        auto_approved: e.decision?.auto_approved,
        error: e.error,
      })),
      stats: {
        total: stats.total,
        completed: stats.completed,
        approved: stats.approved,
        rejected: stats.rejected,
        avg_improvement: stats.avg_improvement,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[EXPERIMENTS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiments' },
      { status: 500 }
    );
  }
}
