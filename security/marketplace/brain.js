// ZeroLeak Agent Marketplace - Marketplace Brain
// Orchestrates agent marketplace with performance-based selection

const { listAgents } = require("./registry");
const { runInSandbox, runParallelInSandbox } = require("./sandbox");
const { evaluate, getEvaluationSummary } = require("./evaluator");
const { update, topAgents, getLeaderboardSummary } = require("./scoreboard");
const { log } = require("../soc/audit");

/**
 * Run marketplace analysis
 */
async function runMarketplace(events, options = {}) {
  const { silent = false, concurrency = 5, selectTop = 3, enforceSafety = true } = options;
  
  if (!silent) {
    console.log("🏪 ZeroLeak Agent Marketplace");
    console.log("===========================\n");
  }

  // Check minimum data threshold
  if (!events || events.length < 5) {
    if (!silent) {
      console.log("⚠️ Insufficient data for marketplace (need ≥5 events)");
    }
    return {
      valid: false,
      reason: "INSUFFICIENT_DATA"
    };
  }

  const agents = listAgents();
  
  if (!silent) {
    console.log(`🤖 Registered agents: ${agents.length}`);
    agents.forEach(a => console.log(`  - ${a.name} v${a.version} by ${a.author}`));
    console.log();
  }

  if (agents.length === 0) {
    if (!silent) {
      console.log("⚠️ No agents registered in marketplace");
    }
    return {
      valid: false,
      reason: "NO_AGENTS"
    };
  }

  // Safety rule: Enforce sandbox execution
  if (enforceSafety) {
    if (!silent) console.log("🔒 Safety rule: All agents must run in sandbox");
  }

  // Run agents in sandbox
  if (!silent) console.log("🧪 Running agents in sandbox...");
  const results = await runParallelInSandbox(agents, events, { concurrency });
  
  if (!silent) {
    console.log(`  Completed: ${results.length} agents`);
    const safeCount = results.filter(r => r.safe).length;
    console.log(`  Safe: ${safeCount} | Errors: ${results.length - safeCount}`);
    console.log();
  }

  // Evaluate results
  const evaluated = results.map(r => ({
    ...r,
    evaluationScore: evaluate(r)
  }));

  // Update scoreboard
  if (!silent) console.log("🏆 Updating scoreboard...");
  for (const r of evaluated) {
    if (r.safe) {
      update(r.agent, r.evaluationScore);
    }
  }
  
  const leaderboard = getLeaderboardSummary();
  
  if (!silent) {
    console.log(`  Top agents: ${leaderboard.top.map(t => `${t.name} (${t.score})`).join(", ")}`);
    console.log();
  }

  // Select top agents
  const best = topAgents(selectTop);
  const selected = evaluated.filter(r => best.includes(r.agent));

  if (!silent) {
    console.log(`🎯 Selected ${selected.length} top agents for decision:`);
    selected.forEach(r => {
      console.log(`  [${r.agent}] Score: ${r.score} | Confidence: ${r.confidence} | Eval: ${r.evaluationScore}`);
    });
    console.log();
  }

  // Log to audit
  log({
    type: "MARKETPLACE_RUN",
    agentCount: agents.length,
    safeAgents: results.filter(r => r.safe).length,
    selectedAgents: best,
    leaderboard,
    time: new Date().toISOString()
  });

  return {
    results: evaluated,
    best,
    selected,
    leaderboard
  };
}

/**
 * Get marketplace statistics
 */
function getMarketplaceStats() {
  const agents = listAgents();
  const leaderboard = getLeaderboardSummary();

  return {
    registeredAgents: agents.length,
    leaderboard,
    agents: agents.map(a => ({
      name: a.name,
      version: a.version,
      author: a.author
    }))
  };
}

module.exports = {
  runMarketplace,
  getMarketplaceStats
};
