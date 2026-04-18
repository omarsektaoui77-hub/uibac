// ZeroLeak Evolved Security Brain - Runtime Monitoring
// Live monitoring of outbound requests and runtime behavior

const { log } = require("./audit-log");

// Allowed domains for normal operation
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
 * Monitor outbound request
 */
function monitorRequest(url, options = {}) {
  const allowed = isAllowedDomain(url);
  
  if (!allowed) {
    const domain = extractDomain(url);
    log("RUNTIME_BLOCK", {
      url,
      domain,
      reason: "UNAUTHORIZED_DOMAIN"
    });
    
    throw new Error(`[RUNTIME BRAIN] Blocked outbound request to unauthorized domain: ${domain}`);
  }
  
  // Log all outbound requests
  log("RUNTIME_REQUEST", {
    url,
    domain: extractDomain(url),
    method: options.method || "GET"
  });
  
  return true;
}

/**
 * Monitor secret access at runtime
 */
function monitorSecretAccess(secretName, caller) {
  log("RUNTIME_SECRET_ACCESS", {
    secretName,
    caller,
    timestamp: new Date().toISOString()
  });
  
  return true;
}

/**
 * Monitor suspicious code patterns at runtime
 */
function monitorSuspiciousPattern(pattern, context) {
  log("RUNTIME_SUSPICIOUS_PATTERN", {
    pattern,
    context,
    timestamp: new Date().toISOString()
  });
  
  return true;
}

/**
 * Initialize runtime brain (intercepts fetch)
 */
function init() {
  if (typeof fetch === "undefined") {
    console.log("[RUNTIME BRAIN] Fetch not available in this environment");
    return;
  }
  
  const originalFetch = global.fetch;
  
  global.fetch = async (url, options = {}) => {
    monitorRequest(url, options);
    return originalFetch(url, options);
  };
  
  console.log("[RUNTIME BRAIN] Initialized - monitoring outbound requests");
}

module.exports = {
  monitorRequest,
  monitorSecretAccess,
  monitorSuspiciousPattern,
  isAllowedDomain,
  init
};
