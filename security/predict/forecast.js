// ZeroLeak Predictive Security - Forecast
// Short-term risk forecasting using linear projection

/**
 * Forecast next risk value using linear projection
 */
function forecastRisk(events) {
  if (!events || events.length < 3) return 0;

  const last = events[events.length - 1].risk || 0;
  const prev = events[events.length - 2].risk || 0;

  const delta = last - prev;

  return Math.max(0, Math.min(10, last + delta));
}

/**
 * Forecast risk with weighted average
 */
function forecastRiskWeighted(events) {
  if (!events || events.length < 3) return 0;

  const recent = events.slice(-5);
  const weights = [1, 2, 3, 4, 5];
  
  let weightedDelta = 0;
  let totalWeight = 0;

  for (let i = 1; i < recent.length; i++) {
    const delta = recent[i].risk - recent[i - 1].risk;
    const weight = weights[weights.length - i] || 1;
    weightedDelta += delta * weight;
    totalWeight += weight;
  }

  const avgDelta = weightedDelta / totalWeight;
  const last = events[events.length - 1].risk || 0;

  return Math.max(0, Math.min(10, last + avgDelta));
}

/**
 * Forecast risk trend (direction)
 */
function forecastTrend(events) {
  if (!events || events.length < 3) return "STABLE";

  const forecast = forecastRisk(events);
  const last = events[events.length - 1].risk || 0;

  if (forecast > last + 1) return "RISING";
  if (forecast < last - 1) return "FALLING";
  return "STABLE";
}

/**
 * Forecast time to critical
 */
function forecastTimeToCritical(events) {
  if (!events || events.length < 5) return null;

  const risks = events.map(e => e.risk || 0);
  const criticalThreshold = 8;

  // Find if already critical
  if (risks[risks.length - 1] >= criticalThreshold) {
    return 0;
  }

  // Calculate average velocity
  let totalDelta = 0;
  for (let i = 1; i < risks.length; i++) {
    totalDelta += risks[i] - risks[i - 1];
  }
  const avgDelta = totalDelta / (risks.length - 1);

  if (avgDelta <= 0) return null; // Not trending toward critical

  const currentRisk = risks[risks.length - 1];
  const riskGap = criticalThreshold - currentRisk;
  const stepsToCritical = riskGap / avgDelta;

  // Estimate time based on event frequency
  const features = extractFeatures(events);
  const avgTimeBetweenEvents = features.timeSpan / (events.length - 1);
  const timeToCritical = stepsToCritical * avgTimeBetweenEvents;

  return timeToCritical;
}

const { extractFeatures } = require("./features");

module.exports = {
  forecastRisk,
  forecastRiskWeighted,
  forecastTrend,
  forecastTimeToCritical
};
