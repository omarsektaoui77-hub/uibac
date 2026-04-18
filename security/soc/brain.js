// ZeroLeak AI SOC Mode - Brain Orchestrator
// Core pipeline: Ingest → Normalize → Correlate → Score → Decide → Act → Audit

const { normalizeAll } = require("./normalize");
const { correlateAdvanced } = require("./correlate");
const { classify, getDescription } = require("./classify");
const { decide, getActionDescription } = require("./decide");
const { act } = require("./act");
const { log, read } = require("./audit");

/**
 * Run SOC analysis on raw events
 */
async function runSOC(rawEvents, options = {}) {
  const { silent = false, autoAct = false } = options;
  
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
    
    // Step 4: Classify incident
    const classification = classify(incident);
    
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
    
    results.push({
      incident: incident.id,
      classification,
      actions,
      actionResults,
      autoActed: autoAct
    });
    
    if (!silent) console.log();
  }
  
  if (!silent) {
    console.log(`✅ SOC analysis complete`);
    console.log(`   Incidents processed: ${incidents.length}`);
    console.log(`   Actions taken: ${autoAct ? "YES" : "NO (auto-act disabled)"}`);
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
