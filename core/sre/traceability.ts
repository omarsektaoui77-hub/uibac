/**
 * Metadata Synchronization & Closed-Loop Debugging
 * Creates full traceability from Error → Fix → Validation
 * 
 * Integrates: Sentry ↔ GitHub ↔ Slack ↔ Telemetry
 */

// Trace context for end-to-end tracking
export interface TraceContext {
  // Original error tracking
  errorId: string;           // Unique error fingerprint
  sentryEventId?: string;   // Sentry event ID
  sentryIssueId?: string;   // Sentry issue ID (if available)
  
  // Fix tracking
  fixId: string;            // Auto-generated fix ID
  prUrl?: string;           // GitHub PR URL
  prNumber?: number;        // GitHub PR number
  commitSha?: string;       // Git commit SHA (when merged)
  
  // Status tracking
  status: 'detected' | 'analyzing' | 'fix-generated' | 'pr-created' | 'awaiting-review' | 'merged' | 'manual-review' | 'rejected';
  
  // Timeline
  detectedAt: string;       // ISO timestamp
  fixedAt?: string;         // When fix was generated
  reviewedAt?: string;      // When human reviewed
  
  // Context
  errorType: string;        // Error classification
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  environment: string;
  
  // Audit trail
  decisions: TraceDecision[];
}

// Decision log entry
export interface TraceDecision {
  timestamp: string;
  actor: 'system' | 'human' | 'circuit-breaker';
  action: string;
  reason?: string;
  metadata?: Record<string, any>;
}

// Telemetry payload with trace context
export interface TracedTelemetryEvent {
  eventType: 'AUTO_FIX_INITIATED' | 'AUTO_FIX_COMPLETED' | 'AUTO_FIX_FAILED' | 'MANUAL_REVIEW_REQUIRED' | 'PR_CREATED' | 'PR_MERGED';
  traceContext: TraceContext;
  metadata: {
    originalErrorId: string;
    fixId: string;
    status: string;
    duration?: number;  // Time from detection to fix
  };
  timestamp: number;
}

// Storage key for trace registry
const TRACE_REGISTRY_KEY = 'sre_trace_registry';

/**
 * Generate unique IDs for tracking
 */
export function generateTraceId(): string {
  return `TR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateFixId(): string {
  return `FIX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateErrorFingerprint(message: string, stack?: string): string {
  // Simple fingerprint from message + first line of stack
  const base = message + (stack ? stack.split('\n')[0] : '');
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `ERR-${Math.abs(hash).toString(36)}`;
}

/**
 * Initialize trace context for a new error
 */
export function initTraceContext(
  errorMessage: string,
  sentryEventId?: string,
  severity: TraceContext['severity'] = 'WARNING',
  environment: string = 'unknown'
): TraceContext {
  const now = new Date().toISOString();
  
  return {
    errorId: generateErrorFingerprint(errorMessage),
    sentryEventId,
    fixId: generateFixId(),
    status: 'detected',
    detectedAt: now,
    errorType: classifyError(errorMessage),
    severity,
    environment,
    decisions: [{
      timestamp: now,
      actor: 'system',
      action: 'error_detected',
      reason: `Error detected: ${errorMessage.substring(0, 100)}`,
    }],
  };
}

/**
 * Classify error type from message
 */
function classifyError(message: string): string {
  if (message.includes('undefined') || message.includes('null')) {
    return 'UNDEFINED_ACCESS';
  }
  if (message.includes('fetch') || message.includes('network')) {
    return 'NETWORK_ERROR';
  }
  if (message.includes('is not a function')) {
    return 'TYPE_ERROR';
  }
  if (message.includes('JSON') || message.includes('parse')) {
    return 'JSON_ERROR';
  }
  if (message.includes('is not defined')) {
    return 'REFERENCE_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Update trace context with fix generation
 */
export function traceFixGenerated(
  context: TraceContext,
  confidence: number,
  patchSize: number
): TraceContext {
  const now = new Date().toISOString();
  
  return {
    ...context,
    status: 'fix-generated',
    fixedAt: now,
    decisions: [
      ...context.decisions,
      {
        timestamp: now,
        actor: 'system',
        action: 'fix_generated',
        reason: `AI fix generated (confidence: ${confidence.toFixed(2)}, ${patchSize} lines)`,
        metadata: { confidence, patchSize },
      },
    ],
  };
}

/**
 * Update trace context with PR creation
 */
export function tracePRCreated(
  context: TraceContext,
  prUrl: string,
  prNumber: number
): TraceContext {
  const now = new Date().toISOString();
  
  return {
    ...context,
    status: 'pr-created',
    prUrl,
    prNumber,
    decisions: [
      ...context.decisions,
      {
        timestamp: now,
        actor: 'system',
        action: 'pr_created',
        reason: `GitHub PR #${prNumber} created`,
        metadata: { prUrl, prNumber },
      },
    ],
  };
}

/**
 * Update trace context when manual review is required
 */
export function traceManualReview(
  context: TraceContext,
  reason: string
): TraceContext {
  const now = new Date().toISOString();
  
  return {
    ...context,
    status: 'manual-review',
    decisions: [
      ...context.decisions,
      {
        timestamp: now,
        actor: 'circuit-breaker',
        action: 'manual_review_required',
        reason,
      },
    ],
  };
}

/**
 * Update trace context when circuit breaker blocks
 */
export function traceCircuitBreakerBlocked(
  context: TraceContext,
  validationResult: any
): TraceContext {
  const now = new Date().toISOString();
  
  return {
    ...context,
    status: 'manual-review',
    decisions: [
      ...context.decisions,
      {
        timestamp: now,
        actor: 'circuit-breaker',
        action: 'blocked_by_circuit_breaker',
        reason: validationResult.reason,
        metadata: { checks: validationResult.checks },
      },
    ],
  };
}

/**
 * Create telemetry event for trace context
 */
export function createTracedTelemetryEvent(
  eventType: TracedTelemetryEvent['eventType'],
  context: TraceContext,
  duration?: number
): TracedTelemetryEvent {
  return {
    eventType,
    traceContext: context,
    metadata: {
      originalErrorId: context.errorId,
      fixId: context.fixId,
      status: context.status,
      duration,
    },
    timestamp: Date.now(),
  };
}

/**
 * Store trace context in localStorage (for session persistence)
 */
export function storeTraceContext(context: TraceContext): void {
  if (typeof window === 'undefined') return;
  
  try {
    const registry = getTraceRegistry();
    registry[context.fixId] = context;
    localStorage.setItem(TRACE_REGISTRY_KEY, JSON.stringify(registry));
  } catch (e) {
    console.error('[TRACEABILITY] Failed to store context:', e);
  }
}

/**
 * Retrieve trace registry
 */
export function getTraceRegistry(): Record<string, TraceContext> {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(TRACE_REGISTRY_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Get trace context by fix ID
 */
export function getTraceContext(fixId: string): TraceContext | null {
  const registry = getTraceRegistry();
  return registry[fixId] || null;
}

/**
 * Get trace context by error ID (finds most recent)
 */
export function getTraceContextByError(errorId: string): TraceContext | null {
  const registry = getTraceRegistry();
  const contexts = Object.values(registry);
  
  // Find by error ID, sort by detection time (most recent first)
  const matches = contexts
    .filter(c => c.errorId === errorId)
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  
  return matches[0] || null;
}

/**
 * Get trace summary for Slack message
 */
export function getTraceSummary(context: TraceContext): string {
  const parts = [
    `*Error ID:* \`${context.errorId}\``,
    `*Fix ID:* \`${context.fixId}\``,
  ];
  
  if (context.sentryEventId) {
    parts.push(`*Sentry:* <https://sentry.io/.../${context.sentryEventId}|View in Sentry>`);
  }
  
  if (context.prUrl) {
    parts.push(`*PR:* <${context.prUrl}|#${context.prNumber}>`);
  }
  
  parts.push(`*Status:* ${context.status}`);
  
  return parts.join('\n');
}

/**
 * Get trace summary for GitHub PR description
 */
export function getTraceDescriptionForPR(context: TraceContext): string {
  const lines = [
    '## 🤖 Auto-Fix Metadata',
    '',
    '| Field | Value |',
    '|-------|-------|',
    `| Error ID | \`${context.errorId}\` |`,
    `| Fix ID | \`${context.fixId}\` |`,
  ];
  
  if (context.sentryEventId) {
    lines.push(`| Sentry Event | \`${context.sentryEventId}\` |`);
  }
  
  lines.push(
    `| Error Type | ${context.errorType} |`,
    `| Severity | ${context.severity} |`,
    `| Environment | ${context.environment} |`,
    `| Detected At | ${context.detectedAt} |`,
    '',
    '## Audit Trail',
    ''
  );
  
  context.decisions.forEach(d => {
    const actor = d.actor === 'system' ? '🤖' : d.actor === 'circuit-breaker' ? '🛡️' : '👤';
    lines.push(`- ${actor} **${d.action}** (${new Date(d.timestamp).toLocaleString()})`);
    if (d.reason) {
      lines.push(`  - ${d.reason}`);
    }
  });
  
  return lines.join('\n');
}

/**
 * Generate correlation ID for distributed tracing
 */
export function generateCorrelationId(): string {
  return `CORR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Clean old traces (call periodically)
 */
export function cleanupOldTraces(maxAgeHours: number = 24): void {
  if (typeof window === 'undefined') return;
  
  try {
    const registry = getTraceRegistry();
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    
    const cleaned: Record<string, TraceContext> = {};
    
    Object.entries(registry).forEach(([id, context]) => {
      const age = now - new Date(context.detectedAt).getTime();
      if (age < maxAgeMs) {
        cleaned[id] = context;
      }
    });
    
    localStorage.setItem(TRACE_REGISTRY_KEY, JSON.stringify(cleaned));
    
    const removed = Object.keys(registry).length - Object.keys(cleaned).length;
    if (removed > 0) {
      console.log(`[TRACEABILITY] Cleaned up ${removed} old traces`);
    }
  } catch (e) {
    console.error('[TRACEABILITY] Cleanup failed:', e);
  }
}

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).traceability = {
    getRegistry: getTraceRegistry,
    getContext: getTraceContext,
    getByError: getTraceContextByError,
    cleanup: cleanupOldTraces,
  };
}
