// ZeroLeak Self-Healing Production - Orchestrator Engine
// Complete control loop: Detect → Classify → Decide → Fix → Verify → (Success ✅ | Rollback 🔙) → Audit

const { canAutoFix } = require("./policy");
const { executeFix } = require("./fix");
const { executeVerification } = require("./verify");
const { rollbackFailure, logEscalation } = require("./rollback");
const { log } = require("../soc/audit");

// Safety guardrails
const MAX_FIXES_PER_INCIDENT = 1;
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const fixHistory = new Map();

/**
 * Check if incident is in cooldown
 */
function isInCooldown(incidentId) {
  const lastFix = fixHistory.get(incidentId);
  if (!lastFix) return false;
  
  const elapsed = Date.now() - lastFix;
  return elapsed < COOLDOWN_MS;
}

/**
 * Check if incident has exceeded max fixes
 */
function hasExceededMaxFixes(incidentId) {
  const count = fixHistory.get(`${incidentId}:count`) || 0;
  return count >= MAX_FIXES_PER_INCIDENT;
}

/**
 * Record fix attempt
 */
function recordFix(incidentId) {
  fixHistory.set(incidentId, Date.now());
  fixHistory.set(`${incidentId}:count`, (fixHistory.get(`${incidentId}:count`) || 0) + 1);
}

/**
 * Self-healing orchestrator
 */
async function selfHeal(incident, url) {
  console.log(`\n🤖 Self-Healing Engine - Incident ${incident.id}`);
  console.log(`   Type: ${incident.type}`);
  console.log(`   Severity: ${incident.severity}`);
  
  // Check if safe to auto-fix
  if (!canAutoFix(incident)) {
    console.log("⚠️ Not safe to auto-fix - escalating to human");
    logEscalation(incident, "Not auto-fixable by policy");
    
    log({
      incident: incident.id,
      action: "SELF_HEAL",
      result: "SKIPPED",
      reason: "Not auto-fixable by policy",
      time: new Date().toISOString()
    });
    
    return { success: false, reason: "Not auto-fixable" };
  }
  
  // Check cooldown
  if (isInCooldown(incident.id)) {
    console.log("⏱️ Incident in cooldown - skipping auto-fix");
    
    log({
      incident: incident.id,
      action: "SELF_HEAL",
      result: "SKIPPED",
      reason: "Cooldown active",
      time: new Date().toISOString()
    });
    
    return { success: false, reason: "Cooldown active" };
  }
  
  // Check max fixes
  if (hasExceededMaxFixes(incident.id)) {
    console.log("🚫 Max fixes exceeded - escalating to human");
    logEscalation(incident, "Max fixes exceeded");
    
    log({
      incident: incident.id,
      action: "SELF_HEAL",
      result: "SKIPPED",
      reason: "Max fixes exceeded",
      time: new Date().toISOString()
    });
    
    return { success: false, reason: "Max fixes exceeded" };
  }
  
  // Record fix attempt
  recordFix(incident.id);
  
  console.log("🔧 Attempting auto-fix...");
  
  // Execute fix
  const fixSuccess = executeFix(incident);
  
  if (!fixSuccess) {
    console.log("❌ Fix execution failed - escalating to human");
    rollbackFailure(incident);
    
    log({
      incident: incident.id,
      action: "SELF_HEAL",
      result: "FAILED",
      reason: "Fix execution failed",
      time: new Date().toISOString()
    });
    
    return { success: false, reason: "Fix execution failed" };
  }
  
  console.log("✅ Fix executed - verifying...");
  
  // Verify fix
  const verifySuccess = await executeVerification(incident, url);
  
  if (!verifySuccess) {
    console.log("❌ Fix verification failed - rolling back");
    rollbackFailure(incident);
    
    log({
      incident: incident.id,
      action: "SELF_HEAL",
      result: "FAILED",
      reason: "Fix verification failed",
      time: new Date().toISOString()
    });
    
    return { success: false, reason: "Fix verification failed" };
  }
  
  console.log("✅ Self-healing successful");
  
  // Log success
  log({
    incident: incident.id,
    action: "SELF_HEAL",
    result: "SUCCESS",
    type: incident.type,
    time: new Date().toISOString()
  });
  
  return { success: true };
}

/**
 * Get fix history statistics
 */
function getFixStats() {
  return {
    totalFixes: fixHistory.size / 2, // Each incident has 2 entries
    activeCooldowns: Array.from(fixHistory.keys())
      .filter(k => !k.includes(":count"))
      .filter(k => isInCooldown(k)).length
  };
}

module.exports = {
  selfHeal,
  getFixStats,
  isInCooldown,
  hasExceededMaxFixes
};
