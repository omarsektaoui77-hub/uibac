// ZeroLeak Co-Pilot Mode - Decision Tiers
// Classifies risk levels to determine approval requirements

/**
 * Classify decision tier based on score
 */
function classifyTier(score) {
  if (score >= 9) return "CRITICAL";   // human required
  if (score >= 7) return "HIGH";       // approval recommended
  return "LOW";                        // auto allowed
}

/**
 * Get tier description
 */
function getTierDescription(tier) {
  const descriptions = {
    "CRITICAL": "Human approval required",
    "HIGH": "Approval recommended",
    "LOW": "Auto-execution allowed"
  };
  
  return descriptions[tier] || tier;
}

/**
 * Check if tier requires approval
 */
function requiresApproval(tier) {
  return tier === "CRITICAL" || tier === "HIGH";
}

/**
 * Check if tier is auto-executable
 */
function isAutoExecutable(tier) {
  return tier === "LOW";
}

module.exports = {
  classifyTier,
  getTierDescription,
  requiresApproval,
  isAutoExecutable
};
