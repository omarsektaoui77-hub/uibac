// ZeroLeak Self-Healing Mode - Main Runner
// Detects, contains, fixes, and recovers from security issues

const { execSync } = require("child_process");
const { extractSignals } = require("./brain-signals");
const { score } = require("./brain-core");
const { decide } = require("./autonomous-core");
const { decideHealing, isHealingSafe } = require("./healing-core");
const { sanitizeFile, contain, requireRotation } = require("./healing-actions");
const { log } = require("./audit-log");

// Safe mode flag (default = safe)
const SAFE_MODE = process.env.SECURITY_SAFE !== "false";

/**
 * Main self-healing analysis
 */
function analyze(options = {}) {
  const { silent = false, staged = false } = options;
  
  if (!silent) {
    console.log("🛠️ ZeroLeak Self-Healing Mode");
    console.log("==============================\n");
  }
  
  let diff = "";
  let diffFiles = [];
  
  try {
    if (staged) {
      diff = execSync("git diff --cached", { encoding: "utf8" });
      diffFiles = execSync("git diff --name-only --cached", { encoding: "utf8" })
        .split("\n")
        .filter(Boolean);
    } else {
      diff = execSync("git diff HEAD~1 HEAD", { encoding: "utf8" });
      diffFiles = execSync("git diff --name-only HEAD~1 HEAD", { encoding: "utf8" })
        .split("\n")
        .filter(Boolean);
    }
  } catch (e) {
    if (!silent) {
      console.log("No diff to analyze");
    }
    return { level: "LOW", risk: 0, actions: [] };
  }
  
  if (!diff || diff.trim() === "") {
    if (!silent) {
      console.log("No changes to analyze");
    }
    return { level: "LOW", risk: 0, actions: [] };
  }
  
  // Extract signals
  const signals = extractSignals(diff);
  
  // Score risk
  const risk = score(signals);
  const level = decide(risk);
  
  // Get healing actions for this level
  const actionNames = decideHealing(level);
  
  // Filter actions based on safe mode
  const allowedActions = actionNames.filter(action => isHealingSafe(action, SAFE_MODE));
  
  if (!silent) {
    console.log("📊 Analysis Results:");
    console.log(`  Risk Score: ${risk}`);
    console.log(`  Risk Level: ${level}`);
    console.log(`  Files changed: ${diffFiles.length}`);
    console.log(`  Healing actions: ${allowedActions.join(", ") || "None"}`);
    console.log(`  Safe Mode: ${SAFE_MODE ? "ENABLED" : "DISABLED"}`);
    console.log();
  }
  
  // Log the analysis
  log("SELF_HEAL_ANALYSIS", {
    risk,
    level,
    actions: allowedActions,
    safeMode: SAFE_MODE,
    files: diffFiles,
    signals
  });
  
  // Execute healing actions
  allowedActions.forEach(action => {
    if (!silent) {
      console.log(`⚡ Executing healing action: ${action}`);
    }
    
    switch (action) {
      case "sanitize":
        diffFiles.forEach(file => sanitizeFile(file));
        break;
      case "block":
        console.error("🚫 Blocked by self-healing system");
        log("SELF_HEAL_BLOCK", { risk, level, timestamp: new Date().toISOString() });
        process.exit(1);
      case "alert":
        console.log("📡 Security alert sent");
        log("SELF_HEAL_ALERT", { risk, level, timestamp: new Date().toISOString() });
        break;
      case "requireRotation":
        requireRotation("DETECTED_SECRET");
        break;
      case "contain":
        contain();
        break;
      default:
        console.warn(`Unknown healing action: ${action}`);
    }
  });
  
  // Warn if safe mode prevented actions
  if (SAFE_MODE && actionNames.length > allowedActions.length) {
    const prevented = actionNames.filter(action => !isHealingSafe(action, SAFE_MODE));
    if (!silent) {
      console.warn(`⚠️ Safe mode prevented actions: ${prevented.join(", ")}`);
    }
  }
  
  if (!silent) {
    console.log("\n✅ Self-healing analysis complete");
  }
  
  return { level, risk, actions: allowedActions };
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const silent = args.includes("--silent");
  const staged = args.includes("--staged");
  
  analyze({ silent, staged });
}

module.exports = { analyze };
