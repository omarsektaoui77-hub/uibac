/**
 * Evolution Circuit Breaker
 * 
 * Safety mechanism for the self-evolution system:
 * - Tracks consecutive experiment failures
 * - Disables evolution if stability drops
 * - Prevents cascade of bad architecture changes
 * - Auto-resets after stability recovery
 * 
 * Hard safety guard for the entire evolution layer.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Evolution circuit state */
export type EvolutionCircuitState = 'closed' | 'open' | 'half_open';

/** Circuit breaker configuration */
interface CircuitBreakerConfig {
  readonly max_consecutive_failures: number;
  readonly stability_threshold: number;     // Min stability score to allow evolution
  readonly cooldown_minutes: number;         // Time before half-open
  readonly recovery_successes_needed: number; // Successes to close circuit
}

/** Circuit breaker status */
export interface CircuitBreakerStatus {
  readonly state: EvolutionCircuitState;
  readonly consecutive_failures: number;
  readonly last_failure_at?: number;
  readonly last_success_at?: number;
  readonly evolution_enabled: boolean;
  readonly reason?: string;
  readonly cooldown_remaining_minutes?: number;
  readonly can_create_experiment: boolean;
}

/** Failure record */
interface FailureRecord {
  readonly timestamp: number;
  readonly experiment_id: string;
  readonly reason: string;
  readonly stability_at_failure: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  max_consecutive_failures: 2,           // Stop after 2 failures
  stability_threshold: 60,               // Need 60+ stability score
  cooldown_minutes: 60,                  // 1 hour cooldown
  recovery_successes_needed: 2,          // 2 successes to re-enable
};

// ============================================================================
// STATE
// ============================================================================

let circuitState: EvolutionCircuitState = 'closed';
let consecutiveFailures = 0;
let consecutiveSuccesses = 0;
let lastFailureAt: number | undefined;
let lastSuccessAt: number | undefined;
let halfOpenTimer: NodeJS.Timeout | null = null;
const recentFailures: FailureRecord[] = [];

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Check if evolution is allowed
 * Call before creating any experiment
 */
export function canEvolve(currentStabilityScore: number): {
  allowed: boolean;
  reason?: string;
} {
  // Check circuit state
  if (circuitState === 'open') {
    return {
      allowed: false,
      reason: `Evolution circuit is OPEN due to ${consecutiveFailures} consecutive failures. ` +
        `Cooldown in progress.`,
    };
  }
  
  // Check stability threshold
  if (currentStabilityScore < DEFAULT_CONFIG.stability_threshold) {
    return {
      allowed: false,
      reason: `Stability score (${currentStabilityScore}) below threshold ` +
        `(${DEFAULT_CONFIG.stability_threshold}). Evolution disabled for safety.`,
    };
  }
  
  return { allowed: true };
}

/**
 * Record experiment success
 */
export function recordSuccess(experimentId: string): void {
  consecutiveSuccesses++;
  lastSuccessAt = Date.now();
  
  // If in half-open state, check if we can close
  if (circuitState === 'half_open') {
    if (consecutiveSuccesses >= DEFAULT_CONFIG.recovery_successes_needed) {
      closeCircuit();
    }
  }
  
  console.log(`[EVOLUTION-CB] Success recorded for ${experimentId}. ` +
    `Successes: ${consecutiveSuccesses}, State: ${circuitState}`);
}

/**
 * Record experiment failure
 * May open the circuit
 */
export function recordFailure(
  experimentId: string,
  reason: string,
  stabilityAtFailure: number
): void {
  consecutiveFailures++;
  consecutiveSuccesses = 0;
  lastFailureAt = Date.now();
  
  // Log failure details
  recentFailures.push({
    timestamp: Date.now(),
    experiment_id: experimentId,
    reason,
    stability_at_failure: stabilityAtFailure,
  });
  
  // Trim failure history
  if (recentFailures.length > 10) {
    recentFailures.shift();
  }
  
  // Check if we should open the circuit
  if (consecutiveFailures >= DEFAULT_CONFIG.max_consecutive_failures) {
    openCircuit(stabilityAtFailure);
  }
  
  console.log(`[EVOLUTION-CB] Failure recorded for ${experimentId}. ` +
    `Failures: ${consecutiveFailures}, State: ${circuitState}`);
}

/**
 * Get current circuit breaker status
 */
export function getCircuitStatus(): CircuitBreakerStatus {
  let cooldownRemaining: number | undefined;
  
  if (circuitState === 'open' && lastFailureAt) {
    const elapsedMinutes = (Date.now() - lastFailureAt) / (1000 * 60);
    cooldownRemaining = Math.max(0, DEFAULT_CONFIG.cooldown_minutes - elapsedMinutes);
  }
  
  let reason: string | undefined;
  if (circuitState === 'open') {
    reason = `Circuit opened after ${consecutiveFailures} consecutive failures`;
  }
  
  return {
    state: circuitState,
    consecutive_failures: consecutiveFailures,
    last_failure_at: lastFailureAt,
    last_success_at: lastSuccessAt,
    evolution_enabled: circuitState !== 'open',
    reason,
    cooldown_remaining_minutes: cooldownRemaining,
    can_create_experiment: circuitState === 'closed',
  };
}

/**
 * Force reset circuit (emergency use)
 */
export function forceResetCircuit(adminToken: string): boolean {
  // In production, validate admin token
  if (adminToken !== 'FORCE_RESET_EMERGENCY') {
    return false;
  }
  
  closeCircuit();
  console.log('[EVOLUTION-CB] Circuit FORCE RESET by admin');
  return true;
}

// ============================================================================
// STATE TRANSITIONS
// ============================================================================

function openCircuit(stabilityAtFailure: number): void {
  circuitState = 'open';
  
  console.warn(`[EVOLUTION-CB] CIRCUIT OPENED! ` +
    `Failures: ${consecutiveFailures}, ` +
    `Stability: ${stabilityAtFailure}, ` +
    `Cooldown: ${DEFAULT_CONFIG.cooldown_minutes}min`);
  
  // Schedule transition to half-open after cooldown
  halfOpenTimer = setTimeout(() => {
    transitionToHalfOpen();
  }, DEFAULT_CONFIG.cooldown_minutes * 60 * 1000);
}

function transitionToHalfOpen(): void {
  circuitState = 'half_open';
  consecutiveSuccesses = 0;
  
  console.log('[EVOLUTION-CB] Transitioned to HALF-OPEN. ' +
    `Need ${DEFAULT_CONFIG.recovery_successes_needed} successes to close.`);
}

function closeCircuit(): void {
  circuitState = 'closed';
  consecutiveFailures = 0;
  consecutiveSuccesses = 0;
  
  if (halfOpenTimer) {
    clearTimeout(halfOpenTimer);
    halfOpenTimer = null;
  }
  
  console.log('[EVOLUTION-CB] Circuit CLOSED. Evolution fully enabled.');
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get failure analysis
 */
export function getFailureAnalysis(): {
  recent_failures: FailureRecord[];
  common_failure_reasons: Array<{ reason: string; count: number }>;
  avg_stability_at_failure: number;
} {
  // Count common failure reasons
  const reasonCounts = new Map<string, number>();
  for (const failure of recentFailures) {
    const count = reasonCounts.get(failure.reason) || 0;
    reasonCounts.set(failure.reason, count + 1);
  }
  
  const commonReasons = Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));
  
  const avgStability = recentFailures.length > 0
    ? recentFailures.reduce((s, f) => s + f.stability_at_failure, 0) / recentFailures.length
    : 100;
  
  return {
    recent_failures: [...recentFailures],
    common_failure_reasons: commonReasons,
    avg_stability_at_failure: Math.round(avgStability * 10) / 10,
  };
}

/**
 * Get uptime statistics
 */
export function getUptimeStats(): {
  evolution_enabled_percent: number;
  circuit_openings_24h: number;
  total_experiments_24h: number;
} {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  // Count recent failures
  const recentFailures24h = recentFailures.filter(f => f.timestamp > oneDayAgo);
  
  // Estimate uptime percentage (simplified)
  const circuitOpenTime = circuitState === 'open' && lastFailureAt
    ? now - lastFailureAt
    : 0;
  
  const uptimePercent = Math.max(0, 100 - (circuitOpenTime / (24 * 60 * 60 * 1000)) * 100);
  
  return {
    evolution_enabled_percent: Math.round(uptimePercent * 10) / 10,
    circuit_openings_24h: recentFailures24h.length,
    total_experiments_24h: recentFailures24h.length + (consecutiveSuccesses > 0 ? 1 : 0),
  };
}

// ============================================================================
// DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).evolutionCircuitBreaker = {
    canEvolve,
    recordSuccess,
    recordFailure,
    getCircuitStatus,
    forceResetCircuit,
    getFailureAnalysis,
    getUptimeStats,
  };
}
