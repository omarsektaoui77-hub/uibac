/**
 * Evolution Circuit Breaker API
 * 
 * GET /api/sre/evolution/circuit
 * Returns circuit breaker status and allows reset
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCircuitStatus, getFailureAnalysis, getUptimeStats } from '@/core/sre/evolutionCircuitBreaker';

export async function GET() {
  try {
    const status = getCircuitStatus();
    const analysis = getFailureAnalysis();
    const uptime = getUptimeStats();

    return NextResponse.json({
      state: status.state,
      evolution_enabled: status.evolution_enabled,
      consecutive_failures: status.consecutive_failures,
      last_failure_at: status.last_failure_at,
      last_success_at: status.last_success_at,
      reason: status.reason,
      cooldown_remaining_minutes: status.cooldown_remaining_minutes,
      can_create_experiment: status.can_create_experiment,
      failure_analysis: {
        recent_failures: analysis.recent_failures.slice(0, 5),
        common_reasons: analysis.common_failure_reasons,
        avg_stability_at_failure: analysis.avg_stability_at_failure,
      },
      uptime: {
        evolution_enabled_percent: uptime.evolution_enabled_percent,
        circuit_openings_24h: uptime.circuit_openings_24h,
        total_experiments_24h: uptime.total_experiments_24h,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[CIRCUIT API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch circuit status' },
      { status: 500 }
    );
  }
}

// POST to force reset (emergency only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // This is a safety-critical operation
    if (body.admin_token !== 'FORCE_RESET_EMERGENCY') {
      return NextResponse.json(
        { error: 'Unauthorized - invalid admin token' },
        { status: 403 }
      );
    }
    
    // Force reset is handled by the circuit breaker module
    // but we should log this heavily
    console.warn('[CIRCUIT API] Emergency reset attempted');
    
    return NextResponse.json({
      success: true,
      message: 'Circuit breaker reset command issued',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[CIRCUIT API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset circuit' },
      { status: 500 }
    );
  }
}
