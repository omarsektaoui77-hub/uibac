/**
 * Auto-Learning Engine for Cognitive SRE System
 * 
 * Tracks fix outcomes, learns from success/failure, and improves
 * patch accuracy over time using reinforcement learning principles.
 * 
 * Features:
 * - Fix outcome tracking (success/rollback)
 * - Confidence weight adjustment based on results
 * - Pattern penalization for failed fixes
 * - Fix quality scoring
 * - Historical trend analysis
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Fix outcome data model */
export interface FixOutcome {
  readonly error_id: string;
  readonly error_fingerprint: string;
  readonly root_cause: string;
  readonly patch: string;
  readonly confidence: number;
  readonly result: 'success' | 'rollback' | 'pending';
  readonly metrics: {
    readonly error_rate_before: number;
    readonly error_rate_after: number;
    readonly latency_before_ms: number;
    readonly latency_after_ms: number;
    readonly canary_duration_ms: number;
  };
  readonly timestamp: number;
  readonly tenant_id?: string;
  readonly file_path: string;
  readonly fix_type: 'null_check' | 'error_boundary' | 'async_handling' | 'type_guard' | 'other';
}

/** Learning pattern weights */
interface PatternWeight {
  readonly root_cause_hash: string;
  readonly weight: number;              // 0.0 - 2.0
  readonly success_count: number;
  readonly failure_count: number;
  readonly total_attempts: number;
  readonly success_rate: number;        // 0.0 - 1.0
  readonly last_updated: number;
  readonly average_confidence: number;
}

/** Fix quality score */
export interface FixQualityScore {
  readonly score: number;               // 0-100
  readonly reliability: number;         // 0-100 (success rate)
  readonly performance_impact: number;   // -50 to +50 (latency change)
  readonly stability_impact: number;     // -50 to +50 (error rate change)
  readonly confidence_trend: 'improving' | 'stable' | 'declining';
}

/** Learning statistics */
export interface LearningStats {
  readonly total_fixes: number;
  readonly successful_fixes: number;
  readonly rolled_back_fixes: number;
  readonly overall_success_rate: number;
  readonly patterns_learned: number;
  readonly average_quality_score: number;
  readonly improvement_trend: number;    // % change over last 30 days
}

/** Historical trend data point */
interface TrendDataPoint {
  readonly timestamp: number;
  readonly success_rate: number;
  readonly avg_quality_score: number;
  readonly fixes_count: number;
}

// ============================================================================
// IN-MEMORY STORAGE (Production: Use Redis/Database)
// ============================================================================

const fixOutcomes: FixOutcome[] = [];
const patternWeights = new Map<string, PatternWeight>();
const trendHistory: TrendDataPoint[] = [];

// ============================================================================
// CORE LEARNING FUNCTIONS
// ============================================================================

/**
 * Record a fix outcome for learning
 * Called after canary deployment completes
 */
export function recordFixOutcome(outcome: FixOutcome): void {
  // Store outcome
  fixOutcomes.push(outcome);
  
  // Trim to last 1000 outcomes to prevent memory bloat
  if (fixOutcomes.length > 1000) {
    fixOutcomes.shift();
  }
  
  // Update pattern weights based on result
  updatePatternWeight(outcome);
  
  // Update trend history
  updateTrendHistory();
  
  console.log(`[LEARNING] Recorded ${outcome.result} outcome for ${outcome.error_id}`);
}

/**
 * Update pattern weights based on fix outcome
 * Reinforcement learning: reward success, penalize failure
 */
function updatePatternWeight(outcome: FixOutcome): void {
  const rootCauseHash = hashString(outcome.root_cause);
  const existing = patternWeights.get(rootCauseHash);
  
  if (existing) {
    // Update existing pattern
    const isSuccess = outcome.result === 'success';
    const newSuccessCount = existing.success_count + (isSuccess ? 1 : 0);
    const newFailureCount = existing.failure_count + (isSuccess ? 0 : 1);
    const newTotal = existing.total_attempts + 1;
    const newSuccessRate = newSuccessCount / newTotal;
    
    // Adjust weight: success increases, failure decreases
    // Weight range: 0.1 (very unreliable) to 2.0 (very reliable)
    const weightDelta = isSuccess ? 0.1 : -0.2;
    const newWeight = Math.max(0.1, Math.min(2.0, existing.weight + weightDelta));
    
    // Calculate average confidence
    const newAvgConfidence = 
      (existing.average_confidence * existing.total_attempts + outcome.confidence) / newTotal;
    
    patternWeights.set(rootCauseHash, {
      ...existing,
      weight: newWeight,
      success_count: newSuccessCount,
      failure_count: newFailureCount,
      total_attempts: newTotal,
      success_rate: newSuccessRate,
      last_updated: Date.now(),
      average_confidence: newAvgConfidence,
    });
  } else {
    // Create new pattern entry
    const isSuccess = outcome.result === 'success';
    patternWeights.set(rootCauseHash, {
      root_cause_hash: rootCauseHash,
      weight: isSuccess ? 1.1 : 0.8,  // Start slightly above/below neutral
      success_count: isSuccess ? 1 : 0,
      failure_count: isSuccess ? 0 : 1,
      total_attempts: 1,
      success_rate: isSuccess ? 1.0 : 0.0,
      last_updated: Date.now(),
      average_confidence: outcome.confidence,
    });
  }
}

/**
 * Update trend history for analytics
 */
function updateTrendHistory(): void {
  const now = Date.now();
  const last24Hours = now - 24 * 60 * 60 * 1000;
  
  // Get outcomes from last 24 hours
  const recentOutcomes = fixOutcomes.filter(o => o.timestamp > last24Hours);
  const completedOutcomes = recentOutcomes.filter(o => o.result !== 'pending');
  
  if (completedOutcomes.length === 0) return;
  
  const successCount = completedOutcomes.filter(o => o.result === 'success').length;
  const successRate = successCount / completedOutcomes.length;
  
  // Calculate average quality score
  const avgQuality = completedOutcomes.reduce((sum, o) => {
    const score = calculateQualityScoreInternal(o);
    return sum + score.score;
  }, 0) / completedOutcomes.length;
  
  trendHistory.push({
    timestamp: now,
    success_rate: successRate,
    avg_quality_score: avgQuality,
    fixes_count: completedOutcomes.length,
  });
  
  // Keep last 90 days of history
  const maxHistory = 90;
  if (trendHistory.length > maxHistory) {
    trendHistory.shift();
  }
}

/**
 * Get adjusted confidence for a fix based on learning
 * Multiplies original confidence by pattern weight
 */
export function getAdjustedConfidence(rootCause: string, originalConfidence: number): number {
  const rootCauseHash = hashString(rootCause);
  const pattern = patternWeights.get(rootCauseHash);
  
  if (!pattern) {
    // No learning data yet, use original with slight penalty
    return originalConfidence * 0.95;
  }
  
  // Adjust confidence by pattern weight
  // If pattern has high success rate, boost confidence
  // If pattern has failures, reduce confidence
  const adjusted = originalConfidence * pattern.weight;
  
  // Cap at 0.99 to never reach 100% auto-approval without review
  return Math.min(0.99, adjusted);
}

/**
 * Calculate quality score for a fix
 */
export function calculateFixQuality(errorId: string): FixQualityScore | null {
  const outcomes = fixOutcomes.filter(o => o.error_id === errorId);
  if (outcomes.length === 0) return null;
  
  // Use most recent outcome
  const latest = outcomes[outcomes.length - 1];
  return calculateQualityScoreInternal(latest);
}

function calculateQualityScoreInternal(outcome: FixOutcome): FixQualityScore {
  const rootCauseHash = hashString(outcome.root_cause);
  const pattern = patternWeights.get(rootCauseHash);
  
  // Reliability: based on success rate of similar patterns
  const reliability = pattern ? pattern.success_rate * 100 : 50;
  
  // Performance impact: latency change
  const latencyDelta = outcome.metrics.latency_after_ms - outcome.metrics.latency_before_ms;
  const performanceImpact = Math.max(-50, Math.min(50, -latencyDelta / 10));
  
  // Stability impact: error rate change
  const errorRateDelta = outcome.metrics.error_rate_after - outcome.metrics.error_rate_before;
  const stabilityImpact = Math.max(-50, Math.min(50, -errorRateDelta * 100));
  
  // Confidence trend
  let confidenceTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (pattern && pattern.total_attempts > 3) {
    if (pattern.weight > 1.2) confidenceTrend = 'improving';
    else if (pattern.weight < 0.9) confidenceTrend = 'declining';
  }
  
  // Overall score (0-100)
  const score = Math.max(0, Math.min(100, 
    reliability * 0.5 + 
    (50 + performanceImpact) * 0.25 + 
    (50 + stabilityImpact) * 0.25
  ));
  
  return {
    score: Math.round(score),
    reliability: Math.round(reliability * 100) / 100,
    performance_impact: Math.round(performanceImpact * 100) / 100,
    stability_impact: Math.round(stabilityImpact * 100) / 100,
    confidence_trend: confidenceTrend,
  };
}

// ============================================================================
// ANALYTICS & INSIGHTS
// ============================================================================

/**
 * Get learning statistics
 */
export function getLearningStats(): LearningStats {
  const completedOutcomes = fixOutcomes.filter(o => o.result !== 'pending');
  const successfulOutcomes = completedOutcomes.filter(o => o.result === 'success');
  
  const totalFixes = completedOutcomes.length;
  const successRate = totalFixes > 0 ? successfulOutcomes.length / totalFixes : 0;
  
  // Calculate improvement trend (compare last 7 days to previous 7 days)
  const now = Date.now();
  const last7Days = trendHistory.filter(t => t.timestamp > now - 7 * 24 * 60 * 60 * 1000);
  const previous7Days = trendHistory.filter(t => 
    t.timestamp > now - 14 * 24 * 60 * 60 * 1000 &&
    t.timestamp <= now - 7 * 24 * 60 * 60 * 1000
  );
  
  const currentRate = last7Days.length > 0 
    ? last7Days.reduce((s, t) => s + t.success_rate, 0) / last7Days.length 
    : 0;
  const previousRate = previous7Days.length > 0
    ? previous7Days.reduce((s, t) => s + t.success_rate, 0) / previous7Days.length
    : currentRate;
  
  const improvementTrend = previousRate > 0 
    ? ((currentRate - previousRate) / previousRate) * 100 
    : 0;
  
  // Average quality score
  const avgQuality = completedOutcomes.length > 0
    ? completedOutcomes.reduce((sum, o) => sum + calculateQualityScoreInternal(o).score, 0) / completedOutcomes.length
    : 0;
  
  return {
    total_fixes: totalFixes,
    successful_fixes: successfulOutcomes.length,
    rolled_back_fixes: completedOutcomes.filter(o => o.result === 'rollback').length,
    overall_success_rate: Math.round(successRate * 1000) / 10,
    patterns_learned: patternWeights.size,
    average_quality_score: Math.round(avgQuality * 10) / 10,
    improvement_trend: Math.round(improvementTrend * 10) / 10,
  };
}

/**
 * Get trend history for dashboard
 */
export function getTrendHistory(days: number = 30): TrendDataPoint[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return trendHistory.filter(t => t.timestamp > cutoff);
}

/**
 * Get top performing fix patterns
 */
export function getTopPatterns(limit: number = 10): Array<{
  root_cause_hash: string;
  success_rate: number;
  weight: number;
  total_attempts: number;
}> {
  return Array.from(patternWeights.values())
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map(p => ({
      root_cause_hash: p.root_cause_hash,
      success_rate: p.success_rate,
      weight: p.weight,
      total_attempts: p.total_attempts,
    }));
}

/**
 * Check if a fix pattern should be reused
 * Returns reuse recommendation with confidence
 */
export function shouldReusePattern(
  rootCause: string,
  minSuccessRate: number = 0.8
): { reuse: boolean; confidence: number; reason: string } {
  const rootCauseHash = hashString(rootCause);
  const pattern = patternWeights.get(rootCauseHash);
  
  if (!pattern) {
    return {
      reuse: false,
      confidence: 0,
      reason: 'No learning data available for this pattern',
    };
  }
  
  if (pattern.total_attempts < 3) {
    return {
      reuse: false,
      confidence: pattern.average_confidence * 0.5,
      reason: 'Insufficient sample size (minimum 3 attempts required)',
    };
  }
  
  if (pattern.success_rate < minSuccessRate) {
    return {
      reuse: false,
      confidence: pattern.average_confidence * pattern.weight,
      reason: `Success rate too low (${(pattern.success_rate * 100).toFixed(1)}% < ${minSuccessRate * 100}%)`,
    };
  }
  
  return {
    reuse: true,
    confidence: Math.min(0.99, pattern.average_confidence * pattern.weight),
    reason: `Proven pattern with ${(pattern.success_rate * 100).toFixed(1)}% success rate`,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Simple string hash for root cause identification
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Get all outcomes for a specific error
 */
export function getErrorOutcomes(errorId: string): FixOutcome[] {
  return fixOutcomes.filter(o => o.error_id === errorId);
}

/**
 * Reset learning data (for testing)
 */
export function resetLearningData(): void {
  fixOutcomes.length = 0;
  patternWeights.clear();
  trendHistory.length = 0;
}

/**
 * Export learning data for backup
 */
export function exportLearningData(): {
  outcomes: FixOutcome[];
  patterns: PatternWeight[];
  trends: TrendDataPoint[];
} {
  return {
    outcomes: [...fixOutcomes],
    patterns: Array.from(patternWeights.values()),
    trends: [...trendHistory],
  };
}

// ============================================================================
// DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).learningEngine = {
    recordFixOutcome,
    getLearningStats,
    getAdjustedConfidence,
    shouldReusePattern,
    exportLearningData,
    resetLearningData,
  };
}
