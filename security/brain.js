// ZeroLeak Autonomous Security Brain - Main Runner
// Analyzes code changes for behavioral risk

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { extractSignals } = require("./brain-signals");
const { score, classify, getRiskDescription, getRiskColor, exceedsBaseline, updateBaseline } = require("./brain-core");
const { log, logPR } = require("./audit-log");

// Brain memory file
const MEMORY_FILE = path.join(__dirname, "..", "security", "brain-memory.json");

/**
 * Load brain memory
 */
function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
    }
  } catch (e) {
    // Return default memory if file doesn't exist or is invalid
  }
  
  return {
    avgRisk: 2,
    maxAllowed: 6,
    sampleCount: 0,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Save brain memory
 */
function saveMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

/**
 * Main brain analysis
 */
function analyze(options = {}) {
  const { silent = false, staged = false } = options;
  
  if (!silent) {
    console.log("🧠 ZeroLeak Security Brain");
    console.log("========================\n");
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
    return { level: "LOW", risk: 0, signals: {} };
  }
  
  if (!diff || diff.trim() === "") {
    if (!silent) {
      console.log("No changes to analyze");
    }
    return { level: "LOW", risk: 0, signals: {} };
  }
  
  // Extract signals
  const signals = extractSignals(diff);
  
  // Score risk
  const risk = score(signals);
  const level = classify(risk);
  
  // Load memory
  const memory = loadMemory();
  
  // Check if exceeds baseline
  const exceeds = exceedsBaseline(risk, memory);
  
  if (!silent) {
    console.log("📊 Signal Analysis:");
    console.log(`  Files changed: ${signals.fileCount}`);
    console.log(`  Lines changed: ${signals.lineCount}`);
    console.log(`  Uses env: ${signals.usesEnv ? "✓" : "✗"}`);
    console.log(`  Adds fetch: ${signals.addsFetch ? "✓" : "✗"}`);
    console.log(`  Adds axios: ${signals.addsAxios ? "✓" : "✗"}`);
    console.log(`  External URL: ${signals.addsExternalUrl ? "✓" : "✗"}`);
    console.log(`  Touches security: ${signals.touchesSecurity ? "✓" : "✗"}`);
    console.log(`  Touches CI: ${signals.touchesCI ? "✓" : "✗"}`);
    console.log(`  Console log: ${signals.addsConsoleLog ? "✓" : "✗"}`);
    console.log(`  Direct env: ${signals.addsProcessEnvDirect ? "✓" : "✗"}`);
    console.log(`  Env concatenation: ${signals.addsEnvConcatenation ? "✓" : "✗"}`);
    console.log();
    
    const color = getRiskColor(level);
    console.log(`${color}Risk Score: ${risk} → ${level}${"\x1b[0m"}`);
    console.log(`Description: ${getRiskDescription(level)}`);
    console.log(`Baseline: ${memory.avgRisk.toFixed(2)} (max: ${memory.maxAllowed})`);
    console.log(`Exceeds baseline: ${exceeds ? "⚠️ YES" : "✗ NO"}`);
  }
  
  // Log the analysis
  log("BRAIN_ANALYSIS", {
    risk,
    level,
    signals,
    exceedsBaseline: exceeds
  });
  
  // Update memory
  updateBaseline(memory, risk);
  saveMemory(memory);
  
  // Block high-risk changes
  if (level === "CRITICAL" || (level === "HIGH" && exceeds)) {
    if (!silent) {
      console.error("\n🚨 High-risk change detected. Blocking.");
    }
    
    logPR("BLOCKED", {
      reason: "HIGH_RISK_BRAIN",
      risk,
      level,
      signals
    });
    
    process.exit(1);
  }
  
  if (!silent) {
    console.log("\n✅ Change accepted");
  }
  
  return { level, risk, signals };
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const silent = args.includes("--silent");
  const staged = args.includes("--staged");
  
  analyze({ silent, staged });
}

module.exports = { analyze, loadMemory, saveMemory };
