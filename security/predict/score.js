// ZeroLeak Predictive Security - Predictive Risk Scoring
// Combines features, trend, and forecast for predictive scoring

const { extractFeatures, extractVelocity } = require("./features");
const { computeTrend, getTrendDirection } = require("./trend");
const { forecastRisk, forecastTrend } = require("./forecast");

/**
 * Compute predictive risk score
 */
function predictiveScore(events) {
  if (!events || events.length < 5) {
    return 0; // Not enough data for prediction
  }

  const f = extractFeatures(events);
  const trend = computeTrend(events);
  const forecast = forecastRisk(events);
  const trendDirection = getTrendDirection(trend);
  const velocity = extractVelocity(events);

  let score = f.avgRisk;

  // Trend adjustment
  if (trendDirection === "RISING") {
    score += 2;
  } else if (trendDirection === "FALLING") {
    score -= 1;
  }

  // Forecast adjustment
  if (forecast >= 8) {
    score += 3;
  } else if (forecast >= 6) {
    score += 1;
  }

  // Critical events adjustment
  if (f.critical > 0) {
    score += 3;
  }

  // High events adjustment
  if (f.high >= 5) {
    score += 2;
  }

  // Velocity adjustment (high velocity = higher risk)
  if (velocity > 10) {
    score += 2;
  }

  return Math.max(0, Math.min(10, score));
}

/**
 * Get predictive risk level
 */
function getPredictiveRiskLevel(score) {
  if (score >= 9) return "CRITICAL";
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
}

/**
 * Get confidence in prediction
 */
function getPredictionConfidence(events) {
  if (!events || events.length < 5) return "LOW";
  if (events.length < 10) return "MEDIUM";
  return "HIGH";
}

/**
 * Get prediction explanation
 */
function getPredictionExplanation(events) {
  const f = extractFeatures(events);
  const trend = computeTrend(events);
  const forecast = forecastRisk(events);
  const trendDirection = getTrendDirection(trend);
  const velocity = extractVelocity(events);

  const reasons = [];

  if (trendDirection === "RISING") {
    reasons.push("Risk is trending upward");
  }

  if (forecast >= 8) {
    reasons.push("Forecast predicts high risk");
  }

  if (f.critical > 0) {
    reasons.push(`Critical events detected (${f.critical})`);
  }

  if (velocity > 10) {
    reasons.push(`High event velocity (${velocity.toFixed(1)} events/min)`);
  }

  return reasons.length > 0 ? reasons : ["Based on current risk levels"];
}

module.exports = {
  predictiveScore,
  getPredictiveRiskLevel,
  getPredictionConfidence,
  getPredictionExplanation
};
