// ZeroLeak AI SOC Mode - Adaptive Classification
// Combines rule-based classification with anomaly detection

const { detectAnomaly, getAnomalySeverity, getAnomalyScore } = require("./anomaly");
const { load } = require("./learn");
const { classify } = require("./classify");

/**
 * Adaptive classification with anomaly detection
 */
function adaptiveClassify(incident) {
  const baselineDB = load();
  
  let anomalyHits = 0;
  let anomalyScore = 0;
  const anomalyDetails = [];
  
  // Check each event for anomalies
  for (const e of incident.events) {
    const key = `${e.repo}:${e.env}:${e.type}`;
    const baseline = baselineDB[key];
    
    if (detectAnomaly(e, baseline)) {
      anomalyHits++;
      anomalyScore += getAnomalyScore(e, baseline);
      anomalyDetails.push({
        event: e.id,
        key,
        severity: getAnomalySeverity(e, baseline),
        score: getAnomalyScore(e, baseline)
      });
    }
  }
  
  // Get rule-based classification
  const ruleBased = classify(incident);
  
  // Adjust severity based on anomalies
  let severity = ruleBased.severity;
  
  // Anomalies can upgrade severity
  if (anomalyHits >= 3) {
    severity = "CRITICAL";
  } else if (anomalyHits >= 1) {
    // Upgrade from LOW to MEDIUM, or MEDIUM to HIGH
    if (severity === "LOW") severity = "MEDIUM";
    else if (severity === "MEDIUM") severity = "HIGH";
  }
  
  // CRITICAL anomalies always result in CRITICAL severity
  const hasCriticalAnomaly = anomalyDetails.some(a => a.severity === "CRITICAL");
  if (hasCriticalAnomaly) {
    severity = "CRITICAL";
  }
  
  return {
    severity,
    category: ruleBased.category,
    riskScore: ruleBased.riskScore,
    confidence: ruleBased.confidence,
    anomalyHits,
    anomalyScore: anomalyScore / Math.max(anomalyHits, 1),
    anomalyDetails,
    isAnomalous: anomalyHits > 0,
    adaptive: true
  };
}

/**
 * Hybrid classification (rule-based + adaptive)
 */
function hybridClassify(incident) {
  const ruleBased = classify(incident);
  const adaptive = adaptiveClassify(incident);
  
  // Use adaptive if anomalies detected, otherwise rule-based
  if (adaptive.isAnomalous) {
    return adaptive;
  }
  
  return {
    ...ruleBased,
    isAnomalous: false,
    adaptive: false
  };
}

module.exports = {
  adaptiveClassify,
  hybridClassify
};
