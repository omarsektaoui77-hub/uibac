// ZeroLeak Agent Marketplace - Scoreboard
// Tracks agent performance over time

const scores = {};

/**
 * Update agent score
 */
function update(agentName, score) {
  if (!scores[agentName]) {
    scores[agentName] = 0;
  }
  scores[agentName] += score;
}

/**
 * Get top agents by score
 */
function topAgents(limit = 3) {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

/**
 * Get agent score
 */
function getScore(agentName) {
  return scores[agentName] || 0;
}

/**
 * Get all scores
 */
function getAllScores() {
  return { ...scores };
}

/**
 * Reset scoreboard
 */
function resetScoreboard() {
  const previous = { ...scores };
  Object.keys(scores).forEach(key => delete scores[key]);
  return previous;
}

/**
 * Get leaderboard summary
 */
function getLeaderboardSummary() {
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);

  return {
    total: sorted.length,
    top: sorted.slice(0, 3).map(([name, score]) => ({ name, score })),
    bottom: sorted.slice(-3).map(([name, score]) => ({ name, score }))
  };
}

module.exports = {
  update,
  topAgents,
  getScore,
  getAllScores,
  resetScoreboard,
  getLeaderboardSummary
};
