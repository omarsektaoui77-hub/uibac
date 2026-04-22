/**
 * Fix Outcome Recording API
 * 
 * POST /api/sre/outcome
 * Records the result of a fix for learning engine
 * 
 * Body: {
 *   error_id: string;
 *   error_fingerprint: string;
 *   root_cause: string;
 *   patch: string;
 *   confidence: number;
 *   result: "success" | "rollback" | "pending";
 *   metrics: {
 *     error_rate_before: number;
 *     error_rate_after: number;
 *     latency_before_ms: number;
 *     latency_after_ms: number;
 *     canary_duration_ms: number;
 *   };
 *   file_path: string;
 *   fix_type: string;
 *   tenant_id?: string;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordFixOutcome, FixOutcome } from '@/core/sre/learningEngine';
import { recordSuccessfulFix, recordRollback } from '@/core/sre/stabilityScoring';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = [
      'error_id', 'error_fingerprint', 'root_cause', 'patch',
      'confidence', 'result', 'metrics', 'file_path', 'fix_type'
    ];

    for (const field of required) {
      if (!(field in body)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create outcome record
    const outcome: FixOutcome = {
      error_id: body.error_id,
      error_fingerprint: body.error_fingerprint,
      root_cause: body.root_cause,
      patch: body.patch,
      confidence: body.confidence,
      result: body.result,
      metrics: body.metrics,
      timestamp: Date.now(),
      tenant_id: body.tenant_id,
      file_path: body.file_path,
      fix_type: body.fix_type,
    };

    // Record in learning engine
    recordFixOutcome(outcome);

    // Update stability scoring
    if (body.result === 'success') {
      recordSuccessfulFix();
    } else if (body.result === 'rollback') {
      recordRollback();
    }

    return NextResponse.json({
      success: true,
      message: `Fix outcome recorded: ${body.result}`,
      timestamp: outcome.timestamp,
    });
  } catch (error) {
    console.error('[OUTCOME API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to record outcome' },
      { status: 500 }
    );
  }
}
