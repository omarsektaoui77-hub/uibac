// ZeroLeak AI SOC Mode - Anomaly Detection
// Z-score style anomaly detection

/**
 * Detect anomaly using z-score
 */
function detectAnomaly(event, baseline) {
  if (!baseline || baseline.count < 10) {
    return false; // Not enough data to determine anomaly
  }
  
  const std = Math.sqrt(baseline.variance / baseline.count);
  if (std === 0) return false;
  
  const z = Math.abs(event.risk - baseline.avgRisk) / std;
  
  return z > 3; // Strong anomaly (3 standard deviations)
}

/**
 * Get anomaly score (0-1)
 */
function getAnomalyScore(event, baseline) {
  if (!baseline || baseline.count < 10) return 0;
  
  const std = Math.sqrt(baseline.variance / baseline.count);
  if (std === 0) return 0;
  
  const z = Math.abs(event.risk - baseline.avgRisk) / std;
  
  // Convert z-score to 0-1 range (cap at 5 sigma)
  return Math.min(z / 5, 1);
}

/**
 * Get anomaly severity
 */
function getAnomalySeverity(event, baseline) {
  if (!baseline || baseline.count < 10) return "NONE";
  
  const score = getAnomalyScore(event, baseline);
  
  if (score >= 0.8) return "CRITICAL";
  if (score >= 0.6) return "HIGH";
  if (score >= 0.4) return "MEDIUM";
  if (score >= 0.2) return "LOW";
  return "NONE";
}

/**
 * Get anomaly description
 */
function getAnomalyDescription(event, baseline) {
  if (!baseline || baseline.count < 10) {
    return "Insufficient baseline data";
  }
  
  const severity = getAnomalySeverity(event, baseline);
  const score = getAnomalyScore(event, baseline);
  
  const diff = event.risk - baseline.avgRisk;
  const direction = diff > 0 ? "higher" : "lower";
  
  return `Risk is ${direction} than baseline (${event.risk} vs ${baseline.avgRisk.toFixed(2)}) - ${severity} anomaly (score: ${(score * 100).toFixed(0)}%)`;
}

module.exports = {
  detectAnomaly,
  getAnomalyScore,
  getAnomalySeverity,
  getAnomalyDescription
};
