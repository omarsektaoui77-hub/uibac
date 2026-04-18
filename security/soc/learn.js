// ZeroLeak AI SOC Mode - Learning Engine
// Updates baseline with incremental statistics

const fs = require("fs");
const path = require("path");

const DB = path.join(__dirname, "baseline.json");

/**
 * Load baseline database
 */
function load() {
  try {
    return fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, "utf8")) : {};
  } catch (e) {
    console.error("[SOC LEARN] Failed to load baseline:", e.message);
    return {};
  }
}

/**
 * Save baseline database
 */
function save(data) {
  try {
    fs.writeFileSync(DB, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("[SOC LEARN] Failed to save baseline:", e.message);
  }
}

/**
 * Get baseline key for event
 */
function getKey(event) {
  return `${event.repo || "unknown"}:${event.env || "dev"}:${event.type || "UNKNOWN"}`;
}

/**
 * Update baseline with event
 */
function updateBaseline(event) {
  const db = load();
  const key = getKey(event);
  
  const entry = db[key] || {
    count: 0,
    avgRisk: 0,
    variance: 0,
    minRisk: Infinity,
    maxRisk: -Infinity
  };
  
  // Incremental mean
  const newCount = entry.count + 1;
  const delta = event.risk - entry.avgRisk;
  const newAvg = entry.avgRisk + delta / newCount;
  
  // Incremental variance
  const newVar = entry.variance + delta * (event.risk - newAvg);
  
  // Update min/max
  const newMin = Math.min(entry.minRisk, event.risk);
  const newMax = Math.max(entry.maxRisk, event.risk);
  
  db[key] = {
    count: newCount,
    avgRisk: newAvg,
    variance: newVar,
    minRisk: newMin === Infinity ? event.risk : newMin,
    maxRisk: newMax === -Infinity ? event.risk : newMax,
    lastUpdated: new Date().toISOString()
  };
  
  // Drift protection: decay old data
  if (db[key].count > 10000) {
    db[key].count = 1000;
    db[key].variance = db[key].variance * 0.1; // Decay variance
  }
  
  save(db);
  
  return db[key];
}

/**
 * Get baseline for event
 */
function getBaseline(event) {
  const db = load();
  const key = getKey(event);
  return db[key] || null;
}

/**
 * Reset baseline for specific key
 */
function resetBaseline(repo, env, type) {
  const db = load();
  const key = `${repo}:${env}:${type}`;
  delete db[key];
  save(db);
}

/**
 * Get all baselines
 */
function getAllBaselines() {
  return load();
}

module.exports = {
  load,
  save,
  getKey,
  updateBaseline,
  getBaseline,
  resetBaseline,
  getAllBaselines
};
