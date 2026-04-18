// ZeroLeak Predictive Security - Trend Detection
// Detect if risk is rising or falling

/**
 * Compute trend from events
 * Returns positive if risk is rising, negative if falling
 */
function computeTrend(events) {
  if (!events || events.length < 5) return 0;

  const risks = events.map(e => e.risk || 0);
  let trend = 0;

  for (let i = 1; i < risks.length; i++) {
    trend += risks[i] - risks[i - 1];
  }

  return trend / risks.length; // positive = rising
}

/**
 * Get trend direction
 */
function getTrendDirection(trend) {
  if (trend > 0.5) return "RISING";
  if (trend < -0.5) return "FALLING";
  return "STABLE";
}

/**
 * Compute trend velocity (how fast is it changing)
 */
function computeTrendVelocity(events, window = 5) {
  if (!events || events.length < window + 1) return 0;

  const recent = events.slice(-window);
  const older = events.slice(-window * 2, -window);

  const recentAvg = recent.reduce((a, e) => a + (e.risk || 0), 0) / recent.length;
  const olderAvg = older.reduce((a, e) => a + (e.risk || 0), 0) / older.length;

  return recentAvg - olderAvg;
}

/**
 * Detect trend reversal
 */
function detectTrendReversal(events) {
  if (!events || events.length < 10) return false;

  const firstHalf = events.slice(0, Math.floor(events.length / 2));
  const secondHalf = events.slice(Math.floor(events.length / 2));

  const trend1 = computeTrend(firstHalf);
  const trend2 = computeTrend(secondHalf);

  // Reversal if signs are different
  return (trend1 > 0 && trend2 < 0) || (trend1 < 0 && trend2 > 0);
}

module.exports = {
  computeTrend,
  getTrendDirection,
  computeTrendVelocity,
  detectTrendReversal
};
