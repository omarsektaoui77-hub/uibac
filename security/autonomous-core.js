// ZeroLeak Autonomous Security System - Decision Layer
// Determines severity and appropriate actions based on risk

// Action mappings for each risk level
const actions = {
  LOW: [],
  MEDIUM: ["warn"],
  HIGH: ["block", "alert"],
  CRITICAL: ["block", "alert", "rollback"]
};

/**
 * Decide risk level based on risk score
 */
function decide(risk) {
  if (risk >= 10) return "CRITICAL";
  if (risk >= 7) return "HIGH";
  if (risk >= 4) return "MEDIUM";
  return "LOW";
}

/**
 * Get actions for a given risk level
 */
function getActions(level) {
  return actions[level] || [];
}

/**
 * Check if action is allowed in safe mode
 */
function isActionAllowed(action, safeMode) {
  // Safe mode prevents destructive actions
  if (safeMode && action === "rollback") {
    return false;
  }
  return true;
}

/**
 * Get action description
 */
function getActionDescription(action) {
  const descriptions = {
    warn: "Issue a warning",
    block: "Block the operation",
    alert: "Send security alert",
    rollback: "Rollback last commit"
  };
  return descriptions[action] || "Unknown action";
}

module.exports = {
  decide,
  getActions,
  isActionAllowed,
  getActionDescription
};
