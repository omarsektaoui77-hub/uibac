/**
 * Circuit Breaker & Deadman's Switch
 * Prevents unsafe automation from causing cascading failures
 * SRE-grade safety controls for Auto-Fix pipeline
 */

import { FixAnalysis } from "@/lib/ai/patchAgent";

// Circuit Breaker Configuration
const CIRCUIT_BREAKER_CONFIG = {
  // Confidence threshold (0.0 - 1.0)
  MIN_CONFIDENCE: 0.7,

  // Rate limiting - max PRs per hour
  MAX_PR_PER_HOUR: 3,

  // Max patch size (lines)
  MAX_PATCH_LINES: 20,

  // Critical files that cannot be auto-fixed
  BLOCKED_FILES: [
    "package.json",
    "package-lock.json",
    ".env",
    ".env.local",
    "next.config.js",
    "tsconfig.json",
    "middleware.ts",
    "scripts/",
    "docs/",
  ],

  // Allowed file extensions only
  ALLOWED_EXTENSIONS: [".ts", ".tsx", ".js", ".jsx"],

  // Cooldown period between fixes (ms)
  FIX_COOLDOWN_MS: 5 * 60 * 1000, // 5 minutes

  // Circuit breaker state persistence key
  STORAGE_KEY: "circuit_breaker_state",
};

// Circuit breaker state
interface CircuitBreakerState {
  prCount: number;
  windowStart: number;
  lastFixTimestamp: number;
  consecutiveFailures: number;
  isOpen: boolean;
  openUntil: number;
}

// Fix validation result
export interface FixValidation {
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
}

/**
 * Get or initialize circuit breaker state
 */
function getCircuitState(): CircuitBreakerState {
  if (typeof window === "undefined") {
    return {
      prCount: 0,
      windowStart: Date.now(),
      lastFixTimestamp: 0,
      consecutiveFailures: 0,
      isOpen: false,
      openUntil: 0,
    };
  }

  try {
    const stored = localStorage.getItem(CIRCUIT_BREAKER_CONFIG.STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      // Reset window if hour has passed
      const now = Date.now();
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
    console.error("[CIRCUIT BREAKER] Failed to read state:", e);
  }

  return {
    prCount: 0,
    windowStart: Date.now(),
    lastFixTimestamp: 0,
    consecutiveFailures: 0,
    isOpen: false,
    openUntil: 0,
  };
}

/**
 * Save circuit breaker state
 */
function saveCircuitState(state: CircuitBreakerState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      CIRCUIT_BREAKER_CONFIG.STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (e) {
    console.error("[CIRCUIT BREAKER] Failed to save state:", e);
  }
}

/**
 * Check if circuit breaker is open
 */
function isCircuitOpen(): { open: boolean; reason?: string } {
  const state = getCircuitState();

  if (state.isOpen) {
    const now = Date.now();
    if (now < state.openUntil) {
      const remaining = Math.ceil((state.openUntil - now) / 1000);
      return {
        open: true,
        reason: `Circuit breaker is OPEN (auto-reset in ${remaining}s due to consecutive failures)`,
      };
    } else {
      // Auto-reset circuit
      state.isOpen = false;
      state.consecutiveFailures = 0;
      saveCircuitState(state);
    }
  }

  return { open: false };
}

/**
 * Record a successful fix
 */
export function recordFixSuccess(): void {
  const state = getCircuitState();
  state.consecutiveFailures = 0;
  saveCircuitState(state);
  console.log("[CIRCUIT BREAKER] Fix success recorded - failures reset");
}

/**
 * Record a failed fix
 */
export function recordFixFailure(): void {
  const state = getCircuitState();
  state.consecutiveFailures++;

  // Open circuit after 3 consecutive failures
  if (state.consecutiveFailures >= 3) {
    state.isOpen = true;
    state.openUntil = Date.now() + 30 * 60 * 1000; // 30 min cooldown
    console.error(
      `[CIRCUIT BREAKER] OPENED due to ${state.consecutiveFailures} consecutive failures`
    );
  }

  saveCircuitState(state);
}

/**
 * Increment PR counter for rate limiting
 */
export function incrementPRCounter(): void {
  const state = getCircuitState();
  state.prCount++;
  state.lastFixTimestamp = Date.now();
  saveCircuitState(state);
}

/**
 * Check file path safety
 */
function checkFileSafety(filePath: string): { safe: boolean; reason?: string } {
  // Check blocked files/paths
  for (const blocked of CIRCUIT_BREAKER_CONFIG.BLOCKED_FILES) {
    if (filePath.includes(blocked)) {
      return {
        safe: false,
        reason: `File path matches blocked pattern: ${blocked}`,
      };
    }
  }

  // Check allowed extensions
  const hasAllowedExt = CIRCUIT_BREAKER_CONFIG.ALLOWED_EXTENSIONS.some((ext) =>
    filePath.endsWith(ext)
  );

  if (!hasAllowedExt) {
    return {
      safe: false,
      reason: `File extension not in allowed list: ${CIRCUIT_BREAKER_CONFIG.ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  return { safe: true };
}

/**
 * Count lines in patch
 */
function countPatchLines(patch: string): number {
  return patch.split("\n").length;
}

/**
 * Validate fix against all circuit breaker rules
 */
export function validateFix(fixAnalysis: FixAnalysis): FixValidation {
  const checks = {
    confidenceCheck: true,
    rateLimitCheck: true,
    sizeCheck: true,
    pathCheck: true,
    cooldownCheck: true,
    circuitStateCheck: true,
  };

  const failures: string[] = [];

  // 1. Circuit breaker state check
  const circuitStatus = isCircuitOpen();
  if (circuitStatus.open) {
    checks.circuitStateCheck = false;
    failures.push(circuitStatus.reason!);
  }

  // 2. Confidence check
  const confidence = fixAnalysis.confidence || 0;
  if (confidence < CIRCUIT_BREAKER_CONFIG.MIN_CONFIDENCE) {
    checks.confidenceCheck = false;
    failures.push(
      `Confidence too low: ${confidence.toFixed(2)} < ${CIRCUIT_BREAKER_CONFIG.MIN_CONFIDENCE}`
    );
  }

  // 3. Rate limit check
  const state = getCircuitState();
  if (state.prCount >= CIRCUIT_BREAKER_CONFIG.MAX_PR_PER_HOUR) {
    checks.rateLimitCheck = false;
    failures.push(
      `Rate limit exceeded: ${state.prCount}/${CIRCUIT_BREAKER_CONFIG.MAX_PR_PER_HOUR} PRs this hour`
    );
  }

  // 4. Patch size check
  if (fixAnalysis.patch) {
    const lineCount = countPatchLines(fixAnalysis.patch.patch);
    if (lineCount > CIRCUIT_BREAKER_CONFIG.MAX_PATCH_LINES) {
      checks.sizeCheck = false;
      failures.push(
        `Patch too large: ${lineCount} lines > ${CIRCUIT_BREAKER_CONFIG.MAX_PATCH_LINES} max`
      );
    }
  }

  // 5. Path safety check
  if (fixAnalysis.patch?.file) {
    const pathCheck = checkFileSafety(fixAnalysis.patch.file);
    if (!pathCheck.safe) {
      checks.pathCheck = false;
      failures.push(`Unsafe file path: ${pathCheck.reason}`);
    }
  }

  // 6. Cooldown check
  const now = Date.now();
  const timeSinceLastFix = now - state.lastFixTimestamp;
  if (timeSinceLastFix < CIRCUIT_BREAKER_CONFIG.FIX_COOLDOWN_MS) {
    checks.cooldownCheck = false;
    const remaining = Math.ceil(
      (CIRCUIT_BREAKER_CONFIG.FIX_COOLDOWN_MS - timeSinceLastFix) / 1000
    );
    failures.push(`Cooldown active: ${remaining}s remaining`);
  }

  // Calculate risk level
  let riskLevel: FixValidation["riskLevel"] = "LOW";
  const failedChecks = Object.values(checks).filter((v) => !v).length;

  if (failedChecks === 0) {
    riskLevel = "LOW";
  } else if (failedChecks === 1 && !checks.circuitStateCheck) {
    riskLevel = "MEDIUM";
  } else if (failedChecks <= 2) {
    riskLevel = "HIGH";
  } else {
    riskLevel = "CRITICAL";
  }

  return {
    allowed: failures.length === 0,
    reason: failures.join("; ") || undefined,
    confidence,
    riskLevel,
    checks,
  };
}

/**
 * Get current circuit breaker status for monitoring
 */
export function getCircuitStatus(): {
  state: CircuitBreakerState;
  config: typeof CIRCUIT_BREAKER_CONFIG;
  healthy: boolean;
} {
  const state = getCircuitState();
  const circuitCheck = isCircuitOpen();

  return {
    state,
    config: CIRCUIT_BREAKER_CONFIG,
    healthy: !circuitCheck.open && state.prCount < CIRCUIT_BREAKER_CONFIG.MAX_PR_PER_HOUR,
  };
}

/**
 * Reset circuit breaker (emergency use)
 */
export function resetCircuitBreaker(): void {
  const newState: CircuitBreakerState = {
    prCount: 0,
    windowStart: Date.now(),
    lastFixTimestamp: 0,
    consecutiveFailures: 0,
    isOpen: false,
    openUntil: 0,
  };
  saveCircuitState(newState);
  console.log("[CIRCUIT BREAKER] Manually reset");
}

// Expose for debugging
if (typeof window !== "undefined") {
  (window as any).circuitBreaker = {
    getStatus: getCircuitStatus,
    reset: resetCircuitBreaker,
    recordSuccess: recordFixSuccess,
    recordFailure: recordFixFailure,
  };
}
