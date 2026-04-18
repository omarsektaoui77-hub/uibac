// ZeroLeak Multi-Agent System - Debate Layer
// Optional but powerful - agents can debate decisions

/**
 * Debate layer - agents can discuss and refine decisions
 */
function debate(decisions) {
  return decisions.map(d => {
    // Flag low confidence high scores for debate
    if (d.score > 5 && d.confidence < 0.5) {
      return {
        ...d,
        reasoning: d.reasoning + " (low confidence - needs review)",
        flagged: true
      };
    }

    // Flag conflicting opinions
    if (d.score > 7 && d.actions.length === 0) {
      return {
        ...d,
        reasoning: d.reasoning + " (high score but no actions - needs review)",
        flagged: true
      };
    }

    return d;
  });
}

/**
 * Get debate summary
 */
function getDebateSummary(decisions) {
  const flagged = decisions.filter(d => d.flagged);
  const conflicts = decisions.filter(d => d.score > 7 && d.actions.length === 0);

  return {
    totalDecisions: decisions.length,
    flaggedDecisions: flagged.length,
    conflicts: conflicts.length,
    needsReview: flagged.length > 0 || conflicts.length > 0
  };
}

/**
 * Resolve debate by consensus
 */
function resolveDebate(decisions) {
  const summary = getDebateSummary(decisions);

  if (!summary.needsReview) {
    return decisions;
  }

  // If debate needs review, lower confidence on flagged decisions
  return decisions.map(d => {
    if (d.flagged) {
      return {
        ...d,
        confidence: Math.max(0.1, d.confidence - 0.3),
        reasoning: d.reasoning + " (debate reviewed)"
      };
    }
    return d;
  });
}

module.exports = {
  debate,
  getDebateSummary,
  resolveDebate
};
