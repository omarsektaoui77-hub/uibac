// ZeroLeak Co-Pilot Mode - Explainability
// Explains AI decisions to humans

/**
 * Explain decision with reasoning
 */
function explainDecision({ score, trend, forecast, events }) {
  const summary = score >= 9 
    ? "High probability of imminent failure"
    : score >= 7 
    ? "Moderate instability detected"
    : "Low risk within acceptable range";

  return {
    summary,
    details: {
      score,
      trend,
      forecast,
      eventCount: events?.length || 0
    },
    reasoning: generateReasoning(score, trend, forecast),
    confidence: calculateConfidence(events?.length || 0)
  };
}

/**
 * Generate detailed reasoning
 */
function generateReasoning(score, trend, forecast) {
  const reasons = [];

  if (score >= 9) {
    reasons.push("Risk score exceeds critical threshold (≥9)");
  } else if (score >= 7) {
    reasons.push("Risk score exceeds high threshold (≥7)");
  }

  if (trend > 0.5) {
    reasons.push("Risk is trending upward");
  } else if (trend < -0.5) {
    reasons.push("Risk is trending downward");
  }

  if (forecast >= 8) {
    reasons.push("Forecast predicts high risk (≥8)");
  } else if (forecast >= 5) {
    reasons.push("Forecast predicts moderate risk (≥5)");
  }

  return reasons.length > 0 ? reasons : ["Based on current risk levels"];
}

/**
 * Calculate confidence in decision
 */
function calculateConfidence(eventCount) {
  if (eventCount >= 10) return "HIGH";
  if (eventCount >= 5) return "MEDIUM";
  return "LOW";
}

/**
 * Format explanation for display
 */
function formatExplanation(explanation) {
  return {
    summary: explanation.summary,
    confidence: explanation.confidence,
    metrics: explanation.details,
    reasons: explanation.reasoning
  };
}

module.exports = {
  explainDecision,
  generateReasoning,
  calculateConfidence,
  formatExplanation
};
