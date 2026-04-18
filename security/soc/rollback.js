// ZeroLeak AI SOC Mode - Rollback Module
// Rolls back failed actions to maintain system integrity

const { log } = require("./audit");

/**
 * Rollback a failed action
 */
async function rollback(action, incident, classification) {
  const rollbackResult = {
    action,
    success: false,
    reason: null,
    timestamp: new Date().toISOString()
  };
  
  switch (action) {
    case "BLOCK_CI":
      rollbackResult.success = await rollbackBlockCI(incident);
      rollbackResult.reason = rollbackResult.success ? "CI block rolled back" : "CI block rollback failed";
      break;
      
    case "ALERT_SECURITY":
      rollbackResult.success = await rollbackAlertSecurity(incident);
      rollbackResult.reason = rollbackResult.success ? "Security alert rolled back" : "Alert rollback failed";
      break;
      
    case "ALERT_DEVELOPER":
      rollbackResult.success = await rollbackAlertDeveloper(incident);
      rollbackResult.reason = rollbackResult.success ? "Developer alert rolled back" : "Alert rollback failed";
      break;
      
    case "REQUIRE_ROTATION":
      rollbackResult.success = await rollbackRequireRotation(incident);
      rollbackResult.reason = rollbackResult.success ? "Rotation requirement rolled back" : "Rotation rollback failed";
      break;
      
    case "FREEZE_ACCOUNT":
      rollbackResult.success = await rollbackFreezeAccount(incident);
      rollbackResult.reason = rollbackResult.success ? "Account unfrozen" : "Unfreeze failed";
      break;
      
    case "OPEN_ISSUE":
      rollbackResult.success = await rollbackOpenIssue(incident);
      rollbackResult.reason = rollbackResult.success ? "Issue closed" : "Issue closure failed";
      break;
      
    case "LOG_ONLY":
      rollbackResult.success = true;
      rollbackResult.reason = "Log-only action, no rollback needed";
      break;
      
    default:
      rollbackResult.success = true;
      rollbackResult.reason = "Unknown action, assuming no rollback needed";
  }
  
  // Log rollback
  log({
    type: "ROLLBACK",
    action,
    success: rollbackResult.success,
    reason: rollbackResult.reason,
    incident: incident.id,
    timestamp: rollbackResult.timestamp
  });
  
  return rollbackResult;
}

/**
 * Rollback CI block
 */
async function rollbackBlockCI(incident) {
  console.log(`[ROLLBACK] Unblocking CI for incident ${incident.id}`);
  // In production, unblock CI pipeline
  // For now, assume success
  return true;
}

/**
 * Rollback security alert
 */
async function rollbackAlertSecurity(incident) {
  console.log(`[ROLLBACK] Retracting security alert for incident ${incident.id}`);
  // In production, retract alert
  // For now, assume success
  return true;
}

/**
 * Rollback developer alert
 */
async function rollbackAlertDeveloper(incident) {
  console.log(`[ROLLBACK] Retracting developer alert for incident ${incident.id}`);
  // In production, retract alert
  // For now, assume success
  return true;
}

/**
 * Rollback rotation requirement
 */
async function rollbackRequireRotation(incident) {
  console.log(`[ROLLBACK] Removing rotation requirement for incident ${incident.id}`);
  // In production, remove rotation requirement
  // For now, assume success
  return true;
}

/**
 * Rollback account freeze
 */
async function rollbackFreezeAccount(incident) {
  console.log(`[ROLLBACK] Unfreezing account for incident ${incident.id}`);
  // In production, unfreeze account
  // For now, assume success
  return true;
}

/**
 * Rollback issue creation
 */
async function rollbackOpenIssue(incident) {
  console.log(`[ROLLBACK] Closing issue for incident ${incident.id}`);
  // In production, close issue
  // For now, assume success
  return true;
}

/**
 * Rollback all failed actions
 */
async function rollbackFailed(verifications, incident, classification) {
  const rollbacks = [];
  
  for (const v of verifications) {
    if (!v.success) {
      const rollbackResult = await rollback(v.action, incident, classification);
      rollbacks.push(rollbackResult);
    }
  }
  
  return rollbacks;
}

/**
 * Emergency rollback (rollback all actions)
 */
async function emergencyRollback(actions, incident, classification) {
  const rollbacks = [];
  
  for (const action of actions) {
    const rollbackResult = await rollback(action, incident, classification);
    rollbacks.push(rollbackResult);
  }
  
  return rollbacks;
}

module.exports = {
  rollback,
  rollbackFailed,
  emergencyRollback,
  rollbackBlockCI,
  rollbackAlertSecurity,
  rollbackAlertDeveloper,
  rollbackRequireRotation,
  rollbackFreezeAccount,
  rollbackOpenIssue
};
