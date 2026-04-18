// ZeroLeak AI SOC Mode - Classification Engine
// Classifies incident severity and category

/**
 * Classify incident severity and category
 */
function classify(incident) {
  const count = incident.events.length;
  const high = incident.events.filter(e => e.level === "HIGH").length;
  const critical = incident.events.filter(e => e.level === "CRITICAL").length;
  
  // Calculate severity
  let severity = "LOW";
  if (critical >= 1 || high >= 3 || count >= 5) {
    severity = "CRITICAL";
  } else if (high >= 1 || count >= 3) {
    severity = "HIGH";
  } else if (count >= 2) {
    severity = "MEDIUM";
  }
  
  // Determine category
  let category = "ANOMALY";
  const type = incident.type.toLowerCase();
  
  if (type.includes("secret") || type.includes("leak")) {
    category = "SECRET_LEAK";
  } else if (type.includes("auth") || type.includes("login") || type.includes("credential")) {
    category = "AUTH_ATTACK";
  } else if (type.includes("injection") || type.includes("xss") || type.includes("sql")) {
    category = "CODE_INJECTION";
  } else if (type.includes("scan") || type.includes("code")) {
    category = "CODE_VULNERABILITY";
  } else if (type.includes("network") || type.includes("outbound")) {
    category = "NETWORK_ANOMALY";
  } else if (type.includes("runtime") || type.includes("execution")) {
    category = "RUNTIME_THREAT";
  }
  
  // Calculate risk score
  const riskScore = calculateRiskScore(incident, severity, category);
  
  return {
    severity,
    category,
    riskScore,
    confidence: calculateConfidence(incident)
  };
}

/**
 * Calculate risk score for incident
 */
function calculateRiskScore(incident, severity, category) {
  let score = 0;
  
  // Base score from severity
  const severityScores = { LOW: 1, MEDIUM: 4, HIGH: 7, CRITICAL: 10 };
  score += severityScores[severity] || 1;
  
  // Add score from category
  const categoryScores = {
    SECRET_LEAK: 5,
    AUTH_ATTACK: 4,
    CODE_INJECTION: 4,
    CODE_VULNERABILITY: 2,
    NETWORK_ANOMALY: 2,
    RUNTIME_THREAT: 3,
    ANOMALY: 1
  };
  score += categoryScores[category] || 1;
  
  // Add score from event count
  score += Math.min(incident.events.length, 5);
  
  // Add score from environment
  if (incident.env === "production") score += 3;
  else if (incident.env === "staging") score += 1;
  
  return Math.min(score, 10);
}

/**
 * Calculate confidence level
 */
function calculateConfidence(incident) {
  const count = incident.events.length;
  
  if (count >= 5) return "HIGH";
  if (count >= 3) return "MEDIUM";
  return "LOW";
}

/**
 * Get human-readable description
 */
function getDescription(classification) {
  const { severity, category, riskScore, confidence } = classification;
  
  return `${severity} severity ${category} (risk: ${riskScore}, confidence: ${confidence})`;
}

module.exports = {
  classify,
  calculateRiskScore,
  calculateConfidence,
  getDescription
};
