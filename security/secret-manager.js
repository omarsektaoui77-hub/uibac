// ZeroLeak Secret Manager - Zero Trust Access Control
// Controls who can access secrets and logs all access

const fs = require("fs");
const path = require("path");

// Allowed callers that can access secrets
const ALLOWED_CALLERS = [
  "services/slack.js",
  "services/ai.js",
  "services/firebase.js",
  "lib/firebase.ts",
  "lib/ai/",
  "app/api/"
];

// Audit log file
const AUDIT_LOG = path.join(__dirname, "..", "security.log");

/**
 * Log secret access
 */
function logAccess(secretName, caller, authorized) {
  const timestamp = new Date().toISOString();
  const entry = `${timestamp} | ${authorized ? "GRANTED" : "DENIED"} | ${secretName} | ${caller}\n`;
  
  try {
    fs.appendFileSync(AUDIT_LOG, entry);
  } catch (e) {
    // Fail silently if log can't be written
  }
  
  if (!authorized) {
    console.error(`[SECURITY] Unauthorized secret access attempt: ${secretName} from ${caller}`);
  }
}

/**
 * Get secret with access control
 */
function getSecret(secretName) {
  // Get caller from stack trace
  const stack = new Error().stack;
  const caller = stack.split("\n")[2] || "unknown";
  
  // Check if caller is allowed
  const isAllowed = ALLOWED_CALLERS.some(allowed => caller.includes(allowed));
  
  // Log the access attempt
  logAccess(secretName, caller, isAllowed);
  
  if (!isAllowed) {
    throw new Error(`[SECURITY] Unauthorized secret access: ${secretName}`);
  }
  
  const secret = process.env[secretName];
  
  if (!secret) {
    throw new Error(`[SECURITY] Secret not found: ${secretName}`);
  }
  
  return secret;
}

/**
 * Check if secret exists without accessing it
 */
function hasSecret(secretName) {
  return !!process.env[secretName];
}

/**
 * Get allowed callers list (for configuration)
 */
function getAllowedCallers() {
  return [...ALLOWED_CALLERS];
}

/**
 * Add allowed caller (for configuration)
 */
function addAllowedCaller(caller) {
  if (!ALLOWED_CALLERS.includes(caller)) {
    ALLOWED_CALLERS.push(caller);
  }
}

module.exports = {
  getSecret,
  hasSecret,
  getAllowedCallers,
  addAllowedCaller
};
