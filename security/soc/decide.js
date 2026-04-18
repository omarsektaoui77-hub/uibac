// ZeroLeak AI SOC Mode - Decision Engine
// Decides what actions to take based on incident classification

/**
 * Decide actions for an incident
 */
function decide(incident, classification) {
  const { severity, category, riskScore } = classification;
  const actions = [];

  // CRITICAL severity
  if (severity === "CRITICAL") {
    actions.push("BLOCK_CI");
    actions.push("ALERT_SECURITY");
    
    if (category === "SECRET_LEAK") {
      actions.push("REQUIRE_ROTATION");
    }
    
    if (category === "AUTH_ATTACK") {
      actions.push("FREEZE_ACCOUNT");
    }
  }
  
  // HIGH severity
  else if (severity === "HIGH") {
    actions.push("ALERT_SECURITY");
    actions.push("OPEN_ISSUE");
    
    if (category === "SECRET_LEAK") {
      actions.push("REQUIRE_ROTATION");
    }
  }
  
  // MEDIUM severity
  else if (severity === "MEDIUM") {
    actions.push("ALERT_DEVELOPER");
    actions.push("LOG_ONLY");
  }
  
  // LOW severity
  else {
    actions.push("LOG_ONLY");
  }
  
  // Environment-specific actions
  if (incident.env === "production" && riskScore >= 7) {
    if (!actions.includes("BLOCK_CI")) {
      actions.push("BLOCK_CI");
    }
  }
  
  return actions;
}

/**
 * Get action description
 */
function getActionDescription(action) {
  const descriptions = {
    BLOCK_CI: "Block CI pipeline",
    ALERT_SECURITY: "Alert security team",
    ALERT_DEVELOPER: "Alert developer",
    REQUIRE_ROTATION: "Require secret rotation",
    FREEZE_ACCOUNT: "Freeze user account",
    OPEN_ISSUE: "Create GitHub issue",
    LOG_ONLY: "Log incident only"
  };
  return descriptions[action] || action;
}

/**
 * Check if action is destructive
 */
function isDestructive(action) {
  const destructiveActions = ["BLOCK_CI", "FREEZE_ACCOUNT", "REQUIRE_ROTATION"];
  return destructiveActions.includes(action);
}

module.exports = {
  decide,
  getActionDescription,
  isDestructive
};
