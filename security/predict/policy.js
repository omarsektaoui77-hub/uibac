// ZeroLeak Predictive Security - Predictive Policy
// Act BEFORE failure based on predictive scores

/**
 * Predictive policy based on score
 */
function predictivePolicy(score) {
  if (score >= 9) {
    return ["BLOCK_DEPLOY", "ALERT_ALL", "PREPARE_ROLLBACK"];
  }

  if (score >= 7) {
    return ["WARN_TEAM", "LIMIT_RELEASE"];
  }

  if (score >= 5) {
    return ["MONITOR", "INCREASE_SCRUTINY"];
  }

  return ["ALLOW"];
}

/**
 * Get policy description
 */
function getPolicyDescription(action) {
  const descriptions = {
    "BLOCK_DEPLOY": "Block all deployments",
    "ALERT_ALL": "Alert all teams",
    "PREPARE_ROLLBACK": "Prepare rollback plan",
    "WARN_TEAM": "Warn team of upcoming risk",
    "LIMIT_RELEASE": "Limit release cadence",
    "MONITOR": "Monitor situation",
    "INCREASE_SCRUTINY": "Increase code review scrutiny",
    "ALLOW": "Allow normal operations"
  };
  
  return descriptions[action] || action;
}

/**
 * Check if action is preventive
 */
function isPreventive(action) {
  const preventive = ["BLOCK_DEPLOY", "PREPARE_ROLLBACK", "LIMIT_RELEASE", "INCREASE_SCRUTINY"];
  return preventive.includes(action);
}

/**
 * Validate predictive decision
 */
function validatePredictiveDecision(score, actions) {
  const warnings = [];

  // Check if preventive actions are appropriate for score
  const hasPreventive = actions.some(isPreventive);
  
  if (hasPreventive && score < 5) {
    warnings.push("Preventive actions for low predictive score");
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

module.exports = {
  predictivePolicy,
  getPolicyDescription,
  isPreventive,
  validatePredictiveDecision
};
