// ZeroLeak Predictive Security - Predictive Brain
// Orchestrates predictive analysis and decision making

const { predictiveScore, getPredictiveRiskLevel, getPredictionConfidence, getPredictionExplanation } = require("./score");
const { predictivePolicy, validatePredictiveDecision } = require("./policy");
const { log } = require("../soc/audit");

/**
 * Run predictive analysis on events
 */
function runPredictive(events, options = {}) {
  const { silent = false, autoAct = false, override = false } = options;
  
  if (!silent) {
    console.log("🔮 ZeroLeak Predictive Security");
    console.log("===========================\n");
  }
  
  // Check minimum data threshold (critical safeguard)
  if (!events || events.length < 5) {
    if (!silent) {
      console.log("⚠️ Insufficient data for prediction (need ≥5 events)");
    }
    return {
      score: 0,
      level: "LOW",
      confidence: "LOW",
      actions: ["ALLOW"],
      explanation: ["Insufficient data for prediction"],
      valid: false,
      reason: "MINIMUM_DATA_THRESHOLD"
    };
  }
  
  // Check for hard security rules (never override)
  const hasCriticalEvents = events.some(e => e.level === "CRITICAL" && e.type === "SECRET_LEAK");
  if (hasCriticalEvents && !override) {
    if (!silent) {
      console.log("🚨 Hard security rule: Secret leak detected, predictive analysis skipped");
    }
    return {
      score: 10,
      level: "CRITICAL",
      confidence: "HIGH",
      actions: ["BLOCK_ALL"],
      explanation: ["Hard security rule: Secret leak detected"],
      valid: true,
      reason: "HARD_SECURITY_RULE"
    };
  }
  
  // Compute predictive score
  const score = predictiveScore(events);
  const level = getPredictiveRiskLevel(score);
  const confidence = getPredictionConfidence(events);
  const explanation = getPredictionExplanation(events);
  
  if (!silent) {
    console.log(`🔮 Predictive Score: ${score} → ${level}`);
    console.log(`📊 Confidence: ${confidence}`);
    console.log(`📝 Explanation: ${explanation.join(", ")}`);
  }
  
  // Get policy actions
  const actions = predictivePolicy(score);
  
  if (!silent) {
    console.log(`⚡ Actions: ${actions.join(", ")}`);
  }
  
  // Validate decision
  const validation = validatePredictiveDecision(score, actions);
  
  if (!validation.valid && !silent) {
    console.warn(`⚠️ Validation warnings: ${validation.warnings.join(", ")}`);
  }
  
  // Log to audit with decision reasoning
  log({
    type: "PREDICTIVE_ANALYSIS",
    score,
    level,
    confidence,
    actions,
    explanation,
    eventCount: events.length,
    valid: validation.valid,
    warnings: validation.warnings,
    override,
    time: new Date().toISOString()
  });
  
  // Execute actions (if auto-act enabled and valid)
  if (autoAct && validation.valid && override) {
    if (!silent) console.log(`🤖 Executing predictive actions...`);
    // In production, execute actions here
  } else if (!override && autoAct) {
    if (!silent) console.log(`⚠️ Auto-act requires manual override for predictive actions`);
  }
  
  if (!silent) {
    console.log();
  }
  
  return {
    score,
    level,
    confidence,
    actions,
    explanation,
    valid: validation.valid,
    warnings: validation.warnings,
    reason: validation.valid ? "PREDICTIVE_DECISION" : "VALIDATION_FAILED"
  };
}

module.exports = { runPredictive };
