// ZeroLeak Co-Pilot Mode - Brain Orchestrator
// Full flow: Detect → Propose → Explain → (Approve?) → Act → Learn

const { predictiveScore } = require("../predict/score");
const { computeTrend } = require("../predict/trend");
const { forecastRisk } = require("../predict/forecast");

const { classifyTier, getTierDescription } = require("./tier");
const { proposeActions, getActionDescription } = require("./propose");
const { explainDecision, formatExplanation } = require("./explain");
const { requireApproval } = require("./approval");
const { execute } = require("./execute");
const { learnFromHuman } = require("./learn");
const { log } = require("../soc/audit");

// Safety: Cooldown on repeated actions
const actionCooldown = new Map();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Co-pilot brain - full flow
 */
async function copilotBrain(events, options = {}) {
  const { silent = false, autoApprove = false, override = false } = options;
  
  if (!silent) {
    console.log("🧠 ZeroLeak Co-Pilot Mode");
    console.log("=========================\n");
  }
  
  // Check minimum data threshold
  if (!events || events.length < 5) {
    if (!silent) {
      console.log("⚠️ Insufficient data for co-pilot (need ≥5 events)");
    }
    return {
      valid: false,
      reason: "INSUFFICIENT_DATA"
    };
  }
  
  // Compute predictive signals
  const score = predictiveScore(events);
  const trend = computeTrend(events);
  const forecast = forecastRisk(events);
  
  // Classify tier
  const tier = classifyTier(score);
  
  // Safety rule: AI cannot bypass approval for CRITICAL
  if (tier === "CRITICAL" && !override) {
    if (!silent) {
      console.log("🔒 Safety rule: CRITICAL tier requires human approval");
    }
  }
  
  // Propose actions
  const actions = proposeActions(score);
  
  // Safety: Check cooldown on repeated actions
  const actionsInCooldown = actions.filter(a => {
    const lastExecution = actionCooldown.get(a);
    if (!lastExecution) return false;
    return Date.now() - lastExecution < COOLDOWN_MS;
  });
  
  if (actionsInCooldown.length > 0 && !override) {
    if (!silent) {
      console.log(`⏱️ Cooldown active for: ${actionsInCooldown.join(", ")}`);
    }
  }
  
  // Explain decision
  const explanation = explainDecision({ score, trend, forecast, events });
  const formattedExplanation = formatExplanation(explanation);
  
  if (!silent) {
    console.log("📊 Analysis:");
    console.log(`  Score: ${score}`);
    console.log(`  Tier: ${tier} (${getTierDescription(tier)})`);
    console.log(`  Actions: ${actions.join(", ")}`);
    console.log();
    console.log("🧾 Explanation:");
    console.log(`  Summary: ${formattedExplanation.summary}`);
    console.log(`  Confidence: ${formattedExplanation.confidence}`);
    console.log(`  Reasons: ${formattedExplanation.reasons.join(", ")}`);
    console.log();
  }
  
  // Log to audit
  log({
    type: "COPILOT_DECISION",
    score,
    tier,
    actions,
    explanation: formattedExplanation,
    eventCount: events.length,
    time: new Date().toISOString()
  });
  
  // Require approval (if tier requires it)
  const approvalResult = await requireApproval(tier, actions, { autoApprove });
  
  if (!silent) {
    console.log(`✋ Approval: ${approvalResult.approved ? "APPROVED" : "REJECTED"}`);
    console.log(`  Reason: ${approvalResult.reason}`);
    console.log();
  }
  
  if (!approvalResult.approved) {
    if (!silent) console.log("❌ Human rejected action");
    
    // Learn from rejection
    for (const action of actions) {
      learnFromHuman(action, false, { tier, score, explanation: formattedExplanation });
    }
    
    log({
      type: "COPILOT_REJECTED",
      tier,
      actions,
      reason: approvalResult.reason,
      time: new Date().toISOString()
    });
    
    return {
      approved: false,
      reason: approvalResult.reason,
      tier,
      actions,
      explanation: formattedExplanation
    };
  }
  
  // Execute actions
  if (!silent) console.log("⚡ Executing approved actions...");
  const executionResults = execute(actions);
  
  if (!silent) {
    console.log();
    console.log("📊 Execution Results:");
    executionResults.forEach(r => {
      console.log(`  ${r.success ? "✅" : "❌"} ${r.action}: ${r.message}`);
    });
    console.log();
  }
  
  // Learn from approval
  for (const action of actions) {
    learnFromHuman(action, true, { tier, score, explanation: formattedExplanation });
    
    // Update cooldown
    actionCooldown.set(action, Date.now());
  }
  
  // Log execution
  log({
    type: "COPILOT_EXECUTED",
    tier,
    actions,
    results: executionResults,
    time: new Date().toISOString()
  });
  
  return {
    approved: true,
    tier,
    actions,
    explanation: formattedExplanation,
    executionResults
  };
}

module.exports = { copilotBrain };
