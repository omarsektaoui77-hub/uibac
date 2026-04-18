// ZeroLeak Evolved Security Brain - Learning System
// Tracks developer behavior and builds profiles over time

const fs = require("fs");
const path = require("path");

// Brain database file
const DB_FILE = path.join(__dirname, "..", "security", "brain-db.json");

/**
 * Load brain database
 */
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    }
  } catch (e) {
    // Return default DB if file doesn't exist or is invalid
  }
  
  return {
    commits: [],
    devProfiles: {},
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Save brain database
 */
function saveDB(db) {
  db.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/**
 * Update developer profile with new risk score
 */
function updateProfile(author, risk, signals = {}) {
  const db = loadDB();
  
  if (!db.devProfiles[author]) {
    db.devProfiles[author] = {
      avgRisk: 0,
      count: 0,
      maxRisk: 0,
      minRisk: Infinity,
      signals: {}
    };
  }
  
  const profile = db.devProfiles[author];
  
  // Update average risk
  profile.avgRisk = (profile.avgRisk * profile.count + risk) / (profile.count + 1);
  profile.count += 1;
  
  // Update max/min risk
  profile.maxRisk = Math.max(profile.maxRisk, risk);
  profile.minRisk = Math.min(profile.minRisk, risk);
  
  // Track signal patterns
  Object.keys(signals).forEach(key => {
    if (!profile.signals[key]) {
      profile.signals[key] = { count: 0, percentage: 0 };
    }
    if (signals[key]) {
      profile.signals[key].count += 1;
    }
    profile.signals[key].percentage = (profile.signals[key].count / profile.count) * 100;
  });
  
  // Add to commit history
  db.commits.push({
    author,
    risk,
    timestamp: new Date().toISOString(),
    signals
  });
  
  // Keep only last 1000 commits to avoid database bloat
  if (db.commits.length > 1000) {
    db.commits = db.commits.slice(-1000);
  }
  
  saveDB(db);
  
  return profile;
}

/**
 * Get developer profile
 */
function getProfile(author) {
  const db = loadDB();
  return db.devProfiles[author] || null;
}

/**
 * Get all developer profiles
 */
function getAllProfiles() {
  const db = loadDB();
  return db.devProfiles;
}

/**
 * Get commit history
 */
function getCommitHistory(limit = 100) {
  const db = loadDB();
  return db.commits.slice(-limit);
}

module.exports = {
  updateProfile,
  getProfile,
  getAllProfiles,
  getCommitHistory,
  loadDB,
  saveDB
};
