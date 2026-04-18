// ZeroLeak Multi-Agent System - Judge
// The brain that decides based on agent opinions

/**
 * Judge agent decisions and produce final decision
 */
function judge(decisions, options = {}) {
  const { allowDirectExecution = false } = options;
  let finalScore = 0;
  let actions = new Set();
  const weightedReasons = [];

  for (const d of decisions) {
    // Weight score by confidence
    finalScore += d.score * d.confidence;

    // Collect all actions (from _actions if safety rule is active)
    const agentActions = d._actions || d.actions;
    agentActions.forEach(a => actions.add(a));

    // Weight reasoning by confidence
    if (d.confidence > 0.7) {
      weightedReasons.push(`[${d.agent}] ${d.reasoning}`);
    }
  }

  finalScore = Math.min(10, finalScore);

  return {
    score: finalScore,
    actions: [...actions],
    reasoning: weightedReasons.join("; "),
    decisions
  };
}

/**
 * Get judge decision tier
 */
function getJudgeTier(score) {
  if (score >= 9) return "CRITICAL";
  if (score >= 7) return "HIGH";
  if (score >= 5) return "MEDIUM";
  return "LOW";
}

/**
 * Get consensus among agents
 */
function getConsensus(decisions) {
  const votes = {};
  
  for (const d of decisions) {
    const tier = getJudgeTier(d.score);
    votes[tier] = (votes[tier] || 0) + 1;
  }

  const maxVotes = Math.max(...Object.values(votes));
  const consensus = Object.keys(votes).find(tier => votes[tier] === maxVotes);

  return {
    consensus,
    votes,
    unanimous: Object.keys(votes).length === 1
  };
}

module.exports = {
  judge,
  getJudgeTier,
  getConsensus
};
