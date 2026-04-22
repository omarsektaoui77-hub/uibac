/**
 * Real-Time Intelligence Layer
 * Broadcast system for AI-driven anomaly detection and incident reporting
 * 
 * Connects:
 * - Telemetry events → AI Analyzer → Anomaly Detection
 * - Anomaly Detection → Incident Reports → Real-time Broadcast
 * - Broadcast → Dashboard + External Systems (Slack optional)
 * 
 * SAFETY: Read-only, no automated remediation, works in preview/local
 */

import { detectAnomalyAI, AnomalyDetection, formatAnomaly, extractFeatures } from "./anomalyDetector";
import { generateIncidentReport, IncidentReport, formatIncidentReport, getRecentReports } from "./incidentReports";
import { TelemetryEvent } from "@/core/telemetry/eventQueue";

// Broadcast event types
export type IntelligenceEventType = 
  | 'ANOMALY_DETECTED'
  | 'INCIDENT_CREATED'
  | 'TELEMETRY_UPDATE'
  | 'STABILITY_CHANGE'
  | 'INSIGHT_GENERATED'
  | 'SYSTEM_HEALTH';

// Broadcast payload structure
export interface IntelligenceEvent {
  type: IntelligenceEventType;
  timestamp: number;
  payload: AnomalyDetection | IncidentReport | TelemetrySnapshot | StabilityUpdate | AIInsight;
  metadata: {
    source: string;
    confidence: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };
}

// Telemetry snapshot for broadcasts
export interface TelemetrySnapshot {
  totalEvents: number;
  recentEvents: TelemetryEvent[];
  featureSummary: ReturnType<typeof extractFeatures>;
  timeRange: { start: number; end: number };
}

// Stability update
export interface StabilityUpdate {
  currentScore: number;
  previousScore: number;
  change: number;
  trend: 'improving' | 'stable' | 'degrading';
}

// AI-generated insight
export interface AIInsight {
  category: 'performance' | 'reliability' | 'security' | 'cost';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  suggestedAction?: string;
}

// Subscriber callback type
export type IntelligenceSubscriber = (event: IntelligenceEvent) => void;

// Broadcast system state
class IntelligenceBroadcastSystem {
  private subscribers: Map<IntelligenceEventType, Set<IntelligenceSubscriber>> = new Map();
  private allSubscribers: Set<IntelligenceSubscriber> = new Set();
  private eventHistory: IntelligenceEvent[] = [];
  private maxHistorySize: number = 1000;

  // Subscribe to specific event types
  subscribe(type: IntelligenceEventType, callback: IntelligenceSubscriber): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(type)?.delete(callback);
    };
  }

  // Subscribe to all events
  subscribeAll(callback: IntelligenceSubscriber): () => void {
    this.allSubscribers.add(callback);
    return () => {
      this.allSubscribers.delete(callback);
    };
  }

  // Broadcast event to subscribers
  broadcast(event: IntelligenceEvent): void {
    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify type-specific subscribers
    const typeSubscribers = this.subscribers.get(event.type);
    if (typeSubscribers) {
      typeSubscribers.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('[Intelligence Broadcast] Subscriber error:', error);
        }
      });
    }

    // Notify all-subscribers
    this.allSubscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[Intelligence Broadcast] Subscriber error:', error);
      }
    });
  }

  // Get recent events
  getRecentEvents(limit: number = 100): IntelligenceEvent[] {
    return this.eventHistory.slice(-limit);
  }

  // Get events by type
  getEventsByType(type: IntelligenceEventType): IntelligenceEvent[] {
    return this.eventHistory.filter(e => e.type === type);
  }

  // Clear history
  clearHistory(): void {
    this.eventHistory = [];
  }
}

// Singleton instance
export const intelligenceBroadcast = new IntelligenceBroadcastSystem();

/**
 * Main intelligence processing pipeline
 * Analyzes telemetry and broadcasts insights
 */
export function processTelemetryIntelligence(
  events: TelemetryEvent[],
  options?: {
    context?: string;
    forceAnalysis?: boolean;
  }
): {
  anomaly: AnomalyDetection | null;
  incident: IncidentReport | null;
  events: IntelligenceEvent[];
} {
  const results = {
    anomaly: null as AnomalyDetection | null,
    incident: null as IncidentReport | null,
    events: [] as IntelligenceEvent[],
  };

  if (events.length === 0) return results;

  // Step 1: Detect anomalies
  const anomaly = detectAnomalyAI(events, options?.context);
  
  // Step 2: Broadcast telemetry update (always)
  const telemetryEvent: IntelligenceEvent = {
    type: 'TELEMETRY_UPDATE',
    timestamp: Date.now(),
    payload: {
      totalEvents: events.length,
      recentEvents: events.slice(-10),
      featureSummary: extractFeatures(events),
      timeRange: {
        start: new Date(events[0].timestamp).getTime(),
        end: new Date(events[events.length - 1].timestamp).getTime(),
      },
    } as TelemetrySnapshot,
    metadata: {
      source: 'ai-analyzer',
      confidence: 1.0,
      urgency: 'low',
    },
  };
  
  intelligenceBroadcast.broadcast(telemetryEvent);
  results.events.push(telemetryEvent);

  // Step 3: If anomaly detected, create incident and broadcast
  if (anomaly.detected || options?.forceAnalysis) {
    results.anomaly = anomaly;

    // Broadcast anomaly detection
    const anomalyEvent: IntelligenceEvent = {
      type: 'ANOMALY_DETECTED',
      timestamp: Date.now(),
      payload: anomaly,
      metadata: {
        source: 'anomaly-detector',
        confidence: anomaly.confidence,
        urgency: anomaly.severity === 'critical' ? 'critical' :
                 anomaly.severity === 'high' ? 'high' :
                 anomaly.severity === 'medium' ? 'medium' : 'low',
      },
    };
    
    intelligenceBroadcast.broadcast(anomalyEvent);
    results.events.push(anomalyEvent);

    // Generate and broadcast incident report
    if (anomaly.detected) {
      const incident = generateIncidentReport(anomaly, events);
      results.incident = incident;

      const incidentEvent: IntelligenceEvent = {
        type: 'INCIDENT_CREATED',
        timestamp: Date.now(),
        payload: incident,
        metadata: {
          source: 'incident-generator',
          confidence: anomaly.confidence,
          urgency: anomaly.severity === 'critical' ? 'critical' :
                   anomaly.severity === 'high' ? 'high' :
                   anomaly.severity === 'medium' ? 'medium' : 'low',
        },
      };

      intelligenceBroadcast.broadcast(incidentEvent);
      results.events.push(incidentEvent);

      // Log for debugging
      console.log('[INTELLIGENCE]', formatIncidentReport(incident));
    }
  }

  // Step 4: Check for stability changes
  const stabilityUpdate = checkStabilityChange(events);
  if (stabilityUpdate) {
    const stabilityEvent: IntelligenceEvent = {
      type: 'STABILITY_CHANGE',
      timestamp: Date.now(),
      payload: stabilityUpdate,
      metadata: {
        source: 'stability-monitor',
        confidence: 0.9,
        urgency: stabilityUpdate.change < -20 ? 'high' : 
                 stabilityUpdate.change < -10 ? 'medium' : 'low',
      },
    };

    intelligenceBroadcast.broadcast(stabilityEvent);
    results.events.push(stabilityEvent);
  }

  // Step 5: Generate AI insights
  const insights = generateAIInsights(events, anomaly);
  insights.forEach(insight => {
    const insightEvent: IntelligenceEvent = {
      type: 'INSIGHT_GENERATED',
      timestamp: Date.now(),
      payload: insight,
      metadata: {
        source: 'ai-insight-engine',
        confidence: insight.confidence,
        urgency: insight.actionable ? 'medium' : 'low',
      },
    };

    intelligenceBroadcast.broadcast(insightEvent);
    results.events.push(insightEvent);
  });

  return results;
}

// Stability tracking for change detection
let lastStabilityScore = 100;

function checkStabilityChange(events: TelemetryEvent[]): StabilityUpdate | null {
  const features = extractFeatures(events);
  const currentScore = Math.max(0, 100 - features.failure_rate * 100);
  const change = currentScore - lastStabilityScore;
  
  // Only report significant changes (>5%)
  if (Math.abs(change) < 5) {
    lastStabilityScore = currentScore;
    return null;
  }

  const trend: 'improving' | 'stable' | 'degrading' =
    change > 10 ? 'improving' :
    change < -10 ? 'degrading' : 'stable';

  const update: StabilityUpdate = {
    currentScore,
    previousScore: lastStabilityScore,
    change,
    trend,
  };

  lastStabilityScore = currentScore;
  return update;
}

/**
 * Generate AI insights from telemetry patterns
 */
function generateAIInsights(
  events: TelemetryEvent[],
  anomaly: AnomalyDetection
): AIInsight[] {
  const insights: AIInsight[] = [];
  const features = extractFeatures(events);

  // Insight 1: Performance optimization opportunity
  if (features.avg_duration > 1000 && features.avg_duration < 3000) {
    insights.push({
      category: 'performance',
      title: 'Response Time Optimization Opportunity',
      description: `Average response time of ${features.avg_duration.toFixed(0)}ms suggests potential for caching or query optimization.`,
      confidence: 0.75,
      actionable: true,
      suggestedAction: 'Review slow queries and consider implementing Redis caching for frequently accessed data.',
    });
  }

  // Insight 2: Reliability pattern
  if (features.trend_direction === 'degrading' && !anomaly.detected) {
    insights.push({
      category: 'reliability',
      title: 'Gradual Degradation Pattern',
      description: 'System reliability is slowly declining over time. Early intervention recommended.',
      confidence: 0.7,
      actionable: true,
      suggestedAction: 'Schedule maintenance window and review recent incremental changes.',
    });
  }

  // Insight 3: Security pattern (high error rate from single source)
  const errorEvents = events.filter(e => (e as any).metadata?.error);
  if (errorEvents.length > 10) {
    const uniqueTypes = new Set(errorEvents.map(e => e.eventType)).size;
    if (uniqueTypes === 1) {
      insights.push({
        category: 'security',
        title: 'Single Point Failure Pattern',
        description: `Multiple errors (${errorEvents.length}) of the same type suggests targeted issue or potential attack vector.`,
        confidence: 0.6,
        actionable: true,
        suggestedAction: 'Investigate specific error pattern and check for malicious traffic or misconfiguration.',
      });
    }
  }

  // Insight 4: Cost optimization
  if (events.length > 100 && features.failure_rate < 0.05) {
    insights.push({
      category: 'cost',
      title: 'Efficient Operation',
      description: 'System is operating efficiently with low error rate despite high event volume.',
      confidence: 0.8,
      actionable: false,
    });
  }

  return insights;
}

/**
 * Dashboard data formatter
 * Provides real-time data for UI consumption
 */
export function getDashboardIntelligence(): {
  recentIncidents: IncidentReport[];
  activeAnomalies: AnomalyDetection[];
  recentEvents: IntelligenceEvent[];
  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    stabilityScore: number;
    lastIncident: number | null;
  };
  aiInsights: AIInsight[];
} {
  const recentEvents = intelligenceBroadcast.getRecentEvents(50);
  
  // Extract incidents from events
  const recentIncidents = recentEvents
    .filter(e => e.type === 'INCIDENT_CREATED')
    .map(e => e.payload as IncidentReport)
    .slice(0, 10);

  // Extract active anomalies (last 5 minutes)
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const activeAnomalies = recentEvents
    .filter(e => 
      e.type === 'ANOMALY_DETECTED' && 
      e.timestamp > fiveMinutesAgo &&
      (e.payload as AnomalyDetection).detected
    )
    .map(e => e.payload as AnomalyDetection);

  // Calculate system health
  const latestTelemetry = recentEvents.find(e => e.type === 'TELEMETRY_UPDATE');
  const features = latestTelemetry?.payload as TelemetrySnapshot | undefined;
  const stabilityScore = features ? 100 - features.featureSummary.failure_rate * 100 : 100;
  
  const status: 'healthy' | 'degraded' | 'critical' =
    stabilityScore > 90 ? 'healthy' :
    stabilityScore > 70 ? 'degraded' : 'critical';

  const lastIncident = recentIncidents.length > 0 
    ? recentIncidents[0].timestamp 
    : null;

  // Get AI insights from recent events
  const aiInsights = recentEvents
    .filter(e => e.type === 'INSIGHT_GENERATED')
    .slice(-5)
    .map(e => e.payload as AIInsight);

  return {
    recentIncidents,
    activeAnomalies,
    recentEvents: recentEvents.slice(-20),
    systemHealth: {
      status,
      stabilityScore,
      lastIncident,
    },
    aiInsights,
  };
}

/**
 * Export real-time feed for external systems (Slack, etc.)
 * Non-destructive, read-only
 */
export function exportRealtimeFeed(
  format: 'json' | 'slack' | 'markdown' = 'json'
): string {
  const data = getDashboardIntelligence();

  switch (format) {
    case 'slack':
      return formatForSlack(data);
    case 'markdown':
      return formatForMarkdown(data);
    case 'json':
    default:
      return JSON.stringify(data, null, 2);
  }
}

function formatForSlack(data: ReturnType<typeof getDashboardIntelligence>): string {
  const statusEmoji = {
    healthy: '✅',
    degraded: '⚠️',
    critical: '🚨',
  };

  return `🧠 *AI Intelligence Feed*

*System Health:* ${statusEmoji[data.systemHealth.status]} ${data.systemHealth.status.toUpperCase()}
*Stability Score:* ${data.systemHealth.stabilityScore.toFixed(1)}%
*Active Anomalies:* ${data.activeAnomalies.length}
*Recent Incidents:* ${data.recentIncidents.length}

${data.recentIncidents.length > 0 ? `
*Latest Incident:*
${data.recentIncidents[0].summary}
Severity: ${data.recentIncidents[0].severity.toUpperCase()}
` : ''}

${data.aiInsights.length > 0 ? `
*AI Insights:*
${data.aiInsights.map(i => `• ${i.title}`).join('\n')}
` : ''}
`;
}

function formatForMarkdown(data: ReturnType<typeof getDashboardIntelligence>): string {
  return `## AI Intelligence Dashboard

### System Health
- **Status:** ${data.systemHealth.status}
- **Stability Score:** ${data.systemHealth.stabilityScore.toFixed(1)}%
- **Last Incident:** ${data.systemHealth.lastIncident ? new Date(data.systemHealth.lastIncident).toISOString() : 'None'}

### Active Anomalies (${data.activeAnomalies.length})
${data.activeAnomalies.map(a => `- ${a.type} (${a.severity}, ${(a.confidence * 100).toFixed(0)}% confidence)`).join('\n') || 'No active anomalies'}

### Recent Incidents (${data.recentIncidents.length})
${data.recentIncidents.slice(0, 5).map(i => `- ${i.id}: ${i.summary} [${i.severity}]`).join('\n') || 'No recent incidents'}

### AI Insights
${data.aiInsights.map(i => `- **${i.title}** (${i.category}): ${i.description}`).join('\n') || 'No insights available'}
`;
}

// Auto-start telemetry processing if events are available
export function startIntelligenceMonitoring(
  eventProvider: () => TelemetryEvent[],
  intervalMs: number = 30000 // 30 seconds
): () => void {
  console.log('[INTELLIGENCE] Starting AI monitoring...');

  const interval = setInterval(() => {
    const events = eventProvider();
    if (events.length > 0) {
      processTelemetryIntelligence(events);
    }
  }, intervalMs);

  // Return stop function
  return () => {
    clearInterval(interval);
    console.log('[INTELLIGENCE] AI monitoring stopped');
  };
}
