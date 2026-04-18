# 🏪 Agent Marketplace

## Overview

Agent Marketplace provides a pluggable agent ecosystem with performance-based selection, safe experimentation layer, and continuous improvement loop.

## 🏗️ Architecture

```
[Agent Registry]
        ↓
[Sandbox Execution]
        ↓
[Evaluator]
        ↓
[Scoreboard]
        ↓
[Selector → Org Brain]
```

**No agent touches production directly.**

## 🧱 Agent Contract

**Strict interface that all marketplace agents must follow:**
```javascript
class MarketplaceAgent {
  constructor(name, version, author) {
    this.name = name;
    this.version = version;
    this.author = author;
  }

  analyze(events) {
    return {
      agent: this.name,
      version: this.version,
      score: 0,
      confidence: 0,
      actions: [],
      reasoning: ""
    };
  }
}
```

## 📦 Agent Registry

**Manages registration and listing of marketplace agents:**
```javascript
const { register, listAgents, getAgent, unregister } = require("./security/marketplace/registry");

// Register agent
register(agent);

// List all agents
const agents = listAgents();

// Get specific agent
const agent = getAgent("MyAgent");

// Unregister agent
unregister("MyAgent");
```

## 🧪 Sandbox Execution

**CRITICAL: No agent touches production directly:**
```javascript
const { runInSandbox, runParallelInSandbox } = require("./security/marketplace/sandbox");

// Run single agent in sandbox
const result = await runInSandbox(agent, events, { timeout: 5000 });

// Run multiple agents in parallel
const results = await runParallelInSandbox(agents, events, { concurrency: 5 });
```

**Safety features:**
- Timeout protection (default 5 seconds)
- Result structure validation
- Error handling and isolation
- Concurrent execution with limits

## 📊 Evaluation Engine

**Evaluates agent performance and assigns scores:**
```javascript
const { evaluate, evaluateBatch, getEvaluationSummary } = require("./security/marketplace/evaluator");

const score = evaluate(result);
// Score calculation:
// +2 if actions provided
// +3 if confidence >= 0.7
// +5 if safe execution
// +1 if reasoning provided
// Max: 10
```

## 🏆 Scoreboard

**Tracks agent performance over time:**
```javascript
const { update, topAgents, getScore, getAllScores, getLeaderboardSummary } = require("./security/marketplace/scoreboard");

// Update agent score
update("MyAgent", 5);

// Get top agents
const best = topAgents(3);

// Get leaderboard summary
const summary = getLeaderboardSummary();
```

## 🤖 Marketplace Brain

**Full orchestrator with performance-based selection:**
```javascript
const { runMarketplace, getMarketplaceStats } = require("./security/marketplace/brain");

const result = await runMarketplace(events, {
  silent: false,
  concurrency: 5,
  selectTop: 3,
  enforceSafety: true
});
```

**Output:**
```javascript
{
  results: [...],
  best: ["Agent1", "Agent2", "Agent3"],
  selected: [...],
  leaderboard: { total, top, bottom }
}
```

## 🔗 Multi-Agent Integration

**Plug into multi-agent system:**
```javascript
const { runMultiAgent } = require("./security/multi-agent/brain");

const result = await runMultiAgent(events, {
  useMarketplace: true,
  enableDebate: true
});
```

**Example flow:**
```
10 agents run →
3 best selected →
judge combines results →
co-pilot approval →
action executed
```

## 🧬 Evolution Logic

**Continuous improvement loop:**
```javascript
const { pruneWeakAgents, promoteTopAgents, evolutionCycle, getEvolutionStats } = require("./security/marketplace/evolve");

// Prune weak agents
const pruned = pruneWeakAgents(10);

// Promote top agents
const promoted = promoteTopAgents(3);

// Run full evolution cycle
const result = evolutionCycle({ pruneThreshold: 10, promoteCount: 3 });

// Get evolution statistics
const stats = getEvolutionStats();
```

**Evolution features:**
- Prune weak agents based on score threshold
- Promote top agents (increase priority)
- Automatic improvement cycle
- Statistics tracking

## 🔒 Safety Rules

**Non-negotiable:**
- 🧪 Agents run in sandbox only
- 🚫 No direct system access
- 📜 Full logging
- ⚖️ Only top agents influence decisions
- ✋ Still pass through co-pilot approval

## 🔥 What You Built

You now have:
- 🧩 Pluggable agent ecosystem
- 🏆 Performance-based selection
- 🧪 Safe experimentation layer
- 🔁 Continuous improvement loop

**This is how you scale intelligence without chaos.**

## ⚠️ Real-World Truth

**Without governance:**
- Agents conflict
- Bad logic spreads
- System becomes unstable

**With governance:**
- System improves automatically
- Best strategies emerge
- Risk stays controlled

## 🔗 Related Documentation

- [Multi-Agent System](./MULTI-AGENT.md)
- [Co-Pilot Mode](./COPILOT-MODE.md)
- [AI SOC Mode](./AI-SOC-MODE.md)
