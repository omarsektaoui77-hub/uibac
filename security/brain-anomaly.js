// ZeroLeak Evolved Security Brain - Anomaly Detection
// Detects unusual behavior patterns per developer

const { getProfile } = require("./brain-learn");

/**
 * Check if risk score is anomalous for this developer
 */
function isAnomalous(author, risk) {
  const profile = getProfile(author);
  
  if (!profile || profile.count < 3) {
    // Not enough data to determine anomaly
    return false;
  }
  
  // Anomaly if risk is more than 2x the developer's average
  return risk > profile.avgRisk * 2;
}

/**
 * Check if signals are anomalous for this developer
 */
function isSignalAnomalous(author, signals) {
  const profile = getProfile(author);
  
  if (!profile || !profile.signals || Object.keys(profile.signals).length === 0) {
    return false;
  }
  
  const anomalies = [];
  
  Object.keys(signals).forEach(signal => {
    if (signals[signal] && profile.signals[signal]) {
      // Anomaly if signal appears more than 50% more often than usual
      const expectedPercentage = profile.signals[signal].percentage;
      if (expectedPercentage > 0 && signals[signal]) {
        // This is a simplified check - in practice you'd track actual frequency
        anomalies.push(signal);
      }
    }
  });
  
  return anomalies.length > 2; // Anomaly if multiple unusual signals
}

/**
 * Get anomaly score (0-1, higher = more anomalous)
 */
function getAnomalyScore(author, risk, signals) {
  const profile = getProfile(author);
  
  if (!profile || profile.count < 3) {
    return 0; // No baseline, no anomaly score
  }
  
  let score = 0;
  
  // Risk deviation
  const riskDeviation = risk / profile.avgRisk;
  if (riskDeviation > 2) score += 0.5;
  else if (riskDeviation > 1.5) score += 0.3;
  
  // Signal anomalies
  if (isSignalAnomalous(author, signals)) {
    score += 0.3;
  }
  
  // Cap at 1.0
  return Math.min(score, 1.0);
}

/**
 * Get anomaly explanation
 */
function getAnomalyExplanation(author, risk, signals) {
  const profile = getProfile(author);
  const explanations = [];
  
  if (!profile || profile.count < 3) {
    return "Insufficient baseline data";
  }
  
  // Risk deviation
  const riskDeviation = risk / profile.avgRisk;
  if (riskDeviation > 2) {
    explanations.push(`Risk score (${risk}) is ${riskDeviation.toFixed(1)}x higher than your average (${profile.avgRisk.toFixed(1)})`);
  }
  
  // Signal anomalies
  if (isSignalAnomalous(author, signals)) {
    explanations.push("Unusual signal patterns detected");
  }
  
  return explanations.length > 0 ? explanations.join("; ") : "No significant anomalies";
}

module.exports = {
  isAnomalous,
  isSignalAnomalous,
  getAnomalyScore,
  getAnomalyExplanation
};
