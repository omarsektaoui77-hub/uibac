// ZeroLeak Agent Marketplace - Evaluation Engine
// Evaluates agent performance and assigns scores

/**
 * Evaluate agent result and assign score
 */
function evaluate(result) {
  let score = 0;

  // Agent provided actions
  if (result.actions && result.actions.length > 0) {
    score += 2;
  }

  // High confidence
  if (result.confidence >= 0.7) {
    score += 3;
  } else if (result.confidence >= 0.5) {
    score += 1;
  }

  // Safe execution (no errors)
  if (result.safe) {
    score += 5;
  }

  // Reasoning provided
  if (result.reasoning && result.reasoning.length > 0) {
    score += 1;
  }

  return Math.min(10, score);
}

/**
 * Evaluate multiple results
 */
function evaluateBatch(results) {
  return results.map(r => ({
    ...r,
    evaluationScore: evaluate(r)
  }));
}

/**
 * Get evaluation summary
 */
function getEvaluationSummary(results) {
  const evaluated = evaluateBatch(results);

  const avgScore = evaluated.reduce((sum, r) => sum + r.evaluationScore, 0) / evaluated.length;
  const safeCount = evaluated.filter(r => r.safe).length;
  const errorCount = evaluated.length - safeCount;

  return {
    total: evaluated.length,
    avgScore: avgScore.toFixed(2),
    safe: safeCount,
    errors: errorCount,
    topPerformers: evaluated
      .sort((a, b) => b.evaluationScore - a.evaluationScore)
      .slice(0, 3)
      .map(r => r.agent)
  };
}

module.exports = {
  evaluate,
  evaluateBatch,
  getEvaluationSummary
};
