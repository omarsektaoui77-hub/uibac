// ZeroLeak Co-Pilot Mode - Learning from Human Decisions
// System learns from human approvals and rejections

const { safeLearn } = require("../soc/safe-learn");
const { log } = require("../soc/audit");

/**
 * Learn from human decision
 */
function learnFromHuman(action, approved, context = {}) {
  console.log("📚 Learning from human decision:");
  console.log(`  Action: ${action}`);
  console.log(`  Approved: ${approved}`);
  
  // If human rejects → system becomes more conservative
  if (!approved) {
    console.log("  → System becoming more conservative");
    increaseConservatism(action, context);
  }
  
  // If human approves → system gains confidence
  if (approved) {
    console.log("  → System gaining confidence");
    increaseConfidence(action, context);
  }
  
  // Log learning event
  log({
    type: "COPILOT_LEARNING",
    action,
    approved,
    context,
    time: new Date().toISOString()
  });
}

/**
 * Increase conservatism for an action
 */
function increaseConservatism(action, context) {
  // Feed into adaptive memory
  // In production, adjust risk thresholds or decision weights
  
  const event = {
    type: "COPILOT_REJECTION",
    action,
    level: "HIGH",
    risk: 8,
    meta: {
      reason: "Human rejected action",
      ...context
    }
  };
  
  // Use safe learning to update baseline
  safeLearn(event, { severity: "HIGH", category: "COPILOT_LEARNING" });
}

/**
 * Increase confidence for an action
 */
function increaseConfidence(action, context) {
  // Feed into adaptive memory
  // In production, adjust risk thresholds or decision weights
  
  const event = {
    type: "COPILOT_APPROVAL",
    action,
    level: "LOW",
    risk: 2,
    meta: {
      reason: "Human approved action",
      ...context
    }
  };
  
  // Use safe learning to update baseline
  safeLearn(event, { severity: "LOW", category: "COPILOT_LEARNING" });
}

/**
 * Get learning statistics
 */
function getLearningStats() {
  // In production, return statistics about learning
  // For now, return placeholder
  return {
    totalDecisions: 0,
    approvals: 0,
    rejections: 0,
    conservatismLevel: "NORMAL"
  };
}

module.exports = {
  learnFromHuman,
  increaseConservatism,
  increaseConfidence,
  getLearningStats
};
