// ZeroLeak AI SOC Mode - Safe Learning
// Controlled learning with security safeguards

const { updateBaseline } = require("./learn");

/**
 * Safe learning - only learn from safe events
 */
function safeLearn(event, classification) {
  // CRITICAL: Never learn from CRITICAL incidents
  if (classification.severity === "CRITICAL") {
    console.log(`[SAFE LEARN] Skipping CRITICAL event ${event.id}`);
    return false;
  }
  
  // Optional: Only learn from LOW/MEDIUM
  if (classification.severity === "HIGH") {
    console.log(`[SAFE LEARN] Skipping HIGH event ${event.id} (optional safety)`);
    return false;
  }
  
  // Learn from LOW/MEDIUM events
  updateBaseline(event);
  console.log(`[SAFE LEARN] Learned from event ${event.id} (severity: ${classification.severity})`);
  return true;
}

/**
 * Delayed learning with cooldown
 */
const cooldowns = new Map();

function delayedLearn(event, classification, cooldownMs = 60 * 1000) {
  const key = `${event.repo}:${event.env}:${event.type}`;
  const lastLearn = cooldowns.get(key) || 0;
  const now = Date.now();
  
  if (now - lastLearn < cooldownMs) {
    console.log(`[SAFE LEARN] Cooldown active for ${key}`);
    return false;
  }
  
  if (safeLearn(event, classification)) {
    cooldowns.set(key, now);
    return true;
  }
  
  return false;
}

/**
 * Sampled learning (learn from subset)
 */
function sampledLearn(event, classification, sampleRate = 0.5) {
  if (Math.random() > sampleRate) {
    console.log(`[SAFE LEARN] Sampling skipped for event ${event.id}`);
    return false;
  }
  
  return safeLearn(event, classification);
}

module.exports = {
  safeLearn,
  delayedLearn,
  sampledLearn
};
