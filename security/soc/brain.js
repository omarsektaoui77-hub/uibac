// ZeroLeak AI SOC Mode - Brain Orchestrator
// Core pipeline: Ingest → Normalize → Correlate → Score → Decide → Act → Verify → Rollback (if needed) → Audit

const { normalizeAll } = require("./normalize");
const { correlateAdvanced } = require("./correlate");
const { classify, getDescription } = require("./classify");
const { decide, getActionDescription } = require("./decide");
const { act } = require("./act");
const { log, read } = require("./audit");
const { adaptiveClassify } = require("./adaptive-classify");
const { safeLearn } = require("./safe-learn");
const { verifyAll, needsRollback } = require("./verify");
const { rollbackFailed } = require("./rollback");
const { selfHeal } = require("../self-heal/engine");

/**
 * Run SOC analysis on raw events
 */
async function runSOC(rawEvents, options = {}) {
  const { silent = false, autoAct = false, adaptive = true, selfHeal: enableSelfHeal = false, healUrl = null } = options;
  
  if (!silent) {
    console.log("🧠 ZeroLeak AI SOC Mode");
    console.log("======================\n");
  }
  
  // Step 1: Normalize events
  if (!silent) console.log("📡 Normalizing events...");
  const events = normalizeAll(rawEvents);
  
  if (!silent) {
    console.log(`  Normalized ${events.length} events`);
    console.log();
  }
  
  // Step 2: Correlate events into incidents
  if (!silent) console.log("🔗 Correlating events into incidents...");
  const incidents = correlateAdvanced(events);
  
  if (!silent) {
    console.log(`  Found ${incidents.length} incidents`);
    console.log();
  }
  
  // Step 3: Process each incident
  const results = [];
  
  for (const incident of incidents) {
    if (!silent) {
      console.log(`📋 Processing incident: ${incident.id}`);
      console.log(`  Repo: ${incident.repo || incident.org}`);
      console.log(`  Type: ${incident.type}`);
      console.log(`  Events: ${incident.count}`);
      console.log(`  Time window: ${incident.start} → ${incident.end}`);
    }
    
    // Step 4: Classify incident (adaptive if enabled)
    let classification;
    if (adaptive) {
      classification = adaptiveClassify(incident);
      if (!silent && classification.isAnomalous) {
        console.log(`  🔍 Anomaly detected: ${classification.anomalyHits} events anomalous`);
      }
    } else {
      classification = classify(incident);
    }
    
    if (!silent) {
      console.log(`  Classification: ${getDescription(classification)}`);
    }
    
    // Step 5: Decide actions
    const actions = decide(incident, classification);
    
    if (!silent) {
      console.log(`  Actions: ${actions.map(getActionDescription).join(", ")}`);
    }
    
    // Step 6: Log decision
    log({
      incident: incident.id,
      severity: classification.severity,
      category: classification.category,
      riskScore: classification.riskScore,
      confidence: classification.confidence,
      isAnomalous: classification.isAnomalous || false,
      anomalyHits: classification.anomalyHits || 0,
      actions,
      time: new Date().toISOString()
    });
    
    // Step 7: Execute actions (if auto-act enabled)
    let actionResults = [];
    if (autoAct) {
      if (!silent) console.log(`  Executing actions...`);
      actionResults = await act(actions, incident, classification);
    } else {
      if (!silent) console.log(`  Auto-act disabled (actions logged only)`);
    }
    
    // Step 8: Verify actions (if auto-act enabled)
    let verifications = [];
    let rollbacks = [];
    if (autoAct && actionResults.length > 0) {
      if (!silent) console.log(`  Verifying actions...`);
      verifications = await verifyAll(actions, incident, classification);
      
      // Step 9: Rollback failed actions if needed
      if (needsRollback(verifications)) {
        if (!silent) console.log(`  Rolling back failed actions...`);
        rollbacks = await rollbackFailed(verifications, incident, classification);
      }
    }
    
    // Step 10: Safe learning (if adaptive enabled)
    if (adaptive) {
      if (!silent) console.log(`  Learning from incident...`);
      for (const e of incident.events) {
        safeLearn(e, classification);
      }
    }
    
    // Step 11: Self-healing (if enabled and conditions met)
    let healResult = null;
    if (enableSelfHeal && actions.includes("BLOCK_CI") && classification.severity === "CRITICAL") {
      if (!silent) console.log(`  Attempting self-healing...`);
      healResult = await selfHeal(incident, healUrl || "http://localhost:3000");
      if (!silent) {
        console.log(`  Self-healing result: ${healResult.success ? "SUCCESS" : "FAILED"}`);
      }
    }
    
    results.push({
      incident: incident.id,
      classification,
      actions,
      actionResults,
      verifications,
      rollbacks,
      healResult,
      autoActed: autoAct,
      learned: adaptive,
      selfHealed: enableSelfHeal && healResult?.success
    });
    
    if (!silent) console.log();
  }
  
  if (!silent) {
    console.log(`✅ SOC analysis complete`);
    console.log(`   Incidents processed: ${incidents.length}`);
    console.log(`   Actions taken: ${autoAct ? "YES" : "NO (auto-act disabled)"}`);
    console.log(`   Adaptive learning: ${adaptive ? "ENABLED" : "DISABLED"}`);
    console.log(`   Self-healing: ${enableSelfHeal ? "ENABLED" : "DISABLED"}`);
  }
  
  return {
    events: events.length,
    incidents: incidents.length,
    results
  };
}

/**
 * Run SOC with event ingestion from command center
 */
async function runSOCWithIngestion(options = {}) {
  const { ccHost = "localhost", ccPort = 4000, ccToken, ccRole = "security" } = options;
  
  try {
    const http = require("http");
    
    const headers = {};
    if (ccToken) headers["x-cc-token"] = ccToken;
    if (ccRole) headers["x-role"] = ccRole;
    
    const requestOptions = {
      hostname: ccHost,
      port: ccPort,
      path: "/events?limit=1000",
      method: "GET",
      headers
    };
    
    const events = await new Promise((resolve, reject) => {
      const req = http.request(requestOptions, (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve([]);
          }
        });
      });
      
      req.on("error", (e) => {
        console.error("[SOC] Failed to fetch events:", e.message);
        resolve([]);
      });
      
      req.end();
    });
    
    return runSOC(events, options);
  } catch (e) {
    console.error("[SOC] Ingestion failed:", e.message);
    return { events: 0, incidents: 0, results: [] };
  }
}

module.exports = {
  runSOC,
  runSOCWithIngestion
};
