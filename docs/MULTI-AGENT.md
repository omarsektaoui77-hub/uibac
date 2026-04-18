# 🧠 Multi-Agent Co-Pilot System

## Overview

Multi-Agent Co-Pilot System uses multiple specialized AI agents to analyze events from different perspectives. Agents provide opinions, debate decisions, and a central judge makes the final decision.

## 🎯 Mental Model

```
Agents → Opinions → Debate → Judge → Decision → (Approve?) → Execute
```

- No single agent is trusted
- The judge (orchestrator) is the only authority

## 🧱 Agent Roles

**Clear separation of responsibilities:**

| Agent | Responsibility |
|-------|---------------|
| 🔐 Security Agent | Secrets, auth, leaks |
| ⚙️ Reliability Agent | Uptime, errors, failures |
| 🚀 Performance Agent | Latency, load |
| 📦 Delivery Agent | Deploy risk |

## 🤖 Agent Interface

**Standard contract for all agents:**
```javascript
class Agent {
  constructor(name) {
    this.name = name;
  }

  analyze(events) {
    return {
      agent: this.name,
      score: 0,
      confidence: 0,
      actions: [],
      reasoning: ""
    };
  }
}
```

## 🔐 Security Agent

**Handles secrets, auth, leaks:**
```javascript
const { SecurityAgent } = require("./security/agents/security");

const agent = new SecurityAgent();
const decision = agent.analyze(events);
```

**Analysis:**
- Secret leaks (score +3 per leak)
- Auth failures (score +2 per failure)
- Suspicious activity (score +1 per event)
- Actions: BLOCK_DEPLOY, ROTATE_SECRET, ALERT_SECURITY, FREEZE_ACCOUNT

## ⚙️ Reliability Agent

**Handles uptime, errors, failures:**
```javascript
const { ReliabilityAgent } = require("./security/agents/reliability");

const agent = new ReliabilityAgent();
const decision = agent.analyze(events);
```

**Analysis:**
- Errors (score +2 per error)
- Failures (score +3 per failure)
- Outages (score +5 per outage)
- Actions: ROLLBACK, ALERT_OPS, EMERGENCY_RESTORE

## 🚀 Performance Agent

**Handles latency, load:**
```javascript
const { PerformanceAgent } = require("./security/agents/performance");

const agent = new PerformanceAgent();
const decision = agent.analyze(events);
```

**Analysis:**
- High latency (score +1 per event)
- High load (score +2 per event)
- Slow queries (score +1 per event)
- Actions: SCALE_UP, THROTTLE_TRAFFIC, OPTIMIZE_QUERIES

## 📦 Delivery Agent

**Handles deploy risk:**
```javascript
const { DeliveryAgent } = require("./security/agents/delivery");

const agent = new DeliveryAgent();
const decision = agent.analyze(events);
```

**Analysis:**
- Deploy failures (score +2 per failure)
- Rollbacks (score +3 per rollback)
- Config changes (score +1 per change)
- Actions: PAUSE_DEPLOYS, REQUIRE_APPROVAL, REVIEW_CONFIG

## ⚖️ Judge

**The brain that decides based on agent opinions:**
```javascript
const { judge, getJudgeTier, getConsensus } = require("./security/multi-agent/judge");

const final = judge(decisions);
```

**Decision logic:**
- Weights score by confidence
- Collects all actions from agents
- Combines reasoning from high-confidence agents
- Returns final score, actions, and reasoning

## 🧠 Debate Layer

**Optional but powerful - agents can debate decisions:**
```javascript
const { debate, getDebateSummary, resolveDebate } = require("./security/multi-agent/debate");

const debated = debate(decisions);
const summary = getDebateSummary(debated);
const resolved = resolveDebate(debated);
```

**Debate features:**
- Flags low confidence high scores
- Flags conflicting opinions
- Lowers confidence on flagged decisions
- Resolves by consensus

## 🤖 Multi-Agent Brain

**Full orchestrator:**
```javascript
const { runMultiAgent, getAgentStats } = require("./security/multi-agent/brain");

const result = await runMultiAgent(events, {
  silent: false,
  enableDebate: true,
  allowDirectExecution: false
});
```

**Output:**
```javascript
{
  score: 9.2,
  tier: "CRITICAL",
  actions: ["BLOCK_DEPLOY", "ROTATE_SECRET", "ROLLBACK"],
  reasoning: "[SECURITY] Secret leak detected; [RELIABILITY] Error spike detected",
  consensus: { consensus: "CRITICAL", votes: {...}, unanimous: true },
  decisions: [...]
}
```

## ✋ Co-Pilot Approval Integration

**Connect to co-pilot approval:**
```javascript
const { copilotBrain } = require("./security/copilot/brain");

const result = await copilotBrain(events, {
  multiAgent: true,
  autoApprove: false
});
```

**Multi-agent mode:**
- Uses multi-agent system instead of predictive
- Agents analyze, judge decides
- Co-pilot handles approval and execution

## 🔒 Safety Rules

**Non-negotiable:**
- 🚫 No agent executes actions directly
- ⚖️ Only judge decides
- ✋ Approval required for critical
- 📜 All reasoning logged

**Implementation:**
```javascript
// Agents cannot execute directly (judge decides)
const result = await runMultiAgent(events, { allowDirectExecution: false });

// Approval required for critical
if (result.tier === "CRITICAL") {
  await requireApproval("CRITICAL", result.actions);
}
```

## 🔥 Why This Is Powerful

- Agents specialize → better accuracy
- Disagreement → better decisions
- Confidence weighting → less noise
- Central judge → controlled autonomy

## 🧠 What You Built

You now have:
- 🤖 Multiple AI agents
- 🧠 Centralized intelligence (judge)
- ⚖️ Weighted decision system
- ✋ Human-in-the-loop control
- 📚 Learning-ready architecture

**This is basically a mini internal AI SRE + AppSec team.**

## 🔗 Related Documentation

- [Co-Pilot Mode](./COPILOT-MODE.md)
- [Predictive Security](./PREDICTIVE-SECURITY.md)
- [AI SOC Mode](./AI-SOC-MODE.md)
