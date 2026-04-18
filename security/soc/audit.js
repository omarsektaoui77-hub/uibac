// ZeroLeak AI SOC Mode - Audit Trail
// Non-negotiable audit logging for SOC operations

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB = path.join(__dirname, "..", "soc-audit.json");
const SECRET = process.env.SOC_SECRET || "default-soc-secret";

/**
 * Log audit entry
 */
function log(entry) {
  try {
    const data = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, "utf8")) : [];
    
    const auditEntry = {
      id: Date.now(),
      time: new Date().toISOString(),
      ...entry,
      signature: sign(entry)
    };
    
    data.push(auditEntry);
    
    // Keep only last 10000 audit entries
    if (data.length > 10000) {
      data.shift();
    }
    
    fs.writeFileSync(DB, JSON.stringify(data, null, 2));
    
    return auditEntry.id;
  } catch (e) {
    console.error("[SOC AUDIT] Failed to log:", e.message);
    return null;
  }
}

/**
 * Sign audit entry for tamper resistance
 */
function sign(entry) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(JSON.stringify(entry))
    .digest("hex");
}

/**
 * Verify audit entry signature
 */
function verify(entry) {
  if (!entry.signature) return false;
  
  const computed = sign(entry);
  return computed === entry.signature;
}

/**
 * Read audit log
 */
function read(limit = 100) {
  try {
    const data = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, "utf8")) : [];
    return data.slice(-limit);
  } catch (e) {
    console.error("[SOC AUDIT] Failed to read:", e.message);
    return [];
  }
}

/**
 * Read audit log by incident
 */
function readByIncident(incidentId) {
  const data = read(10000);
  return data.filter(e => e.incident === incidentId);
}

/**
 * Read audit log by action
 */
function readByAction(action) {
  const data = read(10000);
  return data.filter(e => e.action === action);
}

module.exports = {
  log,
  sign,
  verify,
  read,
  readByIncident,
  readByAction
};
