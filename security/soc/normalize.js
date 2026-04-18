// ZeroLeak AI SOC Mode - Normalize Events
// Makes all events comparable for correlation and analysis

/**
 * Normalize event to standard format
 */
function normalize(e) {
  return {
    id: e.id || Date.now(),
    org: e.org || "default-org",
    repo: e.repo || "unknown",
    env: e.env || "dev",
    type: e.type || "UNKNOWN",
    level: e.level || "LOW",
    risk: Number(e.risk || 0),
    actor: e.actor || e.author || "system",
    meta: e.meta || {},
    time: e.time || new Date().toISOString()
  };
}

/**
 * Normalize multiple events
 */
function normalizeAll(events) {
  return events.map(normalize);
}

module.exports = {
  normalize,
  normalizeAll
};
