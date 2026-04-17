/**
 * Stability Scoring Engine
 * 
 * Computes real-time stability scores (0-100) based on:
 * - Error rate
 * - Rollback rate
 * - Latency spikes
 * - Auto-fix success rate
 * - System uptime
 * 
 * Score updates in real-time and feeds into investor dashboard.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Stability score components */
interface StabilityComponents {
  readonly error_rate_score: number;      // 0-25 points
  readonly rollback_score: number;        // 0-25 points
  readonly latency_score: number;          // 0-25 points
  readonly fix_success_score: number;      // 0-25 points
}

/** Stability score with breakdown */
export interface StabilityScore {
  readonly overall: number;                // 0-100
  readonly components: StabilityComponents;
  readonly grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  readonly status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  readonly timestamp: number;
  readonly trend: 'improving' | 'stable' | 'declining';
  readonly recommendation?: string;
}

/** Raw metrics for scoring */
interface SystemMetrics {
  readonly error_rate: number;             // 0-1 (percentage)
  readonly rollback_rate: number;          // 0-1 (percentage of fixes rolled back)
  readonly latency_p95_ms: number;        // 95th percentile latency
  readonly latency_baseline_ms: number;     // Expected baseline latency
  readonly fix_success_rate: number;      // 0-1 (auto-fix success rate)
  readonly uptime_percentage: number;       // 0-100
}

/** Historical score entry */
interface ScoreHistoryEntry {
  readonly timestamp: number;
  readonly score: number;
  readonly error_rate: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const WEIGHTS = {
  error_rate: 25,      // Max points for low error rate
  rollback: 25,      // Max points for low rollback rate
  latency: 25,       // Max points for good latency
  fix_success: 25,   // Max points for high fix success
} as const;

const THRESHOLDS = {
  error_rate: {
    excellent: 0.001,   // 0.1%
    good: 0.01,        // 1%
    fair: 0.05,         // 5%
    poor: 0.10,         // 10%
  },
  rollback: {
    excellent: 0.05,    // 5%
    good: 0.10,        // 10%
    fair: 0.20,         // 20%
    poor: 0.30,         // 30%
  },
  latency_spike: {
    excellent: 1.1,     // 10% increase
    good: 1.25,         // 25% increase
    fair: 1.5,          // 50% increase
    poor: 2.0,          // 100% increase
  },
  fix_success: {
    excellent: 0.90,    // 90%
    good: 0.75,         // 75%
    fair: 0.50,         // 50%
    poor: 0.30,         // 30%
  },
} as const;

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

const scoreHistory: ScoreHistoryEntry[] = [];
let currentMetrics: SystemMetrics = {
  error_rate: 0,
  rollback_rate: 0,
  latency_p95_ms: 100,
  latency_baseline_ms: 100,
  fix_success_rate: 1,
  uptime_percentage: 100,
};

// ============================================================================
// CORE SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate real-time stability score
 * Formula: 100 - (error_rate * 50) - (rollback_rate * 30) - (latency_spike_factor * 20)
 */
export function calculateStabilityScore(
  metrics: Partial<SystemMetrics> = {}
): StabilityScore {
  // Merge with current metrics
  const merged: SystemMetrics = {
    ...currentMetrics,
    ...metrics,
  };
  
  // Calculate component scores
  const errorRateScore = calculateErrorRateScore(merged.error_rate);
  const rollbackScore = calculateRollbackScore(merged.rollback_rate);
  const latencyScore = calculateLatencyScore(
    merged.latency_p95_ms,
    merged.latency_baseline_ms
  );
  const fixSuccessScore = calculateFixSuccessScore(merged.fix_success_rate);
  
  // Calculate overall score
  const overall = Math.round(
    errorRateScore + 
    rollbackScore + 
    latencyScore + 
    fixSuccessScore
  );
  
  // Determine grade and status
  const grade = scoreToGrade(overall);
  const status = scoreToStatus(overall);
  const trend = calculateTrend(overall);
  const recommendation = generateRecommendation(overall, {
    error_rate: merged.error_rate,
    rollback_rate: merged.rollback_rate,
    fix_success_rate: merged.fix_success_rate,
  });
  
  // Store in history
  const result: StabilityScore = {
    overall: Math.max(0, Math.min(100, overall)),
    components: {
      error_rate_score: Math.round(errorRateScore * 10) / 10,
      rollback_score: Math.round(rollbackScore * 10) / 10,
      latency_score: Math.round(latencyScore * 10) / 10,
      fix_success_score: Math.round(fixSuccessScore * 10) / 10,
    },
    grade,
    status,
    timestamp: Date.now(),
    trend,
    recommendation,
  };
  
  scoreHistory.push({
    timestamp: result.timestamp,
    score: result.overall,
    error_rate: merged.error_rate,
  });
  
  // Trim history to last 24 hours (one entry per minute = 1440 entries)
  if (scoreHistory.length > 1440) {
    scoreHistory.shift();
  }
  
  return result;
}

/**
 * Calculate error rate component score (0-25 points)
 */
function calculateErrorRateScore(errorRate: number): number {
  if (errorRate <= THRESHOLDS.error_rate.excellent) {
    return WEIGHTS.error_rate;
  } else if (errorRate <= THRESHOLDS.error_rate.good) {
    return WEIGHTS.error_rate * 0.8;
  } else if (errorRate <= THRESHOLDS.error_rate.fair) {
    return WEIGHTS.error_rate * 0.5;
  } else if (errorRate <= THRESHOLDS.error_rate.poor) {
    return WEIGHTS.error_rate * 0.25;
  } else {
    return 0;
  }
}

/**
 * Calculate rollback rate component score (0-25 points)
 */
function calculateRollbackScore(rollbackRate: number): number {
  if (rollbackRate <= THRESHOLDS.rollback.excellent) {
    return WEIGHTS.rollback;
  } else if (rollbackRate <= THRESHOLDS.rollback.good) {
    return WEIGHTS.rollback * 0.8;
  } else if (rollbackRate <= THRESHOLDS.rollback.fair) {
    return WEIGHTS.rollback * 0.5;
  } else if (rollbackRate <= THRESHOLDS.rollback.poor) {
    return WEIGHTS.rollback * 0.25;
  } else {
    return 0;
  }
}

/**
 * Calculate latency component score (0-25 points)
 */
function calculateLatencyScore(p95: number, baseline: number): number {
  if (baseline === 0) return WEIGHTS.latency;
  
  const spikeFactor = p95 / baseline;
  
  if (spikeFactor <= THRESHOLDS.latency_spike.excellent) {
    return WEIGHTS.latency;
  } else if (spikeFactor <= THRESHOLDS.latency_spike.good) {
    return WEIGHTS.latency * 0.8;
  } else if (spikeFactor <= THRESHOLDS.latency_spike.fair) {
    return WEIGHTS.latency * 0.5;
  } else if (spikeFactor <= THRESHOLDS.latency_spike.poor) {
    return WEIGHTS.latency * 0.25;
  } else {
    return 0;
  }
}

/**
 * Calculate fix success rate component score (0-25 points)
 */
function calculateFixSuccessScore(successRate: number): number {
  if (successRate >= THRESHOLDS.fix_success.excellent) {
    return WEIGHTS.fix_success;
  } else if (successRate >= THRESHOLDS.fix_success.good) {
    return WEIGHTS.fix_success * 0.8;
  } else if (successRate >= THRESHOLDS.fix_success.fair) {
    return WEIGHTS.fix_success * 0.5;
  } else if (successRate >= THRESHOLDS.fix_success.poor) {
    return WEIGHTS.fix_success * 0.25;
  } else {
    return 0;
  }
}

/**
 * Convert score to letter grade
 */
function scoreToGrade(score: number): StabilityScore['grade'] {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 85) return 'B';
  if (score >= 75) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Convert score to status
 */
function scoreToStatus(score: number): StabilityScore['status'] {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'critical';
}

/**
 * Calculate trend based on recent history
 */
function calculateTrend(currentScore: number): StabilityScore['trend'] {
  if (scoreHistory.length < 10) return 'stable';
  
  // Compare last 10 minutes to previous 10 minutes
  const recent = scoreHistory.slice(-10);
  const previous = scoreHistory.slice(-20, -10);
  
  if (previous.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((s, e) => s + e.score, 0) / recent.length;
  const previousAvg = previous.reduce((s, e) => s + e.score, 0) / previous.length;
  
  const change = recentAvg - previousAvg;
  
  if (change > 5) return 'improving';
  if (change < -5) return 'declining';
  return 'stable';
}

/**
 * Generate recommendation based on score
 */
function generateRecommendation(
  score: number,
  metrics: { error_rate: number; rollback_rate: number; fix_success_rate: number }
): string | undefined {
  if (score >= 90) {
    return 'System performing excellently. Continue current practices.';
  }
  
  if (metrics.error_rate > THRESHOLDS.error_rate.good) {
    return `High error rate detected (${(metrics.error_rate * 100).toFixed(2)}%). Investigate error sources.`;
  }
  
  if (metrics.rollback_rate > THRESHOLDS.rollback.good) {
    return `Rollback rate elevated (${(metrics.rollback_rate * 100).toFixed(1)}%). Review auto-fix safety thresholds.`;
  }
  
  if (metrics.fix_success_rate < THRESHOLDS.fix_success.good) {
    return `Fix success rate below target (${(metrics.fix_success_rate * 100).toFixed(1)}%). Improve patch generation quality.`;
  }
  
  return 'System stable but could improve. Monitor key metrics.';
}

// ============================================================================
// METRICS MANAGEMENT
// ============================================================================

/**
 * Update system metrics
 */
export function updateMetrics(metrics: Partial<SystemMetrics>): void {
  currentMetrics = {
    ...currentMetrics,
    ...metrics,
  };
}

/**
 * Get current metrics
 */
export function getCurrentMetrics(): SystemMetrics {
  return { ...currentMetrics };
}

/**
 * Record error for real-time tracking
 */
export function recordError(): void {
  // This would integrate with telemetry system
  // For now, update error rate slightly
  const newErrorRate = Math.min(1, currentMetrics.error_rate + 0.001);
  updateMetrics({ error_rate: newErrorRate });
}

/**
 * Record successful fix
 */
export function recordSuccessfulFix(): void {
  // Update success rate with exponential moving average
  const alpha = 0.1; // Smoothing factor
  const newSuccessRate = 
    currentMetrics.fix_success_rate * (1 - alpha) + alpha;
  updateMetrics({ fix_success_rate: newSuccessRate });
}

/**
 * Record rollback
 */
export function recordRollback(): void {
  // Update rollback rate
  const newRollbackRate = Math.min(1, currentMetrics.rollback_rate + 0.05);
  updateMetrics({ rollback_rate: newRollbackRate });
}

// ============================================================================
// HISTORY & ANALYTICS
// ============================================================================

/**
 * Get score history for time series charts
 */
export function getScoreHistory(minutes: number = 60): Array<{
  timestamp: number;
  score: number;
  error_rate: number;
}> {
  const cutoff = Date.now() - minutes * 60 * 1000;
  return scoreHistory
    .filter(h => h.timestamp > cutoff)
    .map(h => ({
      timestamp: h.timestamp,
      score: h.score,
      error_rate: h.error_rate,
    }));
}

/**
 * Get average score over time period
 */
export function getAverageScore(minutes: number = 60): number {
  const cutoff = Date.now() - minutes * 60 * 1000;
  const recent = scoreHistory.filter(h => h.timestamp > cutoff);
  
  if (recent.length === 0) return 100;
  
  return Math.round(
    recent.reduce((s, h) => s + h.score, 0) / recent.length
  );
}

/**
 * Get score distribution (for histogram)
 */
export function getScoreDistribution(): {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
  critical: number;
} {
  const distribution = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    critical: 0,
  };
  
  for (const entry of scoreHistory) {
    if (entry.score >= 90) distribution.excellent++;
    else if (entry.score >= 75) distribution.good++;
    else if (entry.score >= 60) distribution.fair++;
    else if (entry.score >= 40) distribution.poor++;
    else distribution.critical++;
  }
  
  return distribution;
}

// ============================================================================
// INVESTOR-FACING METRICS
// ============================================================================

/**
 * Get investor-ready stability summary
 */
export function getInvestorStabilitySummary(): {
  current_score: number;
  grade: string;
  trend: string;
  uptime_30d: number;
  avg_score_24h: number;
  improvement_week_over_week: number;
  key_insight: string;
} {
  const current = calculateStabilityScore();
  const avg24h = getAverageScore(24 * 60);
  const avg7d = getAverageScore(7 * 24 * 60);
  const avg14d = getAverageScore(14 * 24 * 60);
  
  // Calculate week-over-week improvement
  const improvement = avg14d > 0 
    ? ((avg7d - (avg14d - avg7d)) / (avg14d - avg7d)) * 100 
    : 0;
  
  // Generate insight
  let insight = '';
  if (current.overall >= 95) {
    insight = 'Exceptional stability. System demonstrates enterprise-grade reliability.';
  } else if (current.overall >= 85) {
    insight = 'Strong stability with minor optimization opportunities.';
  } else if (current.overall >= 70) {
    insight = 'Adequate stability. Address identified issues for improvement.';
  } else {
    insight = 'Stability concerns require immediate attention.';
  }
  
  return {
    current_score: current.overall,
    grade: current.grade,
    trend: current.trend,
    uptime_30d: currentMetrics.uptime_percentage,
    avg_score_24h: avg24h,
    improvement_week_over_week: Math.round(improvement * 10) / 10,
    key_insight: insight,
  };
}

// ============================================================================
// DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).stabilityScoring = {
    calculateStabilityScore,
    updateMetrics,
    getScoreHistory,
    getInvestorStabilitySummary,
  };
}
