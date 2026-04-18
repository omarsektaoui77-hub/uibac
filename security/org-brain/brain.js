// ZeroLeak Org Brain - Orchestrator
// Organization-wide intelligence and coordinated response

const { correlateOrg, detectSystemicIssues, getOrgSummary } = require("./correlate");
const { computeOrgRisk, computeOrgWideRisk, getRiskLevel, computeRiskByRepo } = require("./risk");
const { orgPolicy, validatePolicy } = require("./policy");
const { execute } = require("./actions");
const { log } = require("../soc/audit");

/**
 * Run org brain on events
 */
function runOrgBrain(events, options = {}) {
  const { silent = false, autoAct = false } = options;
  
  if (!silent) {
    console.log("🏢 ZeroLeak Org Brain");
    console.log("====================\n");
  }
  
  // Correlate events at org level
  if (!silent) console.log("🔗 Correlating events across organization...");
  const incidents = correlateOrg(events);
  
  if (!silent) {
    console.log(`  Found ${incidents.length} org-level incidents`);
    console.log();
  }
  
  // Detect systemic issues
  const systemicIssues = detectSystemicIssues(events);
  if (systemicIssues.length > 0 && !silent) {
    console.log(`⚠️ Detected ${systemicIssues.length} systemic issues`);
    systemicIssues.forEach(issue => {
      console.log(`  - ${issue.description}`);
    });
    console.log();
  }
  
  // Process each org incident
  const results = [];
  
  for (const inc of incidents) {
    if (!silent) {
      console.log(`📋 Processing org incident: ${inc.id}`);
      console.log(`  Type: ${inc.type}`);
      console.log(`  Repos: ${inc.repos.join(", ")}`);
      console.log(`  Events: ${inc.count}`);
      console.log(`  Severity: ${inc.severity}`);
    }
    
    // Compute org risk
    const risk = computeOrgRisk(inc);
    const riskLevel = getRiskLevel(risk);
    
    if (!silent) {
      console.log(`  Risk Score: ${risk} → ${riskLevel}`);
    }
    
    // Get policy actions
    const actions = orgPolicy(inc, risk);
    
    if (!silent) {
      console.log(`  Actions: ${actions.join(", ")}`);
    }
    
    // Validate policy
    const policyValidation = validatePolicy(inc, actions);
    if (!policyValidation.valid && !silent) {
      console.warn(`  ⚠️ Policy warnings: ${policyValidation.warnings.join(", ")}`);
    }
    
    // Log to audit
    log({
      incident: inc.id,
      type: "ORG_INCIDENT",
      severity: inc.severity,
      risk,
      riskLevel,
      repos: inc.repos,
      actions,
      time: new Date().toISOString()
    });
    
    // Execute actions (if auto-act enabled)
    let actionResults = [];
    if (autoAct) {
      if (!silent) console.log(`  Executing org actions...`);
      actionResults = execute(actions, inc);
    } else {
      if (!silent) console.log(`  Auto-act disabled (actions logged only)`);
    }
    
    results.push({
      incident: inc.id,
      risk,
      riskLevel,
      actions,
      actionResults,
      autoActed: autoAct
    });
    
    if (!silent) console.log();
  }
  
  // Compute org-wide statistics
  const orgWideRisk = computeOrgWideRisk(incidents);
  const repoRisks = computeRiskByRepo(incidents);
  const summary = getOrgSummary(incidents);
  
  if (!silent) {
    console.log(`📊 Organization Summary:`);
    console.log(`  Total incidents: ${summary.total}`);
    console.log(`  Total events: ${summary.totalEvents}`);
    console.log(`  Affected repos: ${summary.affectedRepos.join(", ")}`);
    console.log(`  Org-wide risk: ${orgWideRisk.toFixed(1)}`);
    console.log(`  Risk by repo:`);
    for (const repo in repoRisks) {
      console.log(`    ${repo}: ${repoRisks[repo].toFixed(1)}`);
    }
    console.log();
  }
  
  if (!silent) {
    console.log(`✅ Org brain analysis complete`);
    console.log(`   Incidents processed: ${incidents.length}`);
    console.log(`   Actions taken: ${autoAct ? "YES" : "NO (auto-act disabled)"}`);
  }
  
  return {
    incidents: incidents.length,
    results,
    systemicIssues,
    orgWideRisk,
    repoRisks,
    summary
  };
}

module.exports = { runOrgBrain };
