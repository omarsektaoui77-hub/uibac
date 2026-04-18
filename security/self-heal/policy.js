// ZeroLeak Self-Healing Production - Policy Module
// Defines what is allowed to auto-fix with strict safety rules

/**
 * Auto-fixable incidents
 * Only low-risk, reversible fixes are allowed
 */
const AUTO_FIXABLE = {
  ROUTE_TEST: {
    condition: (incident) => incident.events.length >= 3,
    risk: "LOW",
    reversible: true
  },
  BROKEN_REDIRECT: {
    condition: (incident) => incident.severity === "CRITICAL",
    risk: "LOW",
    reversible: true
  },
  PLACEHOLDER_SECRET: {
    condition: (incident) => incident.severity === "HIGH",
    risk: "MEDIUM",
    reversible: true
  },
  BAD_CONFIG: {
    condition: (incident) => incident.severity === "CRITICAL",
    risk: "LOW",
    reversible: true
  }
};

/**
 * Never auto-fix these (non-negotiable)
 */
const NEVER_AUTO_FIX = [
  "DATABASE_CHANGE",
  "AUTH_LOGIC",
  "PAYMENT_ISSUE",
  "DESTRUCTIVE_MIGRATION",
  "DATA_LOSS"
];

/**
 * Check if incident can be auto-fixed
 */
function canAutoFix(incident) {
  // Never auto-fix CRITICAL severity unless explicitly allowed
  if (incident.severity === "CRITICAL" && !AUTO_FIXABLE[incident.type]) {
    return false;
  }

  // Never auto-fix forbidden types
  if (NEVER_AUTO_FIX.includes(incident.type)) {
    return false;
  }

  // Check if type is auto-fixable
  const fixable = AUTO_FIXABLE[incident.type];
  if (!fixable) {
    return false;
  }

  // Check condition
  if (fixable.condition && !fixable.condition(incident)) {
    return false;
  }

  return true;
}

/**
 * Get auto-fix details for incident type
 */
function getAutoFixDetails(incidentType) {
  return AUTO_FIXABLE[incidentType] || null;
}

/**
 * Check if incident type is never auto-fixable
 */
function isNeverAutoFix(type) {
  return NEVER_AUTO_FIX.includes(type);
}

module.exports = {
  canAutoFix,
  getAutoFixDetails,
  isNeverAutoFix,
  AUTO_FIXABLE,
  NEVER_AUTO_FIX
};
