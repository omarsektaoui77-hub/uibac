// ZeroLeak Agent Marketplace - Evolution Logic
// Continuous improvement loop for agents

const { getAllScores, resetScoreboard } = require("./scoreboard");
const { unregister, listAgents } = require("./registry");

/**
 * Prune weak agents based on score threshold
 */
function pruneWeakAgents(threshold = 10) {
  const scores = getAllScores();
  const toRemove = [];

  for (const [name, score] of Object.entries(scores)) {
    if (score < threshold) {
      toRemove.push(name);
    }
  }

  for (const name of toRemove) {
    try {
      unregister(name);
      console.log(`🗑️ Pruned weak agent: ${name} (score: ${scores[name]})`);
    } catch (e) {
      console.warn(`Failed to prune ${name}: ${e.message}`);
    }
  }

  return toRemove;
}

/**
 * Promote top agents (increase priority)
 */
function promoteTopAgents(limit = 3) {
  const scores = getAllScores();
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  console.log(`⬆️ Promoted top ${limit} agents:`, sorted.map(([name]) => name));

  return sorted.map(([name]) => name);
}

/**
 * Evolution cycle (prune + promote)
 */
function evolutionCycle(options = {}) {
  const { pruneThreshold = 10, promoteCount = 3 } = options;

  console.log("🧬 Running evolution cycle...");

  // Prune weak agents
  const pruned = pruneWeakAgents(pruneThreshold);

  // Promote top agents
  const promoted = promoteTopAgents(promoteCount);

  return {
    pruned,
    promoted,
    remainingAgents: listAgents().length
  };
}

/**
 * Reset evolution (clear scoreboard)
 */
function resetEvolution() {
  const previous = resetScoreboard();
  console.log("🔄 Evolution reset - scoreboard cleared");
  return previous;
}

/**
 * Get evolution statistics
 */
function getEvolutionStats() {
  const scores = getAllScores();
  const agents = listAgents();

  return {
    totalAgents: agents.length,
    scoredAgents: Object.keys(scores).length,
    avgScore: Object.values(scores).length > 0
      ? (Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length).toFixed(2)
      : 0,
    topPerformer: Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  };
}

module.exports = {
  pruneWeakAgents,
  promoteTopAgents,
  evolutionCycle,
  resetEvolution,
  getEvolutionStats
};
