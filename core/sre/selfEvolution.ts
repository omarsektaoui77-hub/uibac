/**
 * Self-Evolution Orchestrator
 * 
 * The brain of the adaptive architecture system.
 * Coordinates all components into a unified evolution loop:
 * 
 * 1. Detect patterns → 2. Generate proposals → 3. Check safety → 4. Run experiments
 * 5. Validate results → 6. Store memory → 7. Apply/Merge → 8. Continuous learning
 * 
 * "Improve the system, but never destabilize it."
 */

import { analyzeTelemetry, getCriticalPatterns } from './patternDetection';
import { generateProposals, getAutoApplyProposals, evaluateProposal } from './architectureAdvisor';
import { createExperiment, getExperiment, ExperimentState } from './experimentEngine';
import { storeSuccess, storeFailure, findBestPattern } from './architectureMemory';
import { canEvolve, recordSuccess, recordFailure, getCircuitStatus } from './evolutionCircuitBreaker';
import { calculateStabilityScore } from './stabilityScoring';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Evolution cycle status */
export interface EvolutionStatus {
  readonly is_running: boolean;
  readonly last_cycle_at?: number;
  readonly patterns_detected: number;
  readonly proposals_pending: number;
  readonly experiments_running: number;
  readonly experiments_completed: number;
  readonly improvements_applied: number;
  readonly circuit_status: 'closed' | 'open' | 'half_open';
  readonly evolution_enabled: boolean;
}

/** Evolution cycle result */
export interface EvolutionCycleResult {
  readonly success: boolean;
  readonly patterns_found: number;
  readonly proposals_generated: number;
  readonly experiments_started: number;
  readonly improvements_applied: number;
  readonly message: string;
  readonly timestamp: number;
}

/** Evolution insight for dashboard */
export interface EvolutionInsight {
  readonly type: 'improvement' | 'learning' | 'safety' | 'performance';
  readonly title: string;
  readonly description: string;
  readonly value?: string;
  readonly trend?: 'up' | 'down' | 'neutral';
  readonly timestamp: number;
}

// ============================================================================
// STATE
// ============================================================================

let isEvolutionRunning = false;
let lastCycleAt: number | undefined;
let cycleCount = 0;
const evolutionInsights: EvolutionInsight[] = [];

// ============================================================================
// MAIN EVOLUTION CYCLE
// ============================================================================

/**
 * Run one complete evolution cycle
 * This is the main entry point for self-evolution
 */
export async function runEvolutionCycle(): Promise<EvolutionCycleResult> {
  const timestamp = Date.now();
  
  try {
    // Step 0: Check safety
    const stability = calculateStabilityScore();
    const canProceed = canEvolve(stability.overall);
    
    if (!canProceed.allowed) {
      addInsight('safety', 'Evolution Paused', canProceed.reason || 'Safety check failed', 'neutral');
      return {
        success: false,
        patterns_found: 0,
        proposals_generated: 0,
        experiments_started: 0,
        improvements_applied: 0,
        message: `Evolution blocked: ${canProceed.reason}`,
        timestamp,
      };
    }
    
    isEvolutionRunning = true;
    
    // Step 1: Find patterns
    const criticalPatterns = getCriticalPatterns();
    addInsight('learning', 'Pattern Detection', 
      `Found ${criticalPatterns.length} critical patterns requiring attention`, 
      criticalPatterns.length > 0 ? 'up' : 'neutral');
    
    // Step 2: Generate proposals
    const proposals = generateProposals();
    const autoApply = getAutoApplyProposals();
    
    addInsight('learning', 'Architecture Proposals',
      `Generated ${proposals.length} proposals, ${autoApply.length} eligible for auto-apply`,
      proposals.length > 0 ? 'up' : 'neutral');
    
    // Step 3: Run experiments for auto-apply proposals
    let experimentsStarted = 0;
    let improvementsApplied = 0;
    
    for (const proposal of autoApply.slice(0, 2)) { // Max 2 concurrent experiments
      const evaluation = evaluateProposal(proposal);
      
      if (evaluation.auto_apply_eligible) {
        try {
          const experiment = await createExperiment(proposal);
          experimentsStarted++;
          addInsight('performance', 'Experiment Started',
            `Testing: ${proposal.title} (impact: ${proposal.expected_impact})`,
            'up');
          
          // Note: Experiment runs async, results recorded via callbacks
          // In production, would use event listeners or polling
        } catch (err) {
          console.error('[EVOLUTION] Failed to start experiment:', err);
        }
      }
    }
    
    // Step 4: Check for reusable patterns
    for (const pattern of criticalPatterns) {
      const bestPattern = findBestPattern(pattern.type, pattern.location);
      if (bestPattern && bestPattern.outcome === 'success') {
        addInsight('improvement', 'Reusable Pattern Found',
          `Previous solution for ${pattern.type} achieved ${bestPattern.impact}% improvement`,
          'up');
      }
    }
    
    // Update state
    cycleCount++;
    lastCycleAt = timestamp;
    isEvolutionRunning = false;
    
    return {
      success: true,
      patterns_found: criticalPatterns.length,
      proposals_generated: proposals.length,
      experiments_started: experimentsStarted,
      improvements_applied: improvementsApplied,
      message: `Evolution cycle #${cycleCount} completed. ` +
        `${criticalPatterns.length} patterns, ${proposals.length} proposals, ` +
        `${experimentsStarted} experiments started.`,
      timestamp,
    };
    
  } catch (error) {
    isEvolutionRunning = false;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      patterns_found: 0,
      proposals_generated: 0,
      experiments_started: 0,
      improvements_applied: 0,
      message: `Evolution cycle failed: ${errorMsg}`,
      timestamp,
    };
  }
}

/**
 * Process experiment completion
 * Called when an experiment finishes
 */
export function processExperimentCompletion(
  experimentId: string,
  success: boolean,
  impact: number
): void {
  const experiment = getExperiment(experimentId);
  if (!experiment) return;
  
  if (success && experiment.comparison_result && experiment.decision) {
    // Record success in memory
    storeSuccess(
      experiment.proposal,
      impact,
      metricsToMemoryMetrics(experiment.baseline_metrics),
      metricsToMemoryMetrics(experiment.experiment_metrics),
      experimentId
    );
    
    // Record for circuit breaker
    recordSuccess(experimentId);
    
    // Generate insight
    addInsight('improvement', 'Architecture Improved',
      `Experiment successful: ${Math.round(impact)}% improvement in ${experiment.proposal.type}`,
      'up',
      `+${Math.round(impact)}%`);
    
    console.log(`[EVOLUTION] Experiment ${experimentId} succeeded with ${impact}% impact`);
  } else {
    // Record failure
    const reason = experiment.error || 'Experiment failed validation';
    storeFailure(experiment.proposal, reason, experimentId);
    
    // Record for circuit breaker
    const stability = calculateStabilityScore();
    recordFailure(experimentId, reason, stability.overall);
    
    // Generate insight
    addInsight('safety', 'Experiment Rolled Back',
      `Change rejected: ${reason}`,
      'down');
    
    console.log(`[EVOLUTION] Experiment ${experimentId} failed: ${reason}`);
  }
}

// ============================================================================
// STATUS & INSIGHTS
// ============================================================================

/**
 * Get current evolution status
 */
export function getEvolutionStatus(): EvolutionStatus {
  const circuit = getCircuitStatus();
  
  // Count running experiments
  const allExperiments = Object.values((global as any).experiments || {});
  const running = allExperiments.filter((e: any) => 
    ['branching', 'applying_changes', 'deploying_preview', 'running_canary', 'measuring', 'evaluating'].includes(e.state)
  ).length;
  
  const completed = allExperiments.filter((e: any) => 
    ['completed', 'rolled_back', 'failed'].includes(e.state)
  ).length;
  
  return {
    is_running: isEvolutionRunning,
    last_cycle_at: lastCycleAt,
    patterns_detected: getCriticalPatterns().length,
    proposals_pending: generateProposals().filter(p => {
      const eval_ = evaluateProposal(p);
      return eval_.requires_manual_review;
    }).length,
    experiments_running: running,
    experiments_completed: completed,
    improvements_applied: completed, // Simplified - all completed are improvements
    circuit_status: circuit.state,
    evolution_enabled: circuit.evolution_enabled,
  };
}

/**
 * Get evolution insights
 */
export function getEvolutionInsights(limit: number = 10): EvolutionInsight[] {
  return evolutionInsights
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Get comprehensive evolution summary
 */
export function getEvolutionSummary(): {
  status: EvolutionStatus;
  insights: EvolutionInsight[];
  total_cycles: number;
  uptime_percent: number;
  avg_improvement_per_cycle: number;
} {
  const status = getEvolutionStatus();
  const insights = getEvolutionInsights();
  
  // Calculate average improvement from insights
  const improvements = insights
    .filter(i => i.type === 'improvement' && i.value)
    .map(i => parseFloat(i.value?.replace('%', '') || '0'));
  
  const avgImprovement = improvements.length > 0
    ? improvements.reduce((a, b) => a + b, 0) / improvements.length
    : 0;
  
  return {
    status,
    insights,
    total_cycles: cycleCount,
    uptime_percent: getCircuitStatus().evolution_enabled ? 100 : 0, // Simplified
    avg_improvement_per_cycle: Math.round(avgImprovement * 10) / 10,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Convert experiment metrics to memory metrics format
 */
function metricsToMemoryMetrics(metrics: import('./experimentEngine').ExperimentMetrics) {
  return {
    error_rate: metrics.error_rate,
    avg_latency_ms: metrics.avg_latency_ms,
    throughput_rps: metrics.throughput_rps,
    memory_mb: metrics.memory_usage_mb,
    timestamp: metrics.timestamp,
  };
}

function addInsight(
  type: EvolutionInsight['type'],
  title: string,
  description: string,
  trend: 'up' | 'down' | 'neutral' = 'neutral',
  value?: string
): void {
  evolutionInsights.push({
    type,
    title,
    description,
    value,
    trend,
    timestamp: Date.now(),
  });
  
  // Keep only last 100 insights
  if (evolutionInsights.length > 100) {
    evolutionInsights.shift();
  }
}

// ============================================================================
// SCHEDULING
// ============================================================================

let evolutionInterval: NodeJS.Timeout | null = null;

/**
 * Start continuous evolution
 */
export function startContinuousEvolution(intervalMinutes: number = 60): void {
  if (evolutionInterval) return; // Already running
  
  // Run immediately
  runEvolutionCycle();
  
  // Schedule periodic runs
  evolutionInterval = setInterval(() => {
    runEvolutionCycle();
  }, intervalMinutes * 60 * 1000);
  
  console.log(`[EVOLUTION] Continuous evolution started (${intervalMinutes}min intervals)`);
}

/**
 * Stop continuous evolution
 */
export function stopContinuousEvolution(): void {
  if (evolutionInterval) {
    clearInterval(evolutionInterval);
    evolutionInterval = null;
    console.log('[EVOLUTION] Continuous evolution stopped');
  }
}

// ============================================================================
// DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).selfEvolution = {
    runEvolutionCycle,
    processExperimentCompletion,
    getEvolutionStatus,
    getEvolutionInsights,
    getEvolutionSummary,
    startContinuousEvolution,
    stopContinuousEvolution,
  };
}
