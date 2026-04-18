// ZeroLeak Autonomous Security System - Main Runner
// Detects risk, decides severity, and takes action automatically

const { execSync } = require("child_process");
const { extractSignals } = require("./brain-signals");
const { score, classify } = require("./brain-core");
const { decide, getActions, isActionAllowed } = require("./autonomous-core");
const { executeAction } = require("./autonomous-actions");
const { log } = require("./audit-log");

// Safe mode flag (default = safe)
const SAFE_MODE = process.env.SECURITY_SAFE !== "false";

/**
 * Main autonomous analysis
 */
function analyze(options = {}) {
  const { silent = false, staged = false } = options;
  
  if (!silent) {
    console.log("🤖 ZeroLeak Autonomous Security System");
    console.log("======================================\n");
  }
  
  let diff = "";
  
  try {
    if (staged) {
      diff = execSync("git diff --cached", { encoding: "utf8" });
    } else {
      diff = execSync("git diff HEAD~1 HEAD", { encoding: "utf8" });
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
  
  // Get actions for this level
  const actionNames = getActions(level);
  
  // Filter actions based on safe mode
  const allowedActions = actionNames.filter(action => isActionAllowed(action, SAFE_MODE));
  
  if (!silent) {
    console.log("📊 Analysis Results:");
    console.log(`  Risk Score: ${risk}`);
    console.log(`  Risk Level: ${level}`);
    console.log(`  Actions: ${allowedActions.join(", ") || "None"}`);
    console.log(`  Safe Mode: ${SAFE_MODE ? "ENABLED" : "DISABLED"}`);
    console.log();
  }
  
  // Log the analysis
  log("AUTONOMOUS_ANALYSIS", {
    risk,
    level,
    actions: allowedActions,
    safeMode: SAFE_MODE,
    signals
  });
  
  // Execute actions
  allowedActions.forEach(action => {
    const message = `Triggered by ${level} risk (score: ${risk})`;
    const context = { risk, level, signals };
    
    if (!silent) {
      console.log(`⚡ Executing action: ${action}`);
    }
    
    executeAction(action, message, context);
  });
  
  // Warn if safe mode prevented actions
  if (SAFE_MODE && actionNames.length > allowedActions.length) {
    const prevented = actionNames.filter(action => !isActionAllowed(action, SAFE_MODE));
    if (!silent) {
      console.warn(`⚠️ Safe mode prevented actions: ${prevented.join(", ")}`);
    }
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
