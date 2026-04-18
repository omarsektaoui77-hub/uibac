// ZeroLeak Audit Log - Zero Trust Visibility
// Centralized logging for all security events

const fs = require("fs");
const path = require("path");

// Audit log file
const AUDIT_LOG = path.join(__dirname, "..", "security.log");

/**
 * Log security event
 */
function log(event, details = {}) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    event,
    details
  };
  
  try {
    const logLine = `${timestamp} | ${event} | ${JSON.stringify(details)}\n`;
    fs.appendFileSync(AUDIT_LOG, logLine);
  } catch (e) {
    // Fail silently if log can't be written
    console.error("[SECURITY] Failed to write audit log:", e.message);
  }
}

/**
 * Log secret access
 */
function logSecretAccess(secretName, caller, authorized) {
  log("SECRET_ACCESS", {
    secretName,
    caller,
    authorized
  });
}

/**
 * Log network request
 */
function logNetworkRequest(url, caller, allowed) {
  log("NETWORK_REQUEST", {
    url,
    caller,
    allowed
  });
}

/**
 * Log security violation
 */
function logViolation(violationType, details) {
  log("VIOLATION", {
    violationType,
    details
  });
}

/**
 * Log PR event
 */
function logPR(prEvent, details) {
  log("PR_EVENT", {
    prEvent,
    details
  });
}

/**
 * Read audit log
 */
function readLog(lines = 100) {
  try {
    if (!fs.existsSync(AUDIT_LOG)) {
      return [];
    }
    
    const content = fs.readFileSync(AUDIT_LOG, "utf8");
    const allLines = content.split("\n").filter(line => line.trim());
    
    // Return last N lines
    return allLines.slice(-lines);
  } catch (e) {
    console.error("[SECURITY] Failed to read audit log:", e.message);
    return [];
  }
}

/**
 * Clear audit log (for testing)
 */
function clearLog() {
  try {
    if (fs.existsSync(AUDIT_LOG)) {
      fs.unlinkSync(AUDIT_LOG);
    }
  } catch (e) {
    console.error("[SECURITY] Failed to clear audit log:", e.message);
  }
}

module.exports = {
  log,
  logSecretAccess,
  logNetworkRequest,
  logViolation,
  logPR,
  readLog,
  clearLog
};
