// ZeroLeak Living Security Intelligence - Evaluation Engine
// Evaluates action outcomes to make the system "alive"

/**
 * Evaluate outcome of an action
 * Every action must produce a measurable outcome
 */
function evaluateOutcome(before, after) {
  const improvement = after.errorRate < before.errorRate;
  const delta = before.errorRate - after.errorRate;

  return {
    success: improvement,
    delta,
    before,
    after,
    timestamp: new Date().toISOString()
  };
}

/**
 * Evaluate multiple outcomes
 */
function evaluateBatch(outcomes) {
  return outcomes.map(o => ({
    ...o,
    evaluation: evaluateOutcome(o.before, o.after)
  }));
}

/**
 * Get evaluation summary
 */
function getEvaluationSummary(outcomes) {
  const evaluated = evaluateBatch(outcomes);

  const successCount = evaluated.filter(o => o.evaluation.success).length;
  const totalDelta = evaluated.reduce((sum, o) => sum + o.evaluation.delta, 0);

  return {
    total: evaluated.length,
    successCount,
    failureCount: evaluated.length - successCount,
    successRate: (successCount / evaluated.length).toFixed(2),
    avgDelta: (totalDelta / evaluated.length).toFixed(2)
  };
}

/**
 * Compare two strategies
 */
function compareStrategies(strategyA, strategyB) {
  const summaryA = getEvaluationSummary(strategyA.outcomes);
  const summaryB = getEvaluationSummary(strategyB.outcomes);

  return {
    winner: summaryA.successRate > summaryB.successRate ? "A" : "B",
    strategyA: summaryA,
    strategyB: summaryB
  };
}

module.exports = {
  evaluateOutcome,
  evaluateBatch,
  getEvaluationSummary,
  compareStrategies
};
