/**
 * LLM-Based Root Cause Analysis API
 * Cognitive SRE System - Reasoning Layer
 * 
 * POST /api/sre/analyze
 * 
 * Input: Sentry error + telemetry context + code snippets
 * Output: Structured RCA with confidence score
 * 
 * SAFETY: Analysis only, no destructive actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEvents, TelemetryEvent } from '@/infra/telemetry/eventQueue';

// RCA response format (STRICT)
export interface RCAResult {
  symptom: string;        // What user sees
  trigger: string;        // What caused it
  root_cause: string;     // Underlying issue
  confidence: number;     // 0.0 - 1.0
  affected_components: string[];
  suggested_fix_type: 'null_check' | 'error_boundary' | 'async_handling' | 'type_guard' | 'dependency_update' | 'manual_review';
  code_reference?: string;
}

// LLM Prompt for RCA
const RCA_PROMPT = `You are an expert Site Reliability Engineer performing Root Cause Analysis.

Analyze the error and context below. Return STRICT JSON with no markdown formatting.

ERROR DETAILS:
- Message: {{error_message}}
- Stack Trace: {{stack_trace}}
- Component: {{component}}
- Severity: {{severity}}

TELEMETRY CONTEXT (Last 10 events):
{{telemetry_context}}

RELEVANT CODE:
{{code_snippet}}

Return JSON in this exact format:
{
  "symptom": "What the user experiences (1 sentence)",
  "trigger": "The immediate cause (1 sentence)",
  "root_cause": "The underlying issue with specific code reference",
  "confidence": 0.85,
  "affected_components": ["Component1", "Component2"],
  "suggested_fix_type": "null_check",
  "code_reference": "filename.ts:line_number"
}

Requirements:
- symptom: User-facing description
- trigger: Technical immediate cause
- root_cause: Specific, actionable explanation referencing actual code
- confidence: 0.0-1.0 based on clarity of evidence
- suggested_fix_type: One of: null_check, error_boundary, async_handling, type_guard, dependency_update, manual_review
- code_reference: Specific file and line if identifiable

Be specific. Never vague. Reference actual code when possible.`;

// Mock RCA for development/testing
function generateMockRCA(errorMessage: string, stackTrace?: string): RCAResult {
  const normalizedError = (errorMessage || '').toLowerCase();
  
  // Pattern-based mock RCA
  if (normalizedError.includes('cannot read') && normalizedError.includes('undefined')) {
    return {
      symptom: "Application crashes when accessing property on undefined object",
      trigger: "Code attempts to access nested property without null checking",
      root_cause: "Missing optional chaining operator (?.) on potentially undefined object reference in data access pattern",
      confidence: 0.92,
      affected_components: ["Data Access Layer", "UI Components"],
      suggested_fix_type: "null_check",
      code_reference: stackTrace ? extractFileReference(stackTrace) : "unknown:0",
    };
  }
  
  if (normalizedError.includes('fetch') || normalizedError.includes('network')) {
    return {
      symptom: "Data fails to load from external API",
      trigger: "Network request fails without proper error handling",
      root_cause: "Missing try-catch wrapper around fetch call with no fallback UI state",
      confidence: 0.88,
      affected_components: ["API Client", "Data Fetching"],
      suggested_fix_type: "async_handling",
      code_reference: stackTrace ? extractFileReference(stackTrace) : "api/client.ts:0",
    };
  }
  
  if (normalizedError.includes('type') && normalizedError.includes('undefined')) {
    return {
      symptom: "Type mismatch causing runtime error",
      trigger: "Function receives unexpected type at runtime",
      root_cause: "Missing TypeScript type guard or runtime validation before type-specific operations",
      confidence: 0.85,
      affected_components: ["Type System", "Runtime Validation"],
      suggested_fix_type: "type_guard",
      code_reference: stackTrace ? extractFileReference(stackTrace) : "unknown:0",
    };
  }
  
  // Default RCA
  return {
    symptom: "Application error occurred",
    trigger: "Unknown error pattern triggered",
    root_cause: "Insufficient context to determine root cause - manual investigation required",
    confidence: 0.45,
    affected_components: ["Unknown"],
    suggested_fix_type: "manual_review",
    code_reference: stackTrace ? extractFileReference(stackTrace) : "unknown:0",
  };
}

// Extract file reference from stack trace
function extractFileReference(stackTrace: string): string {
  const lines = stackTrace.split('\n');
  for (const line of lines) {
    // Match patterns like "at functionName (file.ts:line:col)" or "file.ts:line:col"
    const match = line.match(/\s*at\s+.*?\s*\(([^)]+)\)/) || 
                  line.match(/\s+at\s+([^)]+)/) ||
                  line.match(/([^\s()]+\.tsx?):(\d+):(\d+)/);
    
    if (match) {
      const location = match[1] || match[0];
      // Clean up the path
      const cleanPath = location
        .replace(/^.*\//, '')  // Remove directory path
        .replace(/:\d+:\d+$/, '');  // Remove line:col for now
      return cleanPath;
    }
  }
  return "unknown:0";
}

// Format telemetry for LLM context
function formatTelemetryContext(events: TelemetryEvent[]): string {
  if (events.length === 0) return "No telemetry events available";

  return events.slice(-10).map((event, i) => {
    const time = new Date(event.serverTimestamp).toISOString();
    const status = event.status === 'failed' ? 'FAIL' : 'OK';
    return `${i + 1}. [${time}] ${event.eventType} - ${status} (retries: ${event.retries})`;
  }).join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      error_message, 
      stack_trace, 
      component = 'unknown',
      severity = 'error',
      code_snippet = ''
    } = body;

    // Validation
    if (!error_message) {
      return NextResponse.json(
        { error: 'error_message is required' },
        { status: 400 }
      );
    }

    // Get telemetry context
    const telemetryEvents = getAllEvents ? getAllEvents() : [];
    const telemetryContext = formatTelemetryContext(telemetryEvents);

    // Check for LLM API key
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey || apiKey === 'mock' || apiKey === 'sk-mock') {
      console.log('[SRE-RCA] No LLM API key, using pattern-based RCA');
      
      // Use intelligent mock RCA based on error patterns
      const mockRCA = generateMockRCA(error_message, stack_trace);
      
      return NextResponse.json({
        success: true,
        rca: mockRCA,
        source: 'pattern-analysis',
        timestamp: new Date().toISOString(),
      });
    }

    // Prepare LLM prompt
    const prompt = RCA_PROMPT
      .replace('{{error_message}}', error_message)
      .replace('{{stack_trace}}', stack_trace || 'Not provided')
      .replace('{{component}}', component)
      .replace('{{severity}}', severity)
      .replace('{{telemetry_context}}', telemetryContext)
      .replace('{{code_snippet}}', code_snippet || 'Not provided');

    // Call LLM (OpenAI or Anthropic)
    let rca: RCAResult;
    
    try {
      if (process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
        // Use Anthropic Claude
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (!response.ok) {
          throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || '';
        
        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          rca = JSON.parse(jsonMatch[0]) as RCAResult;
        } else {
          throw new Error('No JSON found in LLM response');
        }
      } else {
        // Use OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert SRE. Return only valid JSON.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,  // Low temperature for consistency
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          rca = JSON.parse(jsonMatch[0]) as RCAResult;
        } else {
          throw new Error('No JSON found in LLM response');
        }
      }

      // Validate RCA structure
      if (!rca.symptom || !rca.root_cause || typeof rca.confidence !== 'number') {
        throw new Error('Invalid RCA structure from LLM');
      }

      return NextResponse.json({
        success: true,
        rca,
        source: 'llm-analysis',
        model: process.env.ANTHROPIC_API_KEY ? 'claude-3-haiku' : 'gpt-4o-mini',
        timestamp: new Date().toISOString(),
      });

    } catch (llmError) {
      console.error('[SRE-RCA] LLM error:', llmError);
      
      // Fallback to pattern-based RCA
      const fallbackRCA = generateMockRCA(error_message, stack_trace);
      
      return NextResponse.json({
        success: true,
        rca: fallbackRCA,
        source: 'pattern-analysis-fallback',
        fallback_reason: llmError instanceof Error ? llmError.message : 'LLM call failed',
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error('[SRE-RCA] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to perform RCA',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for API status
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/sre/analyze',
    features: ['llm-rca', 'pattern-fallback', 'telemetry-context'],
    requires_api_key: !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY,
  });
}
