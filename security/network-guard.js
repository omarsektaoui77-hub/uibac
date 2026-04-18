// ZeroLeak Network Guard - Zero Trust Outbound Restriction
// Intercepts and blocks unauthorized outbound requests

const fs = require("fs");
const path = require("path");

// Allowed domains for outbound requests
const ALLOWED_DOMAINS = [
  "hooks.slack.com",
  "api.openai.com",
  "api.groq.com",
  "api.anthropic.com",
  "slack.com",
  "firebaseio.com",
  "firebaseapp.com",
  "firebasestorage.app",
  "github.com",
  "api.github.com",
  "vercel.com",
  "vercel.app",
  "generativelanguage.googleapis.com"
];

// Audit log file
const AUDIT_LOG = path.join(__dirname, "..", "security.log");

/**
 * Log network request
 */
function logRequest(url, allowed, caller) {
  const timestamp = new Date().toISOString();
  const entry = `${timestamp} | ${allowed ? "ALLOWED" : "BLOCKED"} | ${url} | ${caller}\n`;
  
  try {
    fs.appendFileSync(AUDIT_LOG, entry);
  } catch (e) {
    // Fail silently if log can't be written
  }
  
  if (!allowed) {
    console.error(`[SECURITY] Blocked outbound request: ${url}`);
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

/**
 * Check if domain is allowed
 */
function isAllowedDomain(url) {
  const domain = extractDomain(url);
  if (!domain) return false;
  
  return ALLOWED_DOMAINS.some(allowed => domain.includes(allowed) || allowed.includes(domain));
}

/**
 * Get caller from stack trace
 */
function getCaller() {
  const stack = new Error().stack;
  const caller = stack.split("\n")[2] || "unknown";
  return caller;
}

/**
 * Initialize network guard (intercepts fetch)
 */
function init() {
  if (typeof fetch === "undefined") {
    console.log("[SECURITY] Network guard initialized (fetch not available in this environment)");
    return;
  }
  
  const originalFetch = global.fetch;
  
  global.fetch = async (url, options = {}) => {
    const caller = getCaller();
    const allowed = isAllowedDomain(url);
    
    logRequest(url, allowed, caller);
    
    if (!allowed) {
      throw new Error(`[SECURITY] Blocked outbound request to unauthorized domain: ${url}`);
    }
    
    return originalFetch(url, options);
  };
  
  console.log("[SECURITY] Network guard initialized - outbound requests restricted");
}

/**
 * Get allowed domains list (for configuration)
 */
function getAllowedDomains() {
  return [...ALLOWED_DOMAINS];
}

/**
 * Add allowed domain (for configuration)
 */
function addAllowedDomain(domain) {
  if (!ALLOWED_DOMAINS.includes(domain)) {
    ALLOWED_DOMAINS.push(domain);
  }
}

module.exports = {
  init,
  isAllowedDomain,
  getAllowedDomains,
  addAllowedDomain
};
