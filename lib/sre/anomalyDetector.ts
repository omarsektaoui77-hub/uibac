/**
 * AI Anomaly Detection Engine
 * Adaptive intelligence for SRE operations
 * 
 * Detects unusual patterns using:
 * - Statistical analysis (not just fixed thresholds)
 * - Trend analysis
 * - Confidence scoring
 * - Historical baseline comparison
 * 
 * SAFETY: Read-only analysis, no destructive actions
 */

import { TelemetryEvent } from "@/lib/telemetry/eventQueue";

// Feature extraction types
export interface SystemFeatures {
  failure_rate: number;        // % of failing events
  avg_duration: number;      // Average event duration (ms)
  error_frequency: number;   // Errors per minute
  recent_failures: number;     // Failures in last window
  pattern_deviation: number;   // Deviation from baseline
  trend_direction: 'improving' | 'stable' | 'degrading';
  burst_intensity: number;     // Sudden spike magnitude
}

// Anomaly detection result
export interface AnomalyDetection {
  detected: boolean;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;          // 0.0 - 1.0
  reason: string;
  features: SystemFeatures;
  recommendations: string[];
  timestamp: number;
}

export type AnomalyType =
  | 'FAILURE_SPIKE'
  | 'LATENCY_DEGRADATION'
  | 'ERROR_BURST'
  | 'PATTERN_ANOMALY'
  | 'TREND_DEGRADATION'
  | 'STABILITY_DROP'
  | 'NO_ANOMALY';

// Historical baseline (adapts over time)
interface BaselineStats {
  avgFailureRate: number;
  avgDuration: number;
  stdDevDuration: number;
  sampleSize: number;
  lastUpdated: number;
}

// Store for historical data (in-memory for preview, could be persisted)
const baselineStore: Map<string, BaselineStats> = new Map();

/**
 * Extract features from recent telemetry events
 * Uses sliding window analysis for real-time insights
 */
export function extractFeatures(
  events: TelemetryEvent[],
  windowSize: number = 20
): SystemFeatures {
  const recent = events.slice(-windowSize);
  const now = Date.now();
  const timeWindow = 5 * 60 * 1000; // 5 minutes

  if (recent.length === 0) {
    return {
      failure_rate: 0,
      avg_duration: 0,
      error_frequency: 0,
      recent_failures: 0,
      pattern_deviation: 0,
      trend_direction: 'stable',
      burst_intensity: 0,
    };
  }

  // Calculate failure rate
  const failures = recent.filter(e => 
    e.metadata?.status === 'failed' || 
    e.eventType?.includes('FAIL') ||
    e.metadata?.error === true
  );
  const failure_rate = failures.length / recent.length;

  // Calculate average duration
  const durations = recent
    .map(e => e.metadata?.duration || e.metadata?.latency || 0)
    .filter(d => d > 0);
  const avg_duration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  // Error frequency (per 5 minutes)
  const recentTimeWindow = recent.filter(e => 
    (now - new Date(e.timestamp).getTime()) < timeWindow
  );
  const error_frequency = recentTimeWindow.filter(e =>
    e.metadata?.status === 'failed' || e.metadata?.error
  ).length;

  // Recent failures count
  const recent_failures = failures.length;

  // Pattern deviation from baseline
  const baseline = getBaseline('default');
  const pattern_deviation = baseline 
    ? Math.abs(failure_rate - baseline.avgFailureRate) / (baseline.avgFailureRate || 1)
    : 0;

  // Trend direction (compare first half vs second half)
  const half = Math.floor(recent.length / 2);
  const firstHalf = recent.slice(0, half);
  const secondHalf = recent.slice(half);
  
  const firstHalfFailures = firstHalf.filter(e => 
    e.metadata?.status === 'failed' || e.metadata?.error
  ).length / (firstHalf.length || 1);
  
  const secondHalfFailures = secondHalf.filter(e => 
    e.metadata?.status === 'failed' || e.metadata?.error
  ).length / (secondHalf.length || 1);

  const trend_direction: 'improving' | 'stable' | 'degrading' =
    secondHalfFailures < firstHalfFailures * 0.8 ? 'improving' :
    secondHalfFailures > firstHalfFailures * 1.2 ? 'degrading' : 'stable';

  // Burst intensity (sudden spike detection)
  const burst_intensity = recent.length > 5
    ? calculateBurstIntensity(recent)
    : 0;

  return {
    failure_rate,
    avg_duration,
    error_frequency,
    recent_failures,
    pattern_deviation,
    trend_direction,
    burst_intensity,
  };
}

/**
 * Calculate burst intensity using rate-of-change analysis
 */
function calculateBurstIntensity(events: TelemetryEvent[]): number {
  if (events.length < 5) return 0;

  // Group events into 30-second buckets
  const buckets: number[] = [];
  const bucketSize = 30 * 1000; // 30 seconds
  const startTime = new Date(events[0].timestamp).getTime();

  events.forEach(event => {
    const bucketIndex = Math.floor(
      (new Date(event.timestamp).getTime() - startTime) / bucketSize
    );
    buckets[bucketIndex] = (buckets[bucketIndex] || 0) + 1;
  });

  // Calculate coefficient of variation (burst detection)
  const values = buckets.filter(n => n > 0);
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Coefficient of variation
  return mean > 0 ? stdDev / mean : 0;
}

/**
 * AI-powered anomaly detection
 * Uses adaptive thresholds based on historical patterns
 */
export function detectAnomalyAI(
  events: TelemetryEvent[],
  context: string = 'default'
): AnomalyDetection {
  const features = extractFeatures(events);
  const baseline = getBaseline(context);
  const now = Date.now();

  // Update baseline with new data (adaptive learning)
  updateBaseline(context, features);

  // Anomaly detection logic with confidence scoring
  const checks = runAnomalyChecks(features, baseline);
  
  // Select highest confidence anomaly
  const detectedAnomalies = checks.filter(c => c.detected);
  
  if (detectedAnomalies.length === 0) {
    return {
      detected: false,
      type: 'NO_ANOMALY',
      severity: 'low',
      confidence: 0,
      reason: 'System operating within normal parameters',
      features,
      recommendations: ['Continue monitoring', 'Maintain current practices'],
      timestamp: now,
    };
  }

  // Sort by confidence and severity
  detectedAnomalies.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity];
    }
    return b.confidence - a.confidence;
  });

  const primary = detectedAnomalies[0];

  return {
    detected: true,
    type: primary.type,
    severity: primary.severity,
    confidence: primary.confidence,
    reason: primary.reason,
    features,
    recommendations: generateRecommendations(primary.type, features),
    timestamp: now,
  };
}

/**
 * Run multiple anomaly detection checks
 */
function runAnomalyChecks(
  features: SystemFeatures,
  baseline: BaselineStats | null
): Array<Omit<AnomalyDetection, 'features' | 'recommendations' | 'timestamp'>> {
  const checks = [];

  // Check 1: Failure Rate Spike
  const failureThreshold = baseline 
    ? baseline.avgFailureRate + (2 * Math.sqrt(baseline.avgFailureRate * (1 - baseline.avgFailureRate) / baseline.sampleSize))
    : 0.3;
  
  if (features.failure_rate > failureThreshold && features.failure_rate > 0.15) {
    checks.push({
      detected: true,
      type: 'FAILURE_SPIKE' as AnomalyType,
      severity: features.failure_rate > 0.5 ? 'critical' : features.failure_rate > 0.3 ? 'high' : 'medium',
      confidence: Math.min(0.95, features.failure_rate + 0.5),
      reason: `Failure rate spike detected: ${(features.failure_rate * 100).toFixed(1)}% (baseline: ${baseline ? (baseline.avgFailureRate * 100).toFixed(1) : 'N/A'}%)`,
    });
  }

  // Check 2: Latency Degradation
  const durationThreshold = baseline ? baseline.avgDuration * 2 : 1000;
  if (features.avg_duration > durationThreshold && features.avg_duration > 500) {
    checks.push({
      detected: true,
      type: 'LATENCY_DEGRADATION' as AnomalyType,
      severity: features.avg_duration > 3000 ? 'high' : 'medium',
      confidence: Math.min(0.9, features.avg_duration / 3000),
      reason: `Latency degradation: ${features.avg_duration.toFixed(0)}ms avg (threshold: ${durationThreshold.toFixed(0)}ms)`,
    });
  }

  // Check 3: Error Burst
  if (features.burst_intensity > 1.5 && features.error_frequency > 5) {
    checks.push({
      detected: true,
      type: 'ERROR_BURST' as AnomalyType,
      severity: features.error_frequency > 10 ? 'high' : 'medium',
      confidence: Math.min(0.92, 0.5 + features.burst_intensity * 0.2),
      reason: `Error burst detected: ${features.error_frequency} errors in 5min window (burst intensity: ${features.burst_intensity.toFixed(2)})`,
    });
  }

  // Check 4: Pattern Anomaly (statistical deviation)
  if (features.pattern_deviation > 2 && baseline && baseline.sampleSize > 10) {
    checks.push({
      detected: true,
      type: 'PATTERN_ANOMALY' as AnomalyType,
      severity: features.pattern_deviation > 3 ? 'high' : 'medium',
      confidence: Math.min(0.88, 0.5 + features.pattern_deviation * 0.1),
      reason: `Statistical pattern anomaly: ${features.pattern_deviation.toFixed(2)}σ deviation from baseline`,
    });
  }

  // Check 5: Trend Degradation
  if (features.trend_direction === 'degrading' && features.failure_rate > 0.2) {
    checks.push({
      detected: true,
      type: 'TREND_DEGRADATION' as AnomalyType,
      severity: features.failure_rate > 0.4 ? 'high' : 'medium',
      confidence: 0.75,
      reason: `Degrading trend detected with ${(features.failure_rate * 100).toFixed(1)}% failure rate`,
    });
  }

  // Check 6: Stability Drop
  const stabilityScore = computeStabilityScore(features.failure_rate);
  if (stabilityScore < 60 && features.failure_rate > 0.25) {
    checks.push({
      detected: true,
      type: 'STABILITY_DROP' as AnomalyType,
      severity: stabilityScore < 40 ? 'critical' : 'high',
      confidence: (100 - stabilityScore) / 100,
      reason: `System stability dropped to ${stabilityScore.toFixed(1)}%`,
    });
  }

  return checks;
}

/**
 * Generate actionable recommendations based on anomaly type
 */
function generateRecommendations(type: AnomalyType, features: SystemFeatures): string[] {
  const recommendations: Record<AnomalyType, string[]> = {
    'FAILURE_SPIKE': [
      'Review recent deployments for breaking changes',
      'Check error logs for specific failure patterns',
      'Verify circuit breaker is not overloaded',
      'Consider rolling back if spike is deployment-related',
    ],
    'LATENCY_DEGRADATION': [
      'Check database query performance',
      'Verify third-party API response times',
      'Review server resource utilization',
      'Consider scaling if load-related',
    ],
    'ERROR_BURST': [
      'Identify burst source (specific endpoint/user)',
      'Check for DDoS or unusual traffic patterns',
      'Verify rate limiting is active',
      'Review recent code changes in affected areas',
    ],
    'PATTERN_ANOMALY': [
      'Compare with historical behavior patterns',
      'Check for configuration drift',
      'Verify monitoring system accuracy',
      'Investigate external dependencies',
    ],
    'TREND_DEGRADATION': [
      'Analyze degradation rate over time',
      'Review commit history for gradual changes',
      'Check infrastructure health metrics',
      'Plan proactive maintenance window',
    ],
    'STABILITY_DROP': [
      'PRIORITY: Immediate system health check',
      'Escalate to on-call engineer',
      'Prepare incident response procedures',
      'Consider emergency circuit breaker activation',
    ],
    'NO_ANOMALY': [
      'Continue current monitoring practices',
      'Maintain baseline documentation',
      'Schedule regular system reviews',
    ],
  };

  return recommendations[type] || recommendations['NO_ANOMALY'];
}

/**
 * Compute stability score (0-100)
 */
export function computeStabilityScore(failureRate: number): number {
  return Math.max(0, Math.min(100, 100 - (failureRate * 100)));
}

/**
 * Get historical baseline for comparison
 */
function getBaseline(context: string): BaselineStats | null {
  return baselineStore.get(context) || null;
}

/**
 * Update baseline statistics with new observations
 * Uses exponential moving average for adaptivity
 */
function updateBaseline(context: string, features: SystemFeatures): void {
  const existing = baselineStore.get(context);
  const alpha = 0.3; // Smoothing factor

  if (!existing) {
    baselineStore.set(context, {
      avgFailureRate: features.failure_rate,
      avgDuration: features.avg_duration,
      stdDevDuration: features.avg_duration * 0.2, // Initial estimate
      sampleSize: 1,
      lastUpdated: Date.now(),
    });
    return;
  }

  // Update with exponential moving average
  const newBaseline: BaselineStats = {
    avgFailureRate: existing.avgFailureRate * (1 - alpha) + features.failure_rate * alpha,
    avgDuration: existing.avgDuration * (1 - alpha) + features.avg_duration * alpha,
    stdDevDuration: Math.sqrt(
      existing.stdDevDuration ** 2 * (1 - alpha) + 
      (features.avg_duration - existing.avgDuration) ** 2 * alpha
    ),
    sampleSize: existing.sampleSize + 1,
    lastUpdated: Date.now(),
  };

  baselineStore.set(context, newBaseline);
}

/**
 * Get current baseline stats (for dashboard display)
 */
export function getBaselineStats(context: string = 'default'): BaselineStats | null {
  return baselineStore.get(context) || null;
}

/**
 * Clear baseline (useful for testing or major system changes)
 */
export function clearBaseline(context: string = 'default'): void {
  baselineStore.delete(context);
}

/**
 * Format anomaly for display
 */
export function formatAnomaly(anomaly: AnomalyDetection): string {
  const severityEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴',
  };

  return `${severityEmoji[anomaly.severity]} ${anomaly.type}
Confidence: ${(anomaly.confidence * 100).toFixed(0)}%
${anomaly.reason}
Features:
- Failure Rate: ${(anomaly.features.failure_rate * 100).toFixed(1)}%
- Avg Duration: ${anomaly.features.avg_duration.toFixed(0)}ms
- Trend: ${anomaly.features.trend_direction}`;
}
