// ZeroLeak Self-Healing Mode - Healing Controller
// Makes safe decisions about how to respond to security issues

// Healing action mappings for each risk level
const healingActions = {
  LOW: [],
  MEDIUM: ["warn"],
  HIGH: ["block", "sanitize"],
  CRITICAL: ["block", "sanitize", "alert", "requireRotation"]
};

/**
 * Decide healing actions based on risk level
 */
function decideHealing(level) {
  return healingActions[level] || [];
}

/**
 * Check if healing action is safe
 */
function isHealingSafe(action, safeMode = true) {
  // Some actions should never be automated
  const unsafeActions = ["rotateSecret", "revokeCredential"];
  
  if (unsafeActions.includes(action)) {
    return false;
  }
  
  // Safe mode prevents aggressive actions
  if (safeMode && action === "requireRotation") {
    return false; // Require rotation is a human action, not automated
  }
  
  return true;
}

/**
 * Get healing action description
 */
function getHealingDescription(action) {
  const descriptions = {
    warn: "Issue a warning",
    block: "Block the operation",
    sanitize: "Auto-sanitize known patterns",
    alert: "Send security alert",
    requireRotation: "Require secret rotation (human action)",
    contain: "Contain the threat"
  };
  return descriptions[action] || "Unknown action";
}

module.exports = {
  decideHealing,
  isHealingSafe,
  getHealingDescription
};
