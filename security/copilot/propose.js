// ZeroLeak Co-Pilot Mode - Proposal Engine
// Proposes actions based on risk score

/**
 * Propose actions based on score
 */
function proposeActions(score) {
  if (score >= 9) {
    return ["BLOCK_DEPLOY", "ROLLBACK_READY", "ALERT_ALL"];
  }

  if (score >= 7) {
    return ["LIMIT_RELEASE", "WARN_TEAM"];
  }

  if (score >= 5) {
    return ["MONITOR", "INCREASE_SCRUTINY"];
  }

  return ["ALLOW"];
}

/**
 * Get action description
 */
function getActionDescription(action) {
  const descriptions = {
    "BLOCK_DEPLOY": "Block all deployments",
    "ROLLBACK_READY": "Prepare rollback plan",
    "ALERT_ALL": "Alert all teams",
    "LIMIT_RELEASE": "Limit release cadence",
    "WARN_TEAM": "Warn team of risk",
    "MONITOR": "Monitor situation",
    "INCREASE_SCRUTINY": "Increase code review scrutiny",
    "ALLOW": "Allow normal operations"
  };
  
  return descriptions[action] || action;
}

/**
 * Get action severity
 */
function getActionSeverity(action) {
  const severe = ["BLOCK_DEPLOY", "ROLLBACK_READY", "ALERT_ALL"];
  const moderate = ["LIMIT_RELEASE", "WARN_TEAM", "INCREASE_SCRUTINY"];
  const low = ["ALLOW", "MONITOR"];
  
  if (severe.includes(action)) return "SEVERE";
  if (moderate.includes(action)) return "MODERATE";
  if (low.includes(action)) return "LOW";
  return "UNKNOWN";
}

module.exports = {
  proposeActions,
  getActionDescription,
  getActionSeverity
};
