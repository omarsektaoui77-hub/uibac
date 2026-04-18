// ZeroLeak Org Brain - Policy Engine
// Organization-level policy enforcement

/**
 * Organization-level policy rules
 */
function orgPolicy(incident, risk) {
  if (risk >= 9) {
    return ["FREEZE_DEPLOYS", "ALERT_ALL", "START_HEALING"];
  }

  if (risk >= 7) {
    return ["ALERT_SECURITY", "LIMIT_RELEASES"];
  }

  if (risk >= 5) {
    return ["MONITOR", "ALERT_LEADS"];
  }

  return ["MONITOR"];
}

/**
 * Get policy description
 */
function getPolicyDescription(action) {
  const descriptions = {
    "FREEZE_DEPLOYS": "Freeze all deployments across organization",
    "ALERT_ALL": "Alert all security teams and leads",
    "START_HEALING": "Trigger self-healing across affected repos",
    "ALERT_SECURITY": "Alert security team",
    "LIMIT_RELEASES": "Limit release cadence",
    "MONITOR": "Monitor situation",
    "ALERT_LEADS": "Alert team leads"
  };
  
  return descriptions[action] || action;
}

/**
 * Check if action is destructive
 */
function isDestructive(action) {
  const destructive = ["FREEZE_DEPLOYS", "START_HEALING"];
  return destructive.includes(action);
}

/**
 * Get policy by severity
 */
function getPolicyBySeverity(severity) {
  switch (severity) {
    case "CRITICAL":
      return ["FREEZE_DEPLOYS", "ALERT_ALL", "START_HEALING"];
    case "HIGH":
      return ["ALERT_SECURITY", "LIMIT_RELEASES"];
    case "MEDIUM":
      return ["MONITOR", "ALERT_LEADS"];
    case "LOW":
      return ["MONITOR"];
    default:
      return ["MONITOR"];
  }
}

/**
 * Validate policy against incident
 */
function validatePolicy(incident, actions) {
  const warnings = [];
  
  // Check if destructive actions are appropriate
  const destructiveActions = actions.filter(isDestructive);
  
  if (destructiveActions.length > 0 && incident.severity !== "CRITICAL") {
    warnings.push("Destructive actions for non-critical incident");
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

module.exports = {
  orgPolicy,
  getPolicyDescription,
  isDestructive,
  getPolicyBySeverity,
  validatePolicy
};
