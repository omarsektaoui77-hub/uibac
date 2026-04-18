// ZeroLeak Living Security Intelligence - Feedback Loop
// Full closure: Action → Outcome → Memory → Future Decisions → Improvement

const { evaluateOutcome } = require("./evaluate");
const { updateStrategy } = require("./learn");
const { log } = require("../soc/audit");

// Strategy memory
const strategyMemory = {};

/**
 * Process feedback loop
 * Action taken → Outcome measured → Stored in memory → Affects future decisions → System improves
 */
async function processFeedback(action, beforeState, afterState) {
  // Evaluate outcome
  const outcome = evaluateOutcome(beforeState, afterState);

  // Update strategy memory
  const strategyName = action.strategy || "default";
  if (!strategyMemory[strategyName]) {
    strategyMemory[strategyName] = {
      successes: 0,
      failures: 0,
      confidence: 0,
      history: []
    };
  }

  const updatedMemory = updateStrategy(strategyMemory[strategyName], outcome);
  strategyMemory[strategyName] = updatedMemory;

  // Log feedback
  log({
    type: "FEEDBACK_LOOP",
    action: action.type,
    strategy: strategyName,
    outcome: outcome.success,
    delta: outcome.delta,
    confidence: updatedMemory.confidence,
    time: new Date().toISOString()
  });

  return {
    outcome,
    strategy: strategyName,
    updatedMemory
  };
}

/**
 * Get strategy recommendations based on feedback
 */
function getStrategyRecommendations() {
  const recommendations = [];

  for (const [name, memory] of Object.entries(strategyMemory)) {
    if (memory.confidence > 0.8) {
      recommendations.push({
        strategy: name,
        confidence: memory.confidence,
        recommendation: "USE"
      });
    } else if (memory.confidence < 0.3) {
      recommendations.push({
        strategy: name,
        confidence: memory.confidence,
        recommendation: "AVOID"
      });
    } else {
      recommendations.push({
        strategy: name,
        confidence: memory.confidence,
        recommendation: "EXPERIMENTAL"
      });
    }
  }

  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get feedback loop statistics
 */
function getFeedbackStats() {
  const totalStrategies = Object.keys(strategyMemory).length;
  const highConfidenceStrategies = Object.values(strategyMemory).filter(s => s.confidence > 0.8).length;
  const lowConfidenceStrategies = Object.values(strategyMemory).filter(s => s.confidence < 0.3).length;

  return {
    totalStrategies,
    highConfidenceStrategies,
    lowConfidenceStrategies,
    strategies: Object.entries(strategyMemory).map(([name, memory]) => ({
      name,
      confidence: memory.confidence,
      successes: memory.successes,
      failures: memory.failures
    }))
  };
}

/**
 * Reset feedback loop
 */
function resetFeedback() {
  for (const key in strategyMemory) {
    delete strategyMemory[key];
  }
}

module.exports = {
  processFeedback,
  getStrategyRecommendations,
  getFeedbackStats,
  resetFeedback
};
