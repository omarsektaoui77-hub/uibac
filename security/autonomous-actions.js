// ZeroLeak Autonomous Security System - Action Engine
// Executes security actions based on decisions

const { execSync } = require("child_process");
const { sendAlert } = require("./alert");
const { log } = require("./audit-log");

/**
 * Issue a warning
 */
function warn(msg) {
  console.warn("⚠️", msg);
  log("AUTONOMOUS_WARN", { message: msg, timestamp: new Date().toISOString() });
}

/**
 * Block the operation
 */
function block(msg) {
  console.error("🚫 BLOCKED:", msg);
  log("AUTONOMOUS_BLOCK", { message: msg, timestamp: new Date().toISOString() });
  process.exit(1);
}

/**
 * Send security alert
 */
function alert(msg, context = {}) {
  console.log("📡 ALERT:", msg);
  log("AUTONOMOUS_ALERT", { message: msg, context, timestamp: new Date().toISOString() });
  
  // Send to Slack if configured
  try {
    const alertMessage = `🚨 AUTONOMOUS SECURITY ALERT\n\n${msg}\n\nContext: ${JSON.stringify(context)}`;
    sendAlert(alertMessage);
  } catch (e) {
    console.warn("Failed to send alert:", e.message);
  }
}

/**
 * Rollback last commit
 */
function rollback() {
  console.log("↩️ Rolling back last commit...");
  log("AUTONOMOUS_ROLLBACK", { timestamp: new Date().toISOString() });
  
  try {
    execSync("git reset --hard HEAD~1", { stdio: "inherit" });
    console.log("✅ Rollback complete");
  } catch (e) {
    console.error("❌ Rollback failed:", e.message);
    log("AUTONOMOUS_ROLLBACK_FAILED", { error: e.message, timestamp: new Date().toISOString() });
  }
}

/**
 * Execute action by name
 */
function executeAction(action, message, context = {}) {
  switch (action) {
    case "warn":
      warn(message);
      break;
    case "block":
      block(message);
      break;
    case "alert":
      alert(message, context);
      break;
    case "rollback":
      rollback();
      break;
    default:
      console.warn(`Unknown action: ${action}`);
  }
}

module.exports = {
  warn,
  block,
  alert,
  rollback,
  executeAction
};
