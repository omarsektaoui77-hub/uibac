/**
 * Auto Incident Report Generator
 * AI-powered human-readable incident documentation
 * 
 * Generates actionable, explainable incident reports when anomalies occur
 * 
 * SAFETY: Read-only analysis, no automated remediation
 */

import { AnomalyDetection, AnomalyType, formatAnomaly, computeStabilityScore } from "./anomalyDetector";
import { TelemetryEvent } from "@/lib/telemetry/eventQueue";

// Incident report structure
export interface IncidentReport {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  description: string;
  root_cause: string;
  affected_systems: string[];
  impact_assessment: ImpactAssessment;
  recommended_action: string[];
  ai_confidence: number;
  anomaly_type: AnomalyType;
  telemetry_snapshot: TelemetrySnapshot;
  status: 'detected' | 'investigating' | 'resolved' | 'closed';
  resolved_at?: number;
  resolution_notes?: string;
}

// Impact details
export interface ImpactAssessment {
  user_facing: boolean;
  service_degradation: 'none' | 'minor' | 'moderate' | 'severe';
  estimated_users_affected: string;
  data_integrity_risk: boolean;
  financial_impact: 'none' | 'low' | 'medium' | 'high';
}

// Telemetry at time of incident
export interface TelemetrySnapshot {
  event_count: number;
  failure_rate: number;
  avg_latency: number;
  stability_score: number;
  peak_error_rate: number;
  sample_events: string[];
}

// Report store (in-memory, can be persisted)
const reportStore: Map<string, IncidentReport> = new Map();

/**
 * Generate human-readable incident report from anomaly detection
 */
export function generateIncidentReport(
  anomaly: AnomalyDetection,
  events: TelemetryEvent[],
  options?: {
    id?: string;
    context?: string;
  }
): IncidentReport {
  const id = options?.id || `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const now = Date.now();

  // Build human-readable summary
  const summary = generateSummary(anomaly);
  
  // Generate detailed description
  const description = generateDescription(anomaly, events);
  
  // Root cause analysis
  const root_cause = generateRootCauseAnalysis(anomaly);
  
  // Determine affected systems
  const affected_systems = identifyAffectedSystems(anomaly, events);
  
  // Impact assessment
  const impact_assessment = assessImpact(anomaly, events);
  
  // Recommended actions (prioritized)
  const recommended_action = prioritizeActions(anomaly.recommendations, anomaly.severity);
  
  // Telemetry snapshot
  const telemetry_snapshot = createTelemetrySnapshot(events, anomaly);

  const report: IncidentReport = {
    id,
    timestamp: now,
    severity: anomaly.severity,
    summary,
    description,
    root_cause,
    affected_systems,
    impact_assessment,
    recommended_action,
    ai_confidence: anomaly.confidence,
    anomaly_type: anomaly.type,
    telemetry_snapshot,
    status: 'detected',
  };

  // Store for later retrieval
  reportStore.set(id, report);

  return report;
}

/**
 * Generate concise summary headline
 */
function generateSummary(anomaly: AnomalyDetection): string {
  const typeDescriptions: Record<AnomalyType, string> = {
    'FAILURE_SPIKE': `Service reliability degradation: ${(anomaly.features.failure_rate * 100).toFixed(0)}% failure rate detected`,
    'LATENCY_DEGRADATION': `Performance degradation: Response times increased to ${anomaly.features.avg_duration.toFixed(0)}ms`,
    'ERROR_BURST': `Error burst detected: ${anomaly.features.error_frequency} errors in 5-minute window`,
    'PATTERN_ANOMALY': `Unusual traffic pattern: Statistical anomaly ${anomaly.features.pattern_deviation.toFixed(1)}σ from baseline`,
    'TREND_DEGRADATION': `System health degrading: ${anomaly.features.trend_direction} trend over last 20 events`,
    'STABILITY_DROP': `System stability critical: Stability score dropped to ${computeStabilityScore(anomaly.features.failure_rate).toFixed(0)}%`,
    'NO_ANOMALY': 'System operating normally',
  };

  return typeDescriptions[anomaly.type] || 'Anomaly detected in system monitoring';
}

/**
 * Generate detailed incident description
 */
function generateDescription(anomaly: AnomalyDetection, events: TelemetryEvent[]): string {
  const parts: string[] = [];

  // Context
  parts.push(`## Incident Overview`);
  parts.push(`An ${anomaly.severity.toUpperCase()} severity anomaly was detected by the AI monitoring system at ${new Date(anomaly.timestamp).toISOString()}.`);
  parts.push(`The system identified a ${anomaly.type} pattern with ${(anomaly.confidence * 100).toFixed(0)}% confidence.`);

  // Technical details
  parts.push(`\n## Technical Details`);
  parts.push(`- **Failure Rate:** ${(anomaly.features.failure_rate * 100).toFixed(1)}%`);
  parts.push(`- **Average Duration:** ${anomaly.features.avg_duration.toFixed(0)}ms`);
  parts.push(`- **Error Frequency:** ${anomaly.features.error_frequency} errors/5min`);
  parts.push(`- **Trend Direction:** ${anomaly.features.trend_direction}`);
  parts.push(`- **Burst Intensity:** ${anomaly.features.burst_intensity.toFixed(2)}`);

  // Recent events context
  if (events.length > 0) {
    parts.push(`\n## Recent Activity`);
    parts.push(`Analysis based on ${events.length} recent telemetry events.`);

    const recentFailures = events.slice(-5).filter(e =>
      e.status === 'failed'
    );

    if (recentFailures.length > 0) {
      parts.push(`\n### Recent Failures (last 5 events):`);
      recentFailures.forEach((event, i) => {
        parts.push(`${i + 1}. ${event.eventType} - Status: ${event.status}`);
      });
    }
  }

  return parts.join('\n');
}

/**
 * Generate AI-powered root cause analysis
 */
function generateRootCauseAnalysis(anomaly: AnomalyDetection): string {
  const rootCauseTemplates: Record<AnomalyType, string[]> = {
    'FAILURE_SPIKE': [
      'Recent deployment may have introduced breaking changes',
      'External dependency failure causing cascade',
      'Configuration drift from production baseline',
      'Resource exhaustion (memory/CPU/disk)',
    ],
    'LATENCY_DEGRADATION': [
      'Database query performance regression',
      'Third-party API latency increase',
      'Network congestion or routing issues',
      'Insufficient compute resources for load',
    ],
    'ERROR_BURST': [
      'Specific user or bot generating error traffic',
      'Endpoint receiving malformed requests',
      'Race condition triggered under load',
      'Circuit breaker temporarily opening/closing rapidly',
    ],
    'PATTERN_ANOMALY': [
      'Unusual traffic pattern from new user cohort',
      'A/B test showing unexpected behavior',
      'Geographic traffic shift affecting performance',
      'Time-of-day pattern different from baseline',
    ],
    'TREND_DEGRADATION': [
      'Gradual memory leak over time',
      'Database table growth affecting queries',
      'Slowly degrading third-party service',
      'Accumulated technical debt manifesting',
    ],
    'STABILITY_DROP': [
      'Multiple simultaneous failure modes',
      'Cascading failure from single point of failure',
      'Infrastructure degradation (host/container issues)',
      'DDoS or unusually high traffic load',
    ],
    'NO_ANOMALY': [
      'No root cause identified - system operating normally',
    ],
  };

  const templates = rootCauseTemplates[anomaly.type] || ['Unknown - requires investigation'];
  
  return `AI Analysis suggests the following potential root causes (in order of likelihood):

${templates.map((cause, i) => `${i + 1}. ${cause}`).join('\n')}

Note: Root cause analysis is probabilistic based on pattern matching. 
Manual investigation is recommended to confirm the actual cause.`;
}

/**
 * Identify affected systems based on anomaly and events
 */
function identifyAffectedSystems(anomaly: AnomalyDetection, events: TelemetryEvent[]): string[] {
  const systems = new Set<string>();

  // Add based on anomaly type
  const typeSystems: Record<AnomalyType, string[]> = {
    'FAILURE_SPIKE': ['Chaos Pipeline', 'Incident Response', 'Telemetry'],
    'LATENCY_DEGRADATION': ['API Gateway', 'Database', 'External APIs'],
    'ERROR_BURST': ['Error Handling', 'Rate Limiting', 'Monitoring'],
    'PATTERN_ANOMALY': ['Traffic Routing', 'Load Balancer', 'Auto-scaling'],
    'TREND_DEGRADATION': ['Core Services', 'Background Jobs', 'Data Pipeline'],
    'STABILITY_DROP': ['All Services', 'Infrastructure', 'Circuit Breaker'],
    'NO_ANOMALY': ['None'],
  };

  typeSystems[anomaly.type]?.forEach(s => systems.add(s));

  // Add based on event type
  events.forEach(event => {
    if (event.eventType?.includes('circuit')) systems.add('Circuit Breaker');
    if (event.eventType?.includes('telemetry')) systems.add('Telemetry');
    if (event.eventType?.includes('incident')) systems.add('Incident Management');
  });

  return Array.from(systems);
}

/**
 * Assess impact of the incident
 */
function assessImpact(anomaly: AnomalyDetection, events: TelemetryEvent[]): ImpactAssessment {
  const failureRate = anomaly.features.failure_rate;
  const isUserFacing = events.some(e =>
    e.eventType?.includes('user') ||
    e.eventType?.includes('request')
  );

  // Service degradation level
  const service_degradation: 'none' | 'minor' | 'moderate' | 'severe' =
    failureRate > 0.8 ? 'severe' :
    failureRate > 0.5 ? 'moderate' :
    failureRate > 0.2 ? 'minor' : 'none';

  // Estimated users affected
  const estimated_users_affected = 
    failureRate > 0.7 ? '> 70% of active users' :
    failureRate > 0.4 ? '30-70% of active users' :
    failureRate > 0.15 ? '10-30% of active users' :
    '< 10% of active users';

  // Data integrity risk
  const data_integrity_risk = events.some(e =>
    e.eventType?.includes('database') ||
    e.eventType?.includes('write')
  );

  // Financial impact estimate
  const financial_impact: 'none' | 'low' | 'medium' | 'high' =
    isUserFacing && service_degradation === 'severe' ? 'high' :
    isUserFacing && service_degradation === 'moderate' ? 'medium' :
    isUserFacing ? 'low' : 'none';

  return {
    user_facing: isUserFacing,
    service_degradation,
    estimated_users_affected,
    data_integrity_risk,
    financial_impact,
  };
}

/**
 * Prioritize recommended actions based on severity
 */
function prioritizeActions(recommendations: string[], severity: string): string[] {
  const now = new Date().toISOString();
  
  const prioritized = [...recommendations];

  // Add severity-specific actions
  if (severity === 'critical') {
    prioritized.unshift(
      '🔴 IMMEDIATE: Page on-call engineer',
      '🔴 IMMEDIATE: Activate incident response protocol',
      '🔴 IMMEDIATE: Consider emergency circuit breaker activation'
    );
  } else if (severity === 'high') {
    prioritized.unshift(
      '🟠 URGENT: Escalate to SRE team',
      '🟠 URGENT: Begin active investigation within 15 minutes'
    );
  } else if (severity === 'medium') {
    prioritized.unshift(
      '🟡 MONITOR: Track for 30 minutes before escalation'
    );
  }

  // Add timestamp
  prioritized.push(`Report generated at: ${now}`);

  return prioritized;
}

/**
 * Create snapshot of telemetry at incident time
 */
function createTelemetrySnapshot(
  events: TelemetryEvent[],
  anomaly: AnomalyDetection
): TelemetrySnapshot {
  const recent = events.slice(-20);
  const failureRate = anomaly.features.failure_rate;

  // Find peak error rate in sliding window
  let peak_error_rate = 0;
  for (let i = 0; i <= recent.length - 5; i++) {
    const window = recent.slice(i, i + 5);
    const windowFailureRate = window.filter(e =>
      e.status === 'failed'
    ).length / window.length;
    peak_error_rate = Math.max(peak_error_rate, windowFailureRate);
  }

  // Sample recent event types
  const sample_events = recent
    .slice(-5)
    .map(e => e.eventType)
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .slice(0, 3);

  return {
    event_count: events.length,
    failure_rate: failureRate,
    avg_latency: anomaly.features.avg_duration,
    stability_score: computeStabilityScore(failureRate),
    peak_error_rate,
    sample_events,
  };
}

/**
 * Format incident report for human reading
 */
export function formatIncidentReport(report: IncidentReport): string {
  const severityEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴',
  };

  const statusEmoji = {
    detected: '🚨',
    investigating: '🔍',
    resolved: '✅',
    closed: '🔒',
  };

  return `
╔════════════════════════════════════════════════════════════╗
║     INCIDENT REPORT ${report.id}                          ║
╠════════════════════════════════════════════════════════════╣
║ ${severityEmoji[report.severity]} ${report.severity.toUpperCase()} SEVERITY  |  ${statusEmoji[report.status]} ${report.status.toUpperCase()}
╠════════════════════════════════════════════════════════════╣

📋 SUMMARY
${report.summary}

🎯 AI CONFIDENCE: ${(report.ai_confidence * 100).toFixed(0)}%

🔍 ROOT CAUSE
${report.root_cause}

⚡ IMPACT
- User Facing: ${report.impact_assessment.user_facing ? 'YES' : 'NO'}
- Service Degradation: ${report.impact_assessment.service_degradation}
- Users Affected: ${report.impact_assessment.estimated_users_affected}
- Data Risk: ${report.impact_assessment.data_integrity_risk ? 'YES' : 'NO'}
- Financial Impact: ${report.impact_assessment.financial_impact}

🔧 AFFECTED SYSTEMS
${report.affected_systems.map(s => `  • ${s}`).join('\n')}

📊 TELEMETRY SNAPSHOT
- Events Analyzed: ${report.telemetry_snapshot.event_count}
- Failure Rate: ${(report.telemetry_snapshot.failure_rate * 100).toFixed(1)}%
- Avg Latency: ${report.telemetry_snapshot.avg_latency.toFixed(0)}ms
- Stability Score: ${report.telemetry_snapshot.stability_score.toFixed(0)}%
- Peak Error Rate: ${(report.telemetry_snapshot.peak_error_rate * 100).toFixed(1)}%

✅ RECOMMENDED ACTIONS
${report.recommended_action.map((action, i) => `${i + 1}. ${action}`).join('\n')}

📝 FULL DESCRIPTION
${report.description}

╚════════════════════════════════════════════════════════════╝
Generated: ${new Date(report.timestamp).toISOString()}
`;
}

/**
 * Store operations
 */
export function getIncidentReport(id: string): IncidentReport | null {
  return reportStore.get(id) || null;
}

export function getAllIncidentReports(): IncidentReport[] {
  return Array.from(reportStore.values())
    .sort((a, b) => b.timestamp - a.timestamp); // newest first
}

export function getRecentReports(limit: number = 10): IncidentReport[] {
  return getAllIncidentReports().slice(0, limit);
}

export function updateIncidentStatus(
  id: string,
  status: 'detected' | 'investigating' | 'resolved' | 'closed',
  notes?: string
): IncidentReport | null {
  const report = reportStore.get(id);
  if (!report) return null;

  report.status = status;
  if (status === 'resolved' || status === 'closed') {
    report.resolved_at = Date.now();
  }
  if (notes) {
    report.resolution_notes = notes;
  }

  reportStore.set(id, report);
  return report;
}

export function clearAllReports(): void {
  reportStore.clear();
}

/**
 * Export reports in various formats
 */
export function exportReportsAsJSON(reports?: IncidentReport[]): string {
  const data = reports || getAllIncidentReports();
  return JSON.stringify(data, null, 2);
}

export function exportReportsAsMarkdown(reports?: IncidentReport[]): string {
  const data = reports || getAllIncidentReports();
  
  return data.map(report => `
## Incident ${report.id}

**Severity:** ${report.severity}
**Status:** ${report.status}
**Time:** ${new Date(report.timestamp).toISOString()}

### Summary
${report.summary}

### Root Cause
${report.root_cause}

### Impact
- Users Affected: ${report.impact_assessment.estimated_users_affected}
- Service Degradation: ${report.impact_assessment.service_degradation}

### Actions Taken
${report.recommended_action.map(a => `- ${a}`).join('\n')}

---
`).join('\n');
}
