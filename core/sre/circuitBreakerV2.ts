/**
 * Circuit Breaker V2 - Multi-Tenant with Strict Typing
 * Cognitive SRE System - Enhanced Safety Controls
 * 
 * Features:
 * - Multi-tenant circuit breaker states
 * - Per-tenant rate limiting
 * - Strict TypeScript types
 * - Backward compatible with V1
 */

import { FixAnalysis } from "@/core/ai/patchAgent";

// ============================================================================
// STRICT TYPE DEFINITIONS
// ============================================================================

/** Tenant identifier type */
export type TenantId = string | 'default';

/** Risk level classification */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Circuit breaker state */
export interface CircuitState {
  readonly prCount: number;
  readonly windowStart: number;
  readonly lastFixTimestamp: number;
  readonly consecutiveFailures: number;
  readonly isOpen: boolean;
  readonly openUntil: number;
  readonly tenantId: TenantId;
}

/** Circuit breaker configuration */
export interface CircuitBreakerConfig {
  readonly MIN_CONFIDENCE: number;
  readonly MAX_PR_PER_HOUR: number;
  readonly MAX_PATCH_LINES: number;
  readonly BLOCKED_FILES: readonly string[];
  readonly ALLOWED_EXTENSIONS: readonly string[];
  readonly FIX_COOLDOWN_MS: number;
  readonly STORAGE_KEY_PREFIX: string;
  readonly CIRCUIT_OPEN_DURATION_MS: number;
  readonly MAX_CONSECUTIVE_FAILURES: number;
}

/** Fix validation result with strict typing */
export interface FixValidationV2 {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly confidence: number;
  readonly riskLevel: RiskLevel;
  readonly checks: {
    readonly confidenceCheck: boolean;
    readonly rateLimitCheck: boolean;
    readonly sizeCheck: boolean;
    readonly pathCheck: boolean;
    readonly cooldownCheck: boolean;
    readonly circuitStateCheck: boolean;
    readonly tenantLimitCheck: boolean;
  };
  readonly tenantId: TenantId;
  readonly timestamp: number;
}

/** Circuit status for monitoring */
export interface CircuitStatusV2 {
  readonly state: CircuitState;
  readonly config: CircuitBreakerConfig;
  readonly healthy: boolean;
  readonly tenantId: TenantId;
  readonly canAcceptFix: boolean;
  readonly rateLimitRemaining: number;
}

/** Tenant-specific limits */
export interface TenantLimits {
  readonly maxPRPerHour: number;
  readonly maxConsecutiveFailures: number;
  readonly customBlockedFiles?: readonly string[];
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  MIN_CONFIDENCE: 0.7,
  MAX_PR_PER_HOUR: 3,
  MAX_PATCH_LINES: 20,
  BLOCKED_FILES: [
    "package.json",
    "package-lock.json",
    ".env",
    ".env.local",
    ".env.production",
    "next.config.js",
    "tsconfig.json",
    "middleware.ts",
    "middleware.js",
    "auth.ts",
    "auth.config.ts",
    "security.ts",
    "scripts/",
    "docs/",
  ],
  ALLOWED_EXTENSIONS: [".ts", ".tsx", ".js", ".jsx"],
  FIX_COOLDOWN_MS: 5 * 60 * 1000, // 5 minutes
  STORAGE_KEY_PREFIX: "circuit_breaker_v2",
  CIRCUIT_OPEN_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  MAX_CONSECUTIVE_FAILURES: 3,
} as const;

// ============================================================================
// TENANT-SPECIFIC CONFIGURATIONS
// ============================================================================

const TENANT_CONFIGS: Map<TenantId, Partial<TenantLimits>> = new Map();

/** Register tenant-specific limits */
export function registerTenantLimits(
  tenantId: TenantId,
  limits: Partial<TenantLimits>
): void {
  TENANT_CONFIGS.set(tenantId, limits);
}

/** Get effective config for tenant */
function getTenantConfig(tenantId: TenantId): CircuitBreakerConfig {
  const tenantLimits = TENANT_CONFIGS.get(tenantId);
  
  if (!tenantLimits) {
    return DEFAULT_CONFIG;
  }
  
  return {
    ...DEFAULT_CONFIG,
    MAX_PR_PER_HOUR: tenantLimits.maxPRPerHour ?? DEFAULT_CONFIG.MAX_PR_PER_HOUR,
    MAX_CONSECUTIVE_FAILURES: tenantLimits.maxConsecutiveFailures ?? DEFAULT_CONFIG.MAX_CONSECUTIVE_FAILURES,
    BLOCKED_FILES: tenantLimits.customBlockedFiles 
      ? [...DEFAULT_CONFIG.BLOCKED_FILES, ...tenantLimits.customBlockedFiles]
      : DEFAULT_CONFIG.BLOCKED_FILES,
  };
}

// ============================================================================
// STATE MANAGEMENT (MULTI-TENANT)
// ============================================================================

/** Generate storage key for tenant */
function getStorageKey(tenantId: TenantId): string {
  return `${DEFAULT_CONFIG.STORAGE_KEY_PREFIX}_${tenantId}`;
}

/** Get initial state for tenant */
function getInitialState(tenantId: TenantId): CircuitState {
  return {
    prCount: 0,
    windowStart: Date.now(),
    lastFixTimestamp: 0,
    consecutiveFailures: 0,
    isOpen: false,
    openUntil: 0,
    tenantId,
  };
}

/** Get circuit state for specific tenant */
export function getCircuitStateV2(tenantId: TenantId = 'default'): CircuitState {
  if (typeof window === "undefined") {
    return getInitialState(tenantId);
  }

  try {
    const stored = localStorage.getItem(getStorageKey(tenantId));
    if (stored) {
      const parsed = JSON.parse(stored);
      const state: CircuitState = {
        prCount: parsed.prCount ?? 0,
        windowStart: parsed.windowStart ?? Date.now(),
        lastFixTimestamp: parsed.lastFixTimestamp ?? 0,
        consecutiveFailures: parsed.consecutiveFailures ?? 0,
        isOpen: parsed.isOpen ?? false,
        openUntil: parsed.openUntil ?? 0,
        tenantId: parsed.tenantId ?? tenantId,
      };
      
      // Reset window if hour has passed
      const now = Date.now();
      const config = getTenantConfig(tenantId);
      if (now - state.windowStart > 60 * 60 * 1000) {
        return {
          ...state,
          prCount: 0,
          windowStart: now,
        };
      }
      return state;
    }
  } catch (e) {
    console.error(`[CIRCUIT BREAKER V2] Failed to read state for tenant ${tenantId}:`, e);
  }

  return getInitialState(tenantId);
}

/** Save circuit state for specific tenant */
export function saveCircuitStateV2(state: CircuitState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      getStorageKey(state.tenantId),
      JSON.stringify(state)
    );
  } catch (e) {
    console.error(`[CIRCUIT BREAKER V2] Failed to save state for tenant ${state.tenantId}:`, e);
  }
}

/** Get all tenant states (for admin/monitoring) */
export function getAllTenantStates(): CircuitState[] {
  if (typeof window === "undefined") return [];
  
  const states: CircuitState[] = [];
  const prefix = DEFAULT_CONFIG.STORAGE_KEY_PREFIX;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          states.push({
            prCount: parsed.prCount ?? 0,
            windowStart: parsed.windowStart ?? Date.now(),
            lastFixTimestamp: parsed.lastFixTimestamp ?? 0,
            consecutiveFailures: parsed.consecutiveFailures ?? 0,
            isOpen: parsed.isOpen ?? false,
            openUntil: parsed.openUntil ?? 0,
            tenantId: parsed.tenantId ?? 'unknown',
          });
        }
      } catch (e) {
        // Skip invalid entries
      }
    }
  }
  
  return states;
}

// ============================================================================
// CIRCUIT BREAKER LOGIC
// ============================================================================

/** Check if circuit is open for tenant */
export function isCircuitOpenV2(tenantId: TenantId = 'default'): { 
  readonly open: boolean; 
  readonly reason?: string;
  readonly remainingSeconds?: number;
} {
  const state = getCircuitStateV2(tenantId);
  const config = getTenantConfig(tenantId);

  if (state.isOpen) {
    const now = Date.now();
    if (now < state.openUntil) {
      const remaining = Math.ceil((state.openUntil - now) / 1000);
      return {
        open: true,
        reason: `Circuit breaker OPEN for tenant "${tenantId}" (auto-reset in ${remaining}s)`,
        remainingSeconds: remaining,
      };
    } else {
      // Auto-reset circuit
      const newState: CircuitState = {
        ...state,
        isOpen: false,
        consecutiveFailures: 0,
      };
      saveCircuitStateV2(newState);
    }
  }

  return { open: false };
}

/** Record successful fix for tenant */
export function recordFixSuccessV2(tenantId: TenantId = 'default'): void {
  const state = getCircuitStateV2(tenantId);
  const newState: CircuitState = {
    ...state,
    consecutiveFailures: 0,
  };
  saveCircuitStateV2(newState);
  console.log(`[CIRCUIT BREAKER V2] Fix success recorded for tenant "${tenantId}" - failures reset`);
}

/** Record failed fix for tenant */
export function recordFixFailureV2(tenantId: TenantId = 'default'): void {
  const state = getCircuitStateV2(tenantId);
  const config = getTenantConfig(tenantId);
  
  const newConsecutiveFailures = state.consecutiveFailures + 1;
  let newState: CircuitState = {
    ...state,
    consecutiveFailures: newConsecutiveFailures,
  };

  // Open circuit after max consecutive failures
  if (newConsecutiveFailures >= config.MAX_CONSECUTIVE_FAILURES) {
    newState = {
      ...newState,
      isOpen: true,
      openUntil: Date.now() + config.CIRCUIT_OPEN_DURATION_MS,
    };
    console.error(
      `[CIRCUIT BREAKER V2] OPENED for tenant "${tenantId}" due to ${newConsecutiveFailures} consecutive failures`
    );
  }

  saveCircuitStateV2(newState);
}

/** Increment PR counter for tenant */
export function incrementPRCounterV2(tenantId: TenantId = 'default'): void {
  const state = getCircuitStateV2(tenantId);
  const newState: CircuitState = {
    ...state,
    prCount: state.prCount + 1,
    lastFixTimestamp: Date.now(),
  };
  saveCircuitStateV2(newState);
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/** Check file path safety */
function checkFileSafetyV2(
  filePath: string, 
  config: CircuitBreakerConfig
): { readonly safe: boolean; readonly reason?: string } {
  // Check blocked files/paths
  for (const blocked of config.BLOCKED_FILES) {
    if (filePath.includes(blocked)) {
      return {
        safe: false,
        reason: `File path matches blocked pattern: ${blocked}`,
      };
    }
  }

  // Check allowed extensions
  const hasAllowedExt = config.ALLOWED_EXTENSIONS.some((ext) =>
    filePath.endsWith(ext)
  );

  if (!hasAllowedExt) {
    return {
      safe: false,
      reason: `File extension not in allowed list: ${config.ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  return { safe: true };
}

/** Count lines in patch */
function countPatchLines(patch: string): number {
  return patch.split("\n").length;
}

/** Validate fix with full strict typing */
export function validateFixV2(
  fixAnalysis: FixAnalysis,
  tenantId: TenantId = 'default'
): FixValidationV2 {
  const now = Date.now();
  const config = getTenantConfig(tenantId);
  const state = getCircuitStateV2(tenantId);
  
  const checks = {
    confidenceCheck: true,
    rateLimitCheck: true,
    sizeCheck: true,
    pathCheck: true,
    cooldownCheck: true,
    circuitStateCheck: true,
    tenantLimitCheck: true,
  };

  const failures: string[] = [];

  // 1. Circuit breaker state check
  const circuitStatus = isCircuitOpenV2(tenantId);
  if (circuitStatus.open) {
    checks.circuitStateCheck = false;
    failures.push(circuitStatus.reason!);
  }

  // 2. Confidence check
  const confidence = fixAnalysis.confidence ?? 0;
  if (confidence < config.MIN_CONFIDENCE) {
    checks.confidenceCheck = false;
    failures.push(
      `Confidence too low: ${confidence.toFixed(2)} < ${config.MIN_CONFIDENCE}`
    );
  }

  // 3. Rate limit check (per-tenant)
  if (state.prCount >= config.MAX_PR_PER_HOUR) {
    checks.rateLimitCheck = false;
    checks.tenantLimitCheck = false;
    failures.push(
      `Tenant "${tenantId}" rate limit exceeded: ${state.prCount}/${config.MAX_PR_PER_HOUR} PRs this hour`
    );
  }

  // 4. Patch size check
  if (fixAnalysis.patch) {
    const lineCount = countPatchLines(fixAnalysis.patch.patch);
    if (lineCount > config.MAX_PATCH_LINES) {
      checks.sizeCheck = false;
      failures.push(
        `Patch too large: ${lineCount} lines > ${config.MAX_PATCH_LINES} max`
      );
    }
  }

  // 5. Path safety check
  if (fixAnalysis.patch?.file) {
    const pathCheck = checkFileSafetyV2(fixAnalysis.patch.file, config);
    if (!pathCheck.safe) {
      checks.pathCheck = false;
      failures.push(`Unsafe file path: ${pathCheck.reason}`);
    }
  }

  // 6. Cooldown check
  const timeSinceLastFix = now - state.lastFixTimestamp;
  if (timeSinceLastFix < config.FIX_COOLDOWN_MS) {
    checks.cooldownCheck = false;
    const remaining = Math.ceil(
      (config.FIX_COOLDOWN_MS - timeSinceLastFix) / 1000
    );
    failures.push(`Cooldown active: ${remaining}s remaining`);
  }

  // Calculate risk level
  const failedChecks = Object.values(checks).filter((v) => !v).length;
  let riskLevel: RiskLevel;

  if (failedChecks === 0) {
    riskLevel = 'LOW';
  } else if (failedChecks === 1 && !checks.circuitStateCheck) {
    riskLevel = 'MEDIUM';
  } else if (failedChecks <= 2) {
    riskLevel = 'HIGH';
  } else {
    riskLevel = 'CRITICAL';
  }

  return {
    allowed: failures.length === 0,
    reason: failures.join("; ") || undefined,
    confidence,
    riskLevel,
    checks,
    tenantId,
    timestamp: now,
  };
}

// ============================================================================
// STATUS & MONITORING
// ============================================================================

/** Get comprehensive circuit status for tenant */
export function getCircuitStatusV2(tenantId: TenantId = 'default'): CircuitStatusV2 {
  const state = getCircuitStateV2(tenantId);
  const config = getTenantConfig(tenantId);
  const circuitCheck = isCircuitOpenV2(tenantId);

  return {
    state,
    config,
    healthy: !circuitCheck.open && state.prCount < config.MAX_PR_PER_HOUR,
    tenantId,
    canAcceptFix: !circuitCheck.open && state.prCount < config.MAX_PR_PER_HOUR,
    rateLimitRemaining: Math.max(0, config.MAX_PR_PER_HOUR - state.prCount),
  };
}

/** Reset circuit breaker for tenant */
export function resetCircuitBreakerV2(tenantId: TenantId = 'default'): void {
  const newState = getInitialState(tenantId);
  saveCircuitStateV2(newState);
  console.log(`[CIRCUIT BREAKER V2] Manually reset for tenant "${tenantId}"`);
}

/** Reset all tenant circuit breakers (emergency) */
export function resetAllCircuitBreakers(): void {
  const states = getAllTenantStates();
  states.forEach(state => {
    resetCircuitBreakerV2(state.tenantId);
  });
  console.log(`[CIRCUIT BREAKER V2] Reset all ${states.length} tenant circuits`);
}

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================

/** Validate fix (V1 compatibility wrapper) */
export function validateFix(fixAnalysis: FixAnalysis): {
  allowed: boolean;
  reason?: string;
  confidence?: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  checks: {
    confidenceCheck: boolean;
    rateLimitCheck: boolean;
    sizeCheck: boolean;
    pathCheck: boolean;
    cooldownCheck: boolean;
    circuitStateCheck: boolean;
  };
} {
  const result = validateFixV2(fixAnalysis, 'default');
  return {
    allowed: result.allowed,
    reason: result.reason,
    confidence: result.confidence,
    riskLevel: result.riskLevel,
    checks: {
      confidenceCheck: result.checks.confidenceCheck,
      rateLimitCheck: result.checks.rateLimitCheck,
      sizeCheck: result.checks.sizeCheck,
      pathCheck: result.checks.pathCheck,
      cooldownCheck: result.checks.cooldownCheck,
      circuitStateCheck: result.checks.circuitStateCheck,
    },
  };
}

/** Record fix success (V1 compatibility) */
export function recordFixSuccess(): void {
  recordFixSuccessV2('default');
}

/** Record fix failure (V1 compatibility) */
export function recordFixFailure(): void {
  recordFixFailureV2('default');
}

/** Increment PR counter (V1 compatibility) */
export function incrementPRCounter(): void {
  incrementPRCounterV2('default');
}

/** Get circuit status (V1 compatibility) */
export function getCircuitStatus(): {
  state: {
    prCount: number;
    windowStart: number;
    lastFixTimestamp: number;
    consecutiveFailures: number;
    isOpen: boolean;
    openUntil: number;
  };
  config: typeof DEFAULT_CONFIG;
  healthy: boolean;
} {
  const status = getCircuitStatusV2('default');
  return {
    state: status.state,
    config: DEFAULT_CONFIG,
    healthy: status.healthy,
  };
}

/** Reset circuit breaker (V1 compatibility) */
export function resetCircuitBreaker(): void {
  resetCircuitBreakerV2('default');
}

// ============================================================================
// DEBUGGING
// ============================================================================

if (typeof window !== "undefined") {
  (window as any).circuitBreakerV2 = {
    getStatus: getCircuitStatusV2,
    getAllStatuses: getAllTenantStates,
    reset: resetCircuitBreakerV2,
    resetAll: resetAllCircuitBreakers,
    registerTenant: registerTenantLimits,
    recordSuccess: recordFixSuccessV2,
    recordFailure: recordFixFailureV2,
    validate: validateFixV2,
  };
}
