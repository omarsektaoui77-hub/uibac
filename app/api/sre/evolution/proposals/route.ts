/**
 * Evolution Proposals API
 *
 * GET /api/sre/evolution/proposals
 * Returns architecture improvement proposals
 */

import { NextResponse } from 'next/server';
import { generateProposals, getAutoApplyProposals, getPendingProposals, getProposalStats } from '@/lib/sre/architectureAdvisor';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const autoOnly = searchParams.get('auto') === 'true';
    const pendingOnly = searchParams.get('pending') === 'true';
    
    let proposals;
    if (autoOnly) {
      proposals = getAutoApplyProposals();
    } else if (pendingOnly) {
      proposals = getPendingProposals();
    } else {
      proposals = generateProposals();
    }
    
    const stats = getProposalStats();

    return NextResponse.json({
      proposals: proposals.map(p => ({
        id: p.id,
        title: p.title,
        type: p.type,
        risk_level: p.risk_level,
        expected_impact: p.expected_impact,
        confidence: Math.round(p.confidence * 100),
        estimated_effort_hours: p.estimated_effort_hours,
        affected_files: p.affected_files,
        benefits: p.benefits.slice(0, 3),
      })),
      stats: {
        total: stats.total,
        auto_eligible: stats.auto_eligible,
        requires_review: stats.requires_review,
        by_risk: stats.by_risk,
        avg_expected_impact: stats.avg_expected_impact,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[PROPOSALS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposals' },
      { status: 500 }
    );
  }
}
