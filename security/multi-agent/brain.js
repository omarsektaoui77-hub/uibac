// ZeroLeak Multi-Agent System - Multi-Agent Brain
// Orchestrates multiple agents for decision making

const { SecurityAgent } = require("../agents/security");
const { ReliabilityAgent } = require("../agents/reliability");
const { PerformanceAgent } = require("../agents/performance");
const { DeliveryAgent } = require("../agents/delivery");
const { judge, getJudgeTier, getConsensus } = require("./judge");
const { debate, getDebateSummary, resolveDebate } = require("./debate");
const { log } = require("../soc/audit");

// Initialize agents
const agents = [
  new SecurityAgent(),
  new ReliabilityAgent(),
  new PerformanceAgent(),
  new DeliveryAgent()
];

/**
 * Run multi-agent analysis
 */
async function runMultiAgent(events, options = {}) {
  const { silent = false, enableDebate = true, allowDirectExecution = false } = options;
  
  if (!silent) {
    console.log("🧠 ZeroLeak Multi-Agent System");
    console.log("==============================\n");
  }

  // Safety rule: No direct execution allowed
  if (!allowDirectExecution) {
    if (!silent) console.log("🔒 Safety rule: Agents cannot execute actions directly (judge decides)");
  }

  // Check minimum data threshold
  if (!events || events.length < 5) {
    if (!silent) {
      console.log("⚠️ Insufficient data for multi-agent analysis (need ≥5 events)");
    }
    return {
      valid: false,
      reason: "INSUFFICIENT_DATA"
    };
  }

  // Each agent analyzes
  if (!silent) console.log("🤖 Agent Analysis:");
  const decisions = agents.map(agent => {
    const decision = agent.analyze(events);
    
    // Safety: Remove actions from agent decisions (only judge decides)
    if (!allowDirectExecution) {
      decision._actions = decision.actions;
      decision.actions = []; // Clear actions, judge will decide
    }
    
    if (!silent) {
      console.log(`  [${agent.name}] Score: ${decision.score} | Confidence: ${decision.confidence} | ${decision.reasoning}`);
    }
    
    return decision;
  });
  console.log();

  // Debate layer (optional)
  let debated = decisions;
  if (enableDebate) {
    if (!silent) console.log("⚖️ Debate Layer:");
    debated = debate(decisions);
    const summary = getDebateSummary(debated);
    
    if (!silent) {
      console.log(`  Flagged: ${summary.flaggedDecisions} | Conflicts: ${summary.conflicts} | Needs Review: ${summary.needsReview}`);
    }
    console.log();
  }

  // Resolve debate if needed
  const resolved = enableDebate ? resolveDebate(debated) : debated;

  // Judge makes final decision
  if (!silent) console.log("⚖️ Judge Decision:");
  const final = judge(resolved, { allowDirectExecution });
  const tier = getJudgeTier(final.score);
  const consensus = getConsensus(decisions);
  
  if (!silent) {
    console.log(`  Final Score: ${final.score.toFixed(2)}`);
    console.log(`  Tier: ${tier}`);
    console.log(`  Actions: ${final.actions.join(", ") || "None"}`);
    console.log(`  Reasoning: ${final.reasoning}`);
    console.log(`  Consensus: ${consensus.consensus} (unanimous: ${consensus.unanimous})`);
    console.log();
  }

  // Log to audit
  log({
    type: "MULTI_AGENT_DECISION",
    tier,
    score: final.score,
    actions: final.actions,
    reasoning: final.reasoning,
    consensus,
    agentCount: agents.length,
    decisions: decisions.map(d => ({ agent: d.agent, score: d.score, confidence: d.confidence })),
    time: new Date().toISOString()
  });

  return {
    score: final.score,
    tier,
    actions: final.actions,
    reasoning: final.reasoning,
    consensus,
    decisions
  };
}

/**
 * Get agent statistics
 */
function getAgentStats() {
  return {
    totalAgents: agents.length,
    agents: agents.map(a => ({ name: a.name, type: a.getType() }))
  };
}

module.exports = {
  runMultiAgent,
  getAgentStats
};
