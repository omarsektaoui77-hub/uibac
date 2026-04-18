// ZeroLeak Living Security Intelligence - Governance Layer
// THE MOST IMPORTANT: Keeps the system from becoming dangerous

const { log } = require("../soc/audit");

// Governance state
const governanceState = {
  autonomyEnabled: true,
  criticalActionsRequireApproval: true,
  actionRateLimit: 10, // per minute
  actionHistory: [],
  killSwitchActive: false
};

/**
 * Check if action is allowed
 */
function isActionAllowed(action) {
  // Kill switch overrides everything
  if (governanceState.killSwitchActive) {
    log({
      type: "GOVERNANCE_BLOCKED",
      reason: "KILL_SWITCH_ACTIVE",
      action,
      time: new Date().toISOString()
    });
    return false;
  }

  // Autonomy disabled
  if (!governanceState.autonomyEnabled) {
    log({
      type: "GOVERNANCE_BLOCKED",
      reason: "AUTONOMY_DISABLED",
      action,
      time: new Date().toISOString()
    });
    return false;
  }

  return true;
}

/**
 * Check rate limit
 */
function checkRateLimit() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Clean old actions
  governanceState.actionHistory = governanceState.actionHistory.filter(
    t => t > oneMinuteAgo
  );

  // Check limit
  if (governanceState.actionHistory.length >= governanceState.actionRateLimit) {
    return false;
  }

  return true;
}

/**
 * Record action for rate limiting
 */
function recordAction() {
  governanceState.actionHistory.push(Date.now());
}

/**
 * Check if critical action requires approval
 */
function requiresApproval(action) {
  const criticalActions = [
    "BLOCK_DEPLOY",
    "ROLLBACK",
    "ROTATE_SECRET",
    "FREEZE_ACCOUNT",
    "EMERGENCY_RESTORE"
  ];

  if (criticalActions.includes(action) && governanceState.criticalActionsRequireApproval) {
    return true;
  }

  return false;
}

/**
 * Activate kill switch (global stop)
 */
function activateKillSwitch() {
  governanceState.killSwitchActive = true;
  log({
    type: "KILL_SWITCH_ACTIVATED",
    time: new Date().toISOString()
  });
}

/**
 * Deactivate kill switch
 */
function deactivateKillSwitch() {
  governanceState.killSwitchActive = false;
  log({
    type: "KILL_SWITCH_DEACTIVATED",
    time: new Date().toISOString()
  });
}

/**
 * Disable autonomy
 */
function disableAutonomy() {
  governanceState.autonomyEnabled = false;
  log({
    type: "AUTONOMY_DISABLED",
    time: new Date().toISOString()
  });
}

/**
 * Enable autonomy
 */
function enableAutonomy() {
  governanceState.autonomyEnabled = true;
  log({
    type: "AUTONOMY_ENABLED",
    time: new Date().toISOString()
  });
}

/**
 * Get governance state
 */
function getGovernanceState() {
  return { ...governanceState };
}

/**
 * Set system health threshold
 */
function setHealthThreshold(threshold) {
  governanceState.healthThreshold = threshold;
}

/**
 * Check system health and disable if below threshold
 */
function checkSystemHealth(health) {
  if (!governanceState.healthThreshold) return true;

  const overallHealth = (health.accuracy + health.stability + health.trust) / 3;

  if (overallHealth < governanceState.healthThreshold) {
    disableAutonomy();
    log({
      type: "AUTONOMY_DISABLED_HEALTH",
      reason: "HEALTH_BELOW_THRESHOLD",
      health,
      threshold: governanceState.healthThreshold,
      time: new Date().toISOString()
    });
    return false;
  }

  return true;
}

module.exports = {
  isActionAllowed,
  checkRateLimit,
  recordAction,
  requiresApproval,
  activateKillSwitch,
  deactivateKillSwitch,
  disableAutonomy,
  enableAutonomy,
  getGovernanceState,
  setHealthThreshold,
  checkSystemHealth
};
