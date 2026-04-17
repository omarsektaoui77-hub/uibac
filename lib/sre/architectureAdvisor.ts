/**
 * Architecture Advisor
 * 
 * Generates structural improvement proposals based on detected patterns.
 * Suggests architectural changes (not just bug fixes):
 * - Caching layers for latency
 * - Batching for DB calls
 * - Code splitting for large components
 * - Circuit breakers for retry loops
 * 
 * Generates ArchitectureProposals with risk assessment.
 */

import { SystemPattern, getPatterns, getCriticalPatterns } from './patternDetection';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Architecture improvement proposal */
export interface ArchitectureProposal {
  readonly id: string;
  readonly pattern_id: string;          // Links to detected pattern
  readonly title: string;
  readonly description: string;
  readonly type: 'caching' | 'batching' | 'splitting' | 'circuit_breaker' | 'memoization' | 'lazy_loading' | 'compression' | 'connection_pooling';
  readonly expected_impact: number;     // 0-100 estimated improvement
  readonly risk_level: 'low' | 'medium' | 'high';
  readonly changes: string[];           // Specific file/code changes
  readonly affected_files: string[];
  readonly estimated_effort_hours: number;
  readonly benefits: string[];
  readonly risks: string[];
  readonly prerequisites: string[];
  readonly rollback_plan: string;
  readonly confidence: number;          // 0-1
  readonly generated_at: number;
}

/** Proposal evaluation result */
export interface ProposalEvaluation {
  readonly proposal_id: string;
  readonly approved: boolean;
  readonly reason: string;
  readonly requires_manual_review: boolean;
  readonly auto_apply_eligible: boolean;
}

/** Architecture decision record */
interface ArchitectureDecision {
  readonly proposal_id: string;
  readonly decision: 'approved' | 'rejected' | 'pending_review';
  readonly decided_at: number;
  readonly decided_by: 'system' | 'human';
  readonly reason: string;
}

// ============================================================================
// PROPOSAL GENERATORS
// ============================================================================

/**
 * Generate architecture proposals from detected patterns
 */
export function generateProposals(): ArchitectureProposal[] {
  const patterns = getCriticalPatterns();
  const proposals: ArchitectureProposal[] = [];
  
  for (const pattern of patterns) {
    const proposal = createProposalFromPattern(pattern);
    if (proposal) {
      proposals.push(proposal);
    }
  }
  
  return proposals.sort((a, b) => b.expected_impact - a.expected_impact);
}

/**
 * Create proposal from a specific pattern
 */
function createProposalFromPattern(pattern: SystemPattern): ArchitectureProposal | null {
  switch (pattern.type) {
    case 'latency':
      return createCachingProposal(pattern);
    case 'failure_cluster':
      return createCircuitBreakerProposal(pattern);
    case 'retry_loop':
      return createCircuitBreakerProposal(pattern);
    case 'slow_render':
      return createSplittingProposal(pattern);
    case 'memory_leak':
      return createMemoizationProposal(pattern);
    default:
      return null;
  }
}

/**
 * Create caching layer proposal for latency issues
 */
function createCachingProposal(pattern: SystemPattern): ArchitectureProposal {
  const avgLatency = (pattern as any).metadata?.avg_latency_ms || 500;
  const estimatedImprovement = Math.min(80, (avgLatency - 100) / 5);
  
  return {
    id: `cache-${pattern.id}`,
    pattern_id: pattern.id,
    title: `Add Redis Caching for ${pattern.location}`,
    description: `Implement response caching to reduce API latency from ${avgLatency}ms to <100ms. ` +
      `Expected to handle ${Math.round(pattern.frequency * 0.8)} requests/hour from cache.`,
    type: 'caching',
    expected_impact: Math.round(estimatedImprovement),
    risk_level: 'low',
    changes: [
      `Add Redis client to ${pattern.location}`,
      'Implement cache-aside pattern',
      'Add cache invalidation on data updates',
      'Set TTL to 5 minutes for dynamic data',
    ],
    affected_files: [
      pattern.location,
      'lib/cache/redis.ts',
    ],
    estimated_effort_hours: 4,
    benefits: [
      `Reduce latency by ~${Math.round(estimatedImprovement)}%`,
      'Decrease server load',
      'Improve user experience',
    ],
    risks: [
      'Cache staleness for rapidly changing data',
      'Additional Redis dependency',
    ],
    prerequisites: [
      'Redis instance available',
      'Cache key naming convention defined',
    ],
    rollback_plan: 'Disable cache reads, revert to direct DB queries. Cache can be cleared instantly.',
    confidence: pattern.confidence * 0.9,
    generated_at: Date.now(),
  };
}

/**
 * Create circuit breaker proposal for failure/retry patterns
 */
function createCircuitBreakerProposal(pattern: SystemPattern): ArchitectureProposal {
  const errorRate = (pattern as any).metadata?.error_rate || 0.1;
  const estimatedImprovement = Math.min(90, errorRate * 500);
  
  return {
    id: `cb-${pattern.id}`,
    pattern_id: pattern.id,
    title: `Add Circuit Breaker to ${pattern.location}`,
    description: `Implement circuit breaker pattern to prevent cascade failures. ` +
      `Current error rate: ${(errorRate * 100).toFixed(1)}%. ` +
      `Will fail fast after 5 consecutive errors with 30s cooldown.`,
    type: 'circuit_breaker',
    expected_impact: Math.round(estimatedImprovement),
    risk_level: 'low',
    changes: [
      `Wrap external calls in circuit breaker`,
      'Add fallback response handler',
      'Implement health check endpoint',
      'Add circuit state metrics',
    ],
    affected_files: [
      pattern.location,
      'lib/resilience/circuitBreaker.ts',
    ],
    estimated_effort_hours: 3,
    benefits: [
      'Prevent cascade failures',
      'Fail fast improves response time',
      'Graceful degradation',
      'Automatic recovery',
    ],
    risks: [
      'Temporary unavailability during circuit open',
      'Requires fallback logic',
    ],
    prerequisites: [
      'Circuit breaker library installed',
      'Monitoring for circuit state',
    ],
    rollback_plan: 'Remove circuit breaker wrapper, revert to direct calls. No data changes.',
    confidence: pattern.confidence * 0.95,
    generated_at: Date.now(),
  };
}

/**
 * Create code splitting proposal for slow renders
 */
function createSplittingProposal(pattern: SystemPattern): ArchitectureProposal {
  const renderTime = (pattern as any).metadata?.render_time_ms || 150;
  const estimatedImprovement = Math.min(70, (renderTime - 50) / 2);
  
  return {
    id: `split-${pattern.id}`,
    pattern_id: pattern.id,
    title: `Code Split ${pattern.location}`,
    description: `Split large component into smaller chunks to reduce initial render time ` +
      `from ${renderTime}ms to <50ms. Use dynamic imports for secondary content.`,
    type: 'splitting',
    expected_impact: Math.round(estimatedImprovement),
    risk_level: 'medium',
    changes: [
      'Identify secondary content for lazy loading',
      'Add React.lazy() for non-critical sections',
      'Implement Suspense boundaries',
      'Add loading states',
    ],
    affected_files: [
      pattern.location,
    ],
    estimated_effort_hours: 6,
    benefits: [
      `Reduce initial render by ~${Math.round(estimatedImprovement)}%`,
      'Smaller initial bundle size',
      'Better Core Web Vitals',
    ],
    risks: [
      'Loading states needed for lazy content',
      'Potential layout shift',
      'SEO considerations for critical content',
    ],
    prerequisites: [
      'Analyze component dependencies',
      'Identify critical vs secondary content',
    ],
    rollback_plan: 'Revert dynamic imports to static imports. Bundle size increases but functionality restored.',
    confidence: pattern.confidence * 0.8,
    generated_at: Date.now(),
  };
}

/**
 * Create memoization proposal for memory leaks
 */
function createMemoizationProposal(pattern: SystemPattern): ArchitectureProposal {
  const growthRate = (pattern as any).metadata?.memory_growth_rate || 100;
  
  return {
    id: `memo-${pattern.id}`,
    pattern_id: pattern.id,
    title: `Fix Memory Leak in ${pattern.location}`,
    description: `Add React.memo and useMemo hooks to prevent unnecessary re-renders ` +
      `causing ${growthRate}MB/hour memory growth. Check for event listener leaks.`,
    type: 'memoization',
    expected_impact: 85,
    risk_level: 'low',
    changes: [
      'Add React.memo for pure components',
      'Use useMemo for expensive calculations',
      'Add cleanup for useEffect hooks',
      'Remove unused event listeners',
    ],
    affected_files: [
      pattern.location,
    ],
    estimated_effort_hours: 3,
    benefits: [
      'Eliminate memory leak',
      'Improve performance',
      'Reduce browser crashes',
    ],
    risks: [
      'Over-memoization can cause stale data',
    ],
    prerequisites: [
      'Profile with React DevTools',
      'Identify specific leak sources',
    ],
    rollback_plan: 'Remove memoization wrappers. May reintroduce memory leak but functionality preserved.',
    confidence: pattern.confidence * 0.85,
    generated_at: Date.now(),
  };
}

// ============================================================================
// PROPOSAL EVALUATION
// ============================================================================

/**
 * Evaluate proposal for safety and auto-approval eligibility
 */
export function evaluateProposal(proposal: ArchitectureProposal): ProposalEvaluation {
  // High-risk proposals require manual review
  if (proposal.risk_level === 'high') {
    return {
      proposal_id: proposal.id,
      approved: false,
      reason: 'High risk proposal requires manual review',
      requires_manual_review: true,
      auto_apply_eligible: false,
    };
  }
  
  // Check confidence threshold
  if (proposal.confidence < 0.8) {
    return {
      proposal_id: proposal.id,
      approved: false,
      reason: 'Low confidence (< 80%), manual review required',
      requires_manual_review: true,
      auto_apply_eligible: false,
    };
  }
  
  // Check estimated impact
  if (proposal.expected_impact < 30) {
    return {
      proposal_id: proposal.id,
      approved: false,
      reason: 'Low estimated impact (< 30%), not worth the risk',
      requires_manual_review: false,
      auto_apply_eligible: false,
    };
  }
  
  // Check for blocked file types
  const hasBlockedFile = proposal.affected_files.some(f => 
    f.includes('auth') || 
    f.includes('security') || 
    f.includes('payment') ||
    f.includes('.env')
  );
  
  if (hasBlockedFile) {
    return {
      proposal_id: proposal.id,
      approved: false,
      reason: 'Proposal affects protected system files',
      requires_manual_review: true,
      auto_apply_eligible: false,
    };
  }
  
  // Auto-approve low-risk, high-confidence proposals
  if (proposal.risk_level === 'low' && proposal.confidence >= 0.85) {
    return {
      proposal_id: proposal.id,
      approved: true,
      reason: 'Low risk, high confidence - eligible for auto-apply',
      requires_manual_review: false,
      auto_apply_eligible: true,
    };
  }
  
  // Medium risk - manual review
  return {
    proposal_id: proposal.id,
    approved: false,
    reason: 'Medium risk proposal requires approval',
    requires_manual_review: true,
    auto_apply_eligible: false,
  };
}

/**
 * Get all proposals pending review
 */
export function getPendingProposals(): ArchitectureProposal[] {
  return generateProposals().filter(p => {
    const evaluation = evaluateProposal(p);
    return evaluation.requires_manual_review;
  });
}

/**
 * Get auto-apply eligible proposals
 */
export function getAutoApplyProposals(): ArchitectureProposal[] {
  return generateProposals().filter(p => {
    const evaluation = evaluateProposal(p);
    return evaluation.auto_apply_eligible;
  });
}

/**
 * Get proposal statistics
 */
export function getProposalStats(): {
  total: number;
  auto_eligible: number;
  requires_review: number;
  by_risk: Record<'low' | 'medium' | 'high', number>;
  avg_expected_impact: number;
} {
  const proposals = generateProposals();
  
  const byRisk: Record<'low' | 'medium' | 'high', number> = {
    low: 0,
    medium: 0,
    high: 0,
  };
  
  let autoEligible = 0;
  let requiresReview = 0;
  
  for (const p of proposals) {
    byRisk[p.risk_level]++;
    const eval_ = evaluateProposal(p);
    if (eval_.auto_apply_eligible) autoEligible++;
    if (eval_.requires_manual_review) requiresReview++;
  }
  
  const avgImpact = proposals.length > 0
    ? proposals.reduce((s, p) => s + p.expected_impact, 0) / proposals.length
    : 0;
  
  return {
    total: proposals.length,
    auto_eligible: autoEligible,
    requires_review: requiresReview,
    by_risk: byRisk,
    avg_expected_impact: Math.round(avgImpact * 10) / 10,
  };
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format proposal for display
 */
export function formatProposal(proposal: ArchitectureProposal): string {
  return `
🏗️ **${proposal.title}**

**Description:** ${proposal.description}

**Type:** ${proposal.type}
**Risk Level:** ${proposal.risk_level.toUpperCase()}
**Expected Impact:** ${proposal.expected_impact}/100
**Effort:** ${proposal.estimated_effort_hours} hours
**Confidence:** ${Math.round(proposal.confidence * 100)}%

**Changes:**
${proposal.changes.map(c => `- ${c}`).join('\n')}

**Benefits:**
${proposal.benefits.map(b => `✅ ${b}`).join('\n')}

**Risks:**
${proposal.risks.map(r => `⚠️ ${r}`).join('\n')}

**Rollback:** ${proposal.rollback_plan}
`;
}

// ============================================================================
// DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).architectureAdvisor = {
    generateProposals,
    evaluateProposal,
    getPendingProposals,
    getAutoApplyProposals,
    getProposalStats,
    formatProposal,
  };
}
