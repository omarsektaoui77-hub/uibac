// ZeroLeak Living Security Intelligence - Learning Engine
// Real adaptation based on outcomes

/**
 * Update strategy based on outcome
 * Strategies gain or lose trust over time
 */
function updateStrategy(memory, outcome) {
  if (!memory) {
    memory = {
      successes: 0,
      failures: 0,
      confidence: 0,
      history: []
    };
  }

  if (outcome.success) {
    memory.successes += 1;
  } else {
    memory.failures += 1;
  }

  // Calculate confidence based on success rate
  const total = memory.successes + memory.failures;
  if (total > 0) {
    memory.confidence = memory.successes / total;
  }

  // Add to history
  memory.history.push({
    success: outcome.success,
    delta: outcome.delta,
    timestamp: new Date().toISOString()
  });

  // Keep only last 100 history entries
  if (memory.history.length > 100) {
    memory.history = memory.history.slice(-100);
  }

  return memory;
}

/**
 * Get strategy statistics
 */
function getStrategyStats(memory) {
  if (!memory) {
    return {
      successes: 0,
      failures: 0,
      confidence: 0,
      history: []
    };
  }

  const total = memory.successes + memory.failures;
  const recentHistory = memory.history.slice(-10);
  const recentSuccessRate = recentHistory.length > 0
    ? recentHistory.filter(h => h.success).length / recentHistory.length
    : 0;

  return {
    successes: memory.successes,
    failures: memory.failures,
    confidence: memory.confidence,
    total,
    recentSuccessRate: recentSuccessRate.toFixed(2)
  };
}

/**
 * Compare strategies by performance
 */
function compareStrategies(strategies) {
  const stats = {};

  for (const [name, memory] of Object.entries(strategies)) {
    stats[name] = getStrategyStats(memory);
  }

  const sorted = Object.entries(stats)
    .sort((a, b) => b[1].confidence - a[1].confidence);

  return {
    best: sorted[0]?.[0] || null,
    worst: sorted[sorted.length - 1]?.[0] || null,
    rankings: sorted.map(([name, s]) => ({ name, ...s }))
  };
}

module.exports = {
  updateStrategy,
  getStrategyStats,
  compareStrategies
};
