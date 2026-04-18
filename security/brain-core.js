// ZeroLeak Autonomous Security Brain - Risk Scoring Engine
// Scores behavioral signals and classifies risk levels

/**
 * Calculate risk score from signals
 */
function score(signals) {
  let risk = 0;

  // Security system updates are lower risk
  if (signals.isSecuritySystemUpdate) {
    risk = 1; // Minimal risk for security system updates
    return risk;
  }

  // High-risk signals
  if (signals.usesEnv) risk += 3;
  if (signals.addsFetch || signals.addsAxios) risk += 3;
  if (signals.addsProcessEnvDirect) risk += 4;
  if (signals.addsEnvConcatenation) risk += 5;

  // Medium-risk signals
  if (signals.addsExternalUrl) risk += 2;
  if (signals.touchesSecurity) risk += 5;
  if (signals.touchesCI) risk += 5;

  // Low-risk signals
  if (signals.addsConsoleLog) risk += 1;

  // Scale risk by change size (large changes are riskier)
  if (signals.fileCount > 5) risk += 2;
  if (signals.lineCount > 50) risk += 2;

  return risk;
}

/**
 * Classify risk level
 */
function classify(risk) {
  if (risk >= 12) return "CRITICAL";
  if (risk >= 8) return "HIGH";
  if (risk >= 4) return "MEDIUM";
  return "LOW";
}

/**
 * Get risk description
 */
function getRiskDescription(level) {
  const descriptions = {
    "CRITICAL": "Extremely dangerous - likely breach attempt",
    "HIGH": "High risk - requires thorough review",
    "MEDIUM": "Moderate risk - review recommended",
    "LOW": "Low risk - normal change"
  };
  return descriptions[level] || "Unknown risk level";
}

/**
 * Get risk color for console output
 */
function getRiskColor(level) {
  const colors = {
    "CRITICAL": "\x1b[31m", // Red
    "HIGH": "\x1b[33m",      // Yellow
    "MEDIUM": "\x1b[36m",    // Cyan
    "LOW": "\x1b[32m"        // Green
  };
  return colors[level] || "\x1b[0m";
}

/**
 * Check if risk exceeds baseline
 */
function exceedsBaseline(risk, baseline) {
  return risk > baseline.maxAllowed;
}

/**
 * Update baseline with new risk score
 */
function updateBaseline(baseline, risk) {
  const newAvg = (baseline.avgRisk * baseline.sampleCount + risk) / (baseline.sampleCount + 1);
  baseline.avgRisk = newAvg;
  baseline.sampleCount++;
  baseline.lastUpdated = new Date().toISOString();
  
  // Auto-adjust maxAllowed if consistently exceeded
  if (risk > baseline.maxAllowed && baseline.avgRisk > baseline.maxAllowed * 0.8) {
    baseline.maxAllowed = Math.ceil(baseline.avgRisk * 1.5);
  }
  
  return baseline;
}

module.exports = {
  score,
  classify,
  getRiskDescription,
  getRiskColor,
  exceedsBaseline,
  updateBaseline
};
