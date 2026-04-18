// ZeroLeak Living Security Intelligence - Self-Awareness and Health Monitoring
// System adapts based on its own quality

const healthMetrics = {
  accuracy: 0,
  stability: 0,
  trust: 0,
  decisionCount: 0,
  falsePositives: 0,
  falseNegatives: 0,
  rollbackSuccessRate: 0,
  agentPerformance: {}
};

/**
 * Track decision accuracy
 */
function trackDecision(decision, actualOutcome) {
  healthMetrics.decisionCount++;

  if (decision === actualOutcome) {
    healthMetrics.accuracy = (healthMetrics.accuracy * (healthMetrics.decisionCount - 1) + 1) / healthMetrics.decisionCount;
  } else {
    healthMetrics.accuracy = (healthMetrics.accuracy * (healthMetrics.decisionCount - 1)) / healthMetrics.decisionCount;
  }
}

/**
 * Track false positive
 */
function trackFalsePositive() {
  healthMetrics.falsePositives++;
}

/**
 * Track false negative
 */
function trackFalseNegative() {
  healthMetrics.falseNegatives++;
}

/**
 * Track rollback success
 */
function trackRollback(success) {
  if (healthMetrics.rollbackSuccessRate === 0) {
    healthMetrics.rollbackSuccessRate = success ? 1 : 0;
  } else {
    healthMetrics.rollbackSuccessRate = (healthMetrics.rollbackSuccessRate + (success ? 1 : 0)) / 2;
  }
}

/**
 * Track agent performance
 */
function trackAgentPerformance(agentName, score) {
  if (!healthMetrics.agentPerformance[agentName]) {
    healthMetrics.agentPerformance[agentName] = {
      avgScore: score,
      count: 1
    };
  } else {
    const perf = healthMetrics.agentPerformance[agentName];
    perf.avgScore = (perf.avgScore * perf.count + score) / (perf.count + 1);
    perf.count++;
  }
}

/**
 * Calculate system stability
 */
function calculateStability() {
  const totalDecisions = healthMetrics.decisionCount;
  if (totalDecisions === 0) return 0;

  const errors = healthMetrics.falsePositives + healthMetrics.falseNegatives;
  const errorRate = errors / totalDecisions;

  return 1 - errorRate;
}

/**
 * Calculate system trust
 */
function calculateTrust() {
  const accuracy = healthMetrics.accuracy;
  const stability = calculateStability();
  const rollbackSuccess = healthMetrics.rollbackSuccessRate;

  return (accuracy + stability + rollbackSuccess) / 3;
}

/**
 * Get overall health
 */
function getHealth() {
  const stability = calculateStability();
  const trust = calculateTrust();

  healthMetrics.stability = stability;
  healthMetrics.trust = trust;

  return {
    accuracy: healthMetrics.accuracy.toFixed(2),
    stability: stability.toFixed(2),
    trust: trust.toFixed(2),
    decisionCount: healthMetrics.decisionCount,
    falsePositives: healthMetrics.falsePositives,
    falseNegatives: healthMetrics.falseNegatives,
    rollbackSuccessRate: healthMetrics.rollbackSuccessRate.toFixed(2),
    agentPerformance: healthMetrics.agentPerformance
  };
}

/**
 * Reset health metrics
 */
function resetHealth() {
  healthMetrics.accuracy = 0;
  healthMetrics.stability = 0;
  healthMetrics.trust = 0;
  healthMetrics.decisionCount = 0;
  healthMetrics.falsePositives = 0;
  healthMetrics.falseNegatives = 0;
  healthMetrics.rollbackSuccessRate = 0;
  healthMetrics.agentPerformance = {};
}

module.exports = {
  trackDecision,
  trackFalsePositive,
  trackFalseNegative,
  trackRollback,
  trackAgentPerformance,
  getHealth,
  resetHealth
};
