/**
 * Evolution Status API
 * 
 * GET /api/sre/evolution/status
 * Returns current self-evolution system status
 */

import { NextResponse } from 'next/server';
import { getEvolutionStatus, getEvolutionInsights, getEvolutionSummary } from '@/lib/sre/selfEvolution';

export async function GET() {
  try {
    const status = getEvolutionStatus();
    const insights = getEvolutionInsights(5);
    const summary = getEvolutionSummary();

    return NextResponse.json({
      is_running: status.is_running,
      evolution_enabled: status.evolution_enabled,
      circuit_status: status.circuit_status,
      patterns_detected: status.patterns_detected,
      proposals_pending: status.proposals_pending,
      experiments_running: status.experiments_running,
      experiments_completed: status.experiments_completed,
      improvements_applied: status.improvements_applied,
      last_cycle_at: status.last_cycle_at,
      recent_insights: insights.map(i => ({
        type: i.type,
        title: i.title,
        description: i.description,
        trend: i.trend,
        value: i.value,
      })),
      summary: {
        total_cycles: summary.total_cycles,
        uptime_percent: summary.uptime_percent,
        avg_improvement_per_cycle: summary.avg_improvement_per_cycle,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[EVOLUTION API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evolution status' },
      { status: 500 }
    );
  }
}
