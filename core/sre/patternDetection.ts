/**
 * Pattern Detection Engine
 * 
 * Detects systemic weaknesses and architectural patterns from telemetry:
 * - Latency hotspots
 * - Failure clusters
 * - Retry loops
 * - Memory leaks
 * - Render performance issues
 * 
 * Identifies structural problems, not just isolated bugs.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Detected system pattern */
export interface SystemPattern {
  readonly id: string;
  readonly type: 'latency' | 'failure_cluster' | 'retry_loop' | 'memory_leak' | 'slow_render' | 'resource_contention';
  readonly location: string;           // Module/component path
  readonly frequency: number;         // Occurrences per hour
  readonly impact_score: number;      // 0-100 severity
  readonly first_seen: number;
  readonly last_seen: number;
  readonly evidence: string[];       // Supporting data points
  readonly confidence: number;        // Detection confidence 0-1
  readonly affected_endpoints?: string[];
  readonly metadata: {
    readonly avg_latency_ms?: number;
    readonly error_rate?: number;
    readonly retry_count?: number;
    readonly memory_growth_rate?: number;
    readonly render_time_ms?: number;
  };
}

/** Pattern detection configuration */
interface DetectionThresholds {
  readonly latency_ms: number;        // >500ms considered slow
  readonly error_rate: number;      // >1% considered problematic
  readonly retry_threshold: number; // >3 retries considered loop
  readonly memory_growth_mb_per_hour: number; // >100MB/hr considered leak
  readonly render_time_ms: number;  // >100ms considered slow
}

/** Telemetry event for analysis */
interface TelemetryEvent {
  readonly timestamp: number;
  readonly type: 'request' | 'error' | 'retry' | 'render' | 'memory';
  readonly location: string;
  readonly duration_ms?: number;
  readonly error_message?: string;
  readonly metadata?: Record<string, number | string>;
}

/** Pattern statistics */
interface PatternStats {
  readonly total_patterns: number;
  readonly by_type: Record<SystemPattern['type'], number>;
  readonly high_impact_count: number;  // score >= 70
  readonly avg_impact_score: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const THRESHOLDS: DetectionThresholds = {
  latency_ms: 500,
  error_rate: 0.01,
  retry_threshold: 3,
  memory_growth_mb_per_hour: 100,
  render_time_ms: 100,
};

// ============================================================================
// STORAGE
// ============================================================================

const detectedPatterns = new Map<string, SystemPattern>();
const telemetryBuffer: TelemetryEvent[] = [];
const patternHistory: Array<{ timestamp: number; patterns: string[] }> = [];

// ============================================================================
// CORE DETECTION FUNCTIONS
// ============================================================================

/**
 * Analyze telemetry events and detect patterns
 * Called periodically by telemetry pipeline
 */
export function analyzeTelemetry(event: TelemetryEvent): void {
  telemetryBuffer.push(event);
  
  // Keep buffer manageable (last 10,000 events)
  if (telemetryBuffer.length > 10000) {
    telemetryBuffer.shift();
  }
  
  // Run detection based on event type
  switch (event.type) {
    case 'request':
      detectLatencyPattern(event);
      break;
    case 'error':
      detectFailureCluster(event);
      break;
    case 'retry':
      detectRetryLoop(event);
      break;
    case 'render':
      detectSlowRender(event);
      break;
    case 'memory':
      detectMemoryLeak(event);
      break;
  }
}

/**
 * Detect latency hotspots
 * Pattern: Multiple slow requests from same location
 */
function detectLatencyPattern(event: TelemetryEvent): void {
  if (!event.duration_ms || event.duration_ms < THRESHOLDS.latency_ms) {
    return;
  }
  
  const location = event.location;
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  // Count slow requests from this location in last hour
  const slowRequests = telemetryBuffer.filter(e => 
    e.location === location &&
    e.type === 'request' &&
    e.duration_ms &&
    e.duration_ms >= THRESHOLDS.latency_ms &&
    e.timestamp > oneHourAgo
  );
  
  if (slowRequests.length >= 10) {
    const avgLatency = slowRequests.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / slowRequests.length;
    const patternId = `latency-${hashString(location)}`;
    
    const pattern: SystemPattern = {
      id: patternId,
      type: 'latency',
      location,
      frequency: slowRequests.length,
      impact_score: Math.min(100, avgLatency / 10),
      first_seen: slowRequests[0]?.timestamp || now,
      last_seen: now,
      evidence: slowRequests.slice(0, 5).map(e => 
        `${e.duration_ms}ms at ${new Date(e.timestamp).toISOString()}`
      ),
      confidence: Math.min(0.95, 0.5 + (slowRequests.length / 50)),
      metadata: {
        avg_latency_ms: avgLatency,
      },
    };
    
    detectedPatterns.set(patternId, pattern);
  }
}

/**
 * Detect failure clusters
 * Pattern: Multiple errors from same location
 */
function detectFailureCluster(event: TelemetryEvent): void {
  const location = event.location;
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  // Count errors from this location in last hour
  const errors = telemetryBuffer.filter(e => 
    e.location === location &&
    e.type === 'error' &&
    e.timestamp > oneHourAgo
  );
  
  if (errors.length >= 5) {
    const totalRequests = telemetryBuffer.filter(e => 
      e.location === location &&
      e.type === 'request' &&
      e.timestamp > oneHourAgo
    ).length;
    
    const errorRate = totalRequests > 0 ? errors.length / totalRequests : 0;
    
    if (errorRate >= THRESHOLDS.error_rate) {
      const patternId = `failure-${hashString(location)}`;
      
      const pattern: SystemPattern = {
        id: patternId,
        type: 'failure_cluster',
        location,
        frequency: errors.length,
        impact_score: Math.min(100, errorRate * 5000),
        first_seen: errors[0]?.timestamp || now,
        last_seen: now,
        evidence: errors.slice(0, 5).map(e => 
          `${e.error_message} at ${new Date(e.timestamp).toISOString()}`
        ),
        confidence: Math.min(0.95, 0.5 + (errors.length / 20)),
        metadata: {
          error_rate: errorRate,
        },
      };
      
      detectedPatterns.set(patternId, pattern);
    }
  }
}

/**
 * Detect retry loops
 * Pattern: Excessive retries from same location
 */
function detectRetryLoop(event: TelemetryEvent): void {
  const location = event.location;
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  // Count retries from this location in last 5 minutes
  const retries = telemetryBuffer.filter(e => 
    e.location === location &&
    e.type === 'retry' &&
    e.timestamp > fiveMinutesAgo
  );
  
  if (retries.length >= THRESHOLDS.retry_threshold) {
    const patternId = `retry-${hashString(location)}`;
    
    const pattern: SystemPattern = {
      id: patternId,
      type: 'retry_loop',
      location,
      frequency: retries.length,
      impact_score: Math.min(100, retries.length * 10),
      first_seen: retries[0]?.timestamp || now,
      last_seen: now,
      evidence: [`${retries.length} retries in 5 minutes`],
      confidence: Math.min(0.9, 0.5 + (retries.length / 20)),
      metadata: {
        retry_count: retries.length,
      },
    };
    
    detectedPatterns.set(patternId, pattern);
  }
}

/**
 * Detect slow renders
 * Pattern: React component render times exceeding threshold
 */
function detectSlowRender(event: TelemetryEvent): void {
  if (!event.duration_ms || event.duration_ms < THRESHOLDS.render_time_ms) {
    return;
  }
  
  const location = event.location;
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  const slowRenders = telemetryBuffer.filter(e => 
    e.location === location &&
    e.type === 'render' &&
    e.duration_ms &&
    e.duration_ms >= THRESHOLDS.render_time_ms &&
    e.timestamp > oneHourAgo
  );
  
  if (slowRenders.length >= 5) {
    const avgRenderTime = slowRenders.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / slowRenders.length;
    const patternId = `render-${hashString(location)}`;
    
    const pattern: SystemPattern = {
      id: patternId,
      type: 'slow_render',
      location,
      frequency: slowRenders.length,
      impact_score: Math.min(100, avgRenderTime),
      first_seen: slowRenders[0]?.timestamp || now,
      last_seen: now,
      evidence: slowRenders.slice(0, 5).map(e => 
        `${e.duration_ms}ms render at ${new Date(e.timestamp).toISOString()}`
      ),
      confidence: Math.min(0.9, 0.5 + (slowRenders.length / 20)),
      metadata: {
        render_time_ms: avgRenderTime,
      },
    };
    
    detectedPatterns.set(patternId, pattern);
  }
}

/**
 * Detect memory leaks
 * Pattern: Continuous memory growth over time
 */
function detectMemoryLeak(event: TelemetryEvent): void {
  const location = event.location;
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  // Get memory readings for this location
  const memoryEvents = telemetryBuffer.filter(e =>
    e.location === location &&
    e.type === 'memory' &&
    (e as any).metadata?.memory_mb &&
    e.timestamp > oneHourAgo
  );

  if (memoryEvents.length >= 3) {
    const firstMemory = Number((memoryEvents[0] as any).metadata?.memory_mb || 0);
    const lastMemory = Number((memoryEvents[memoryEvents.length - 1] as any).metadata?.memory_mb || 0);
    const growth = lastMemory - firstMemory;
    
    if (growth > THRESHOLDS.memory_growth_mb_per_hour) {
      const patternId = `memory-${hashString(location)}`;
      
      const pattern: SystemPattern = {
        id: patternId,
        type: 'memory_leak',
        location,
        frequency: memoryEvents.length,
        impact_score: Math.min(100, growth),
        first_seen: memoryEvents[0]?.timestamp || now,
        last_seen: now,
        evidence: [
          `Memory grew from ${firstMemory}MB to ${lastMemory}MB`,
          `${growth}MB increase in 1 hour`,
        ],
        confidence: Math.min(0.9, 0.5 + (growth / 200)),
        metadata: {
          memory_growth_rate: growth,
        },
      };
      
      detectedPatterns.set(patternId, pattern);
    }
  }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get all detected patterns
 */
export function getPatterns(
  options: { 
    type?: SystemPattern['type']; 
    minImpact?: number; 
    minConfidence?: number;
  } = {}
): SystemPattern[] {
  let patterns = Array.from(detectedPatterns.values());
  
  if (options.type) {
    patterns = patterns.filter(p => p.type === options.type);
  }
  
  if (options.minImpact !== undefined) {
    patterns = patterns.filter(p => p.impact_score >= options.minImpact!);
  }
  
  if (options.minConfidence !== undefined) {
    patterns = patterns.filter(p => p.confidence >= options.minConfidence!);
  }
  
  // Sort by impact score (descending)
  return patterns.sort((a, b) => b.impact_score - a.impact_score);
}

/**
 * Get pattern statistics
 */
export function getPatternStats(): PatternStats {
  const patterns = Array.from(detectedPatterns.values());
  
  const byType: Record<SystemPattern['type'], number> = {
    latency: 0,
    failure_cluster: 0,
    retry_loop: 0,
    memory_leak: 0,
    slow_render: 0,
    resource_contention: 0,
  };
  
  for (const p of patterns) {
    byType[p.type]++;
  }
  
  const highImpact = patterns.filter(p => p.impact_score >= 70);
  const avgImpact = patterns.length > 0
    ? patterns.reduce((s, p) => s + p.impact_score, 0) / patterns.length
    : 0;
  
  return {
    total_patterns: patterns.length,
    by_type: byType,
    high_impact_count: highImpact.length,
    avg_impact_score: Math.round(avgImpact * 10) / 10,
  };
}

/**
 * Get patterns requiring attention (high impact, high confidence)
 */
export function getCriticalPatterns(): SystemPattern[] {
  return getPatterns({ minImpact: 70, minConfidence: 0.7 });
}

/**
 * Clear old patterns (older than 7 days with no recurrence)
 */
export function cleanupOldPatterns(): number {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  let removed = 0;
  for (const [id, pattern] of detectedPatterns) {
    if (pattern.last_seen < sevenDaysAgo) {
      detectedPatterns.delete(id);
      removed++;
    }
  }
  
  return removed;
}

// ============================================================================
// UTILITIES
// ============================================================================

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

// ============================================================================
// DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).patternDetection = {
    analyzeTelemetry,
    getPatterns,
    getPatternStats,
    getCriticalPatterns,
    cleanupOldPatterns,
  };
}
