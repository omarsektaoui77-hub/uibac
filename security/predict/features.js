// ZeroLeak Predictive Security - Feature Extraction
// Turn events into signals for prediction

/**
 * Extract features from events
 */
function extractFeatures(events) {
  if (!events || events.length === 0) {
    return {
      total: 0,
      high: 0,
      critical: 0,
      avgRisk: 0,
      timeSpan: 0,
      byType: {},
      byRepo: {}
    };
  }

  const total = events.length;
  const high = events.filter(e => e.level === "HIGH").length;
  const critical = events.filter(e => e.level === "CRITICAL").length;
  const avgRisk = events.reduce((a, e) => a + (e.risk || 0), 0) / total;
  
  // Calculate time span
  const timeSpan = total > 1 
    ? new Date(events[events.length - 1].time) - new Date(events[0].time)
    : 0;

  // Group by type
  const byType = {};
  for (const e of events) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }

  // Group by repo
  const byRepo = {};
  for (const e of events) {
    if (e.repo) {
      byRepo[e.repo] = (byRepo[e.repo] || 0) + 1;
    }
  }

  return {
    total,
    high,
    critical,
    avgRisk,
    timeSpan,
    byType,
    byRepo
  };
}

/**
 * Extract velocity (events per minute)
 */
function extractVelocity(events) {
  if (!events || events.length < 2) return 0;

  const features = extractFeatures(events);
  const minutes = features.timeSpan / (60 * 1000);

  if (minutes === 0) return 0;

  return features.total / minutes;
}

/**
 * Extract acceleration (change in velocity)
 */
function extractAcceleration(events) {
  if (!events || events.length < 3) return 0;

  // Split events into two halves
  const mid = Math.floor(events.length / 2);
  const firstHalf = events.slice(0, mid);
  const secondHalf = events.slice(mid);

  const v1 = extractVelocity(firstHalf);
  const v2 = extractVelocity(secondHalf);

  return v2 - v1;
}

module.exports = {
  extractFeatures,
  extractVelocity,
  extractAcceleration
};
