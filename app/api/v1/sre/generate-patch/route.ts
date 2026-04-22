/**
 * Safe Auto-Fix Patch Generator API
 * Cognitive SRE System - Patch Generation Endpoint
 * 
 * POST /api/sre/generate-patch
 * 
 * Strict input/output format per system specification:
 * - Input: { rca, source_code, file_path }
 * - Output: { patch, change_summary, risk_level, confidence, requires_review }
 * 
 * SAFETY: No destructive operations, manual review fallback
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePatch, PatchGeneratorInput, PatchGeneratorOutput } from '@/core/sre/patchGenerator';

/**
 * POST /api/sre/generate-patch
 * 
 * Input Format:
 * {
 *   "rca": {
 *     "symptom": "...",
 *     "trigger": "...",
 *     "root_cause": "...",
 *     "confidence": 0.92,
 *     "evidence": ["..."],
 *     "safe_to_fix": true,
 *     "suggested_fix_type": "null_check"
 *   },
 *   "source_code": "...",
 *   "file_path": "components/Button.tsx"
 * }
 * 
 * Output Format:
 * {
 *   "patch": "@@ -42,1 +42,1 @@\n-const user = getUser(id);\n+const user = id ? getUser(id) : null;",
 *   "change_summary": "Added null check for user ID parameter",
 *   "risk_level": "low",
 *   "confidence": 0.88,
 *   "requires_review": false
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const validation = validateInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          patch: '',
          change_summary: validation.error || 'Invalid input',
          risk_level: 'high',
          confidence: 0.0,
          requires_review: true,
        } as PatchGeneratorOutput,
        { status: 400 }
      );
    }
    
    // Generate patch
    const input = body as PatchGeneratorInput;
    const result = generatePatch(input);
    
    // Return strict format output
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[PATCH GENERATOR] Error:', error);
    
    // Return failure mode per specification
    return NextResponse.json(
      {
        patch: '',
        change_summary: error instanceof Error ? error.message : 'Internal error',
        risk_level: 'high',
        confidence: 0.0,
        requires_review: true,
      } as PatchGeneratorOutput,
      { status: 500 }
    );
  }
}

/**
 * Validate input format
 */
function validateInput(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }
  
  const b = body as Record<string, unknown>;
  
  // Check RCA object
  if (!b.rca || typeof b.rca !== 'object') {
    return { valid: false, error: 'Missing or invalid "rca" field' };
  }
  
  const rca = b.rca as Record<string, unknown>;
  
  // Required RCA fields
  const requiredRCAFields = ['symptom', 'trigger', 'root_cause', 'confidence', 'safe_to_fix'];
  for (const field of requiredRCAFields) {
    if (!(field in rca)) {
      return { valid: false, error: `Missing RCA field: ${field}` };
    }
  }
  
  // Validate types
  if (typeof rca.symptom !== 'string') {
    return { valid: false, error: 'RCA.symptom must be a string' };
  }
  
  if (typeof rca.trigger !== 'string') {
    return { valid: false, error: 'RCA.trigger must be a string' };
  }
  
  if (typeof rca.root_cause !== 'string') {
    return { valid: false, error: 'RCA.root_cause must be a string' };
  }
  
  if (typeof rca.confidence !== 'number' || rca.confidence < 0 || rca.confidence > 1) {
    return { valid: false, error: 'RCA.confidence must be a number between 0 and 1' };
  }
  
  if (typeof rca.safe_to_fix !== 'boolean') {
    return { valid: false, error: 'RCA.safe_to_fix must be a boolean' };
  }
  
  // Validate source_code
  if (typeof b.source_code !== 'string' || b.source_code.length === 0) {
    return { valid: false, error: 'Missing or empty "source_code" field' };
  }
  
  // Validate file_path
  if (typeof b.file_path !== 'string' || b.file_path.length === 0) {
    return { valid: false, error: 'Missing or empty "file_path" field' };
  }
  
  return { valid: true };
}

/**
 * GET /api/sre/generate-patch
 * Status endpoint for health checks
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/sre/generate-patch',
    version: '1.0.0',
    features: [
      'null_check',
      'error_boundary',
      'async_handling',
      'type_guard',
    ],
    safety_checks: [
      'blocked_file_validation',
      'dangerous_pattern_detection',
      'rca_confidence_threshold',
      'safe_to_fix_verification',
    ],
  });
}
