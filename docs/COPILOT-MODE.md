# 🤖 Co-Pilot Mode (Human + AI)

## Overview

Co-Pilot Mode shifts from autonomous AI to human-AI collaboration. The system proposes actions, explains reasoning, and requires human approval for high-risk decisions.

## 🎯 Behavior Shift

**Before:** Detect → Decide → Act ❌
**Now:** Detect → Propose → Explain → (Approve?) → Act → Learn ✅

- High-risk = human approval
- Low-risk = auto-execute

## 🧱 Decision Tiers

**Classification based on risk score:**
- Score >= 9: CRITICAL (human required)
- Score >= 7: HIGH (approval recommended)
- Score < 7: LOW (auto allowed)

**Usage:**
```javascript
const { classifyTier, getTierDescription } = require("./security/copilot/tier");

const tier = classifyTier(score);
const description = getTierDescription(tier);
```

## 🧠 Co-Pilot Proposal Engine

**Proposes actions based on score:**
```javascript
const { proposeActions } = require("./security/copilot/propose");

const actions = proposeActions(score);
// Score >= 9: ["BLOCK_DEPLOY", "ROLLBACK_READY", "ALERT_ALL"]
// Score >= 7: ["LIMIT_RELEASE", "WARN_TEAM"]
// Score >= 5: ["MONITOR", "INCREASE_SCRUTINY"]
// Score < 5: ["ALLOW"]
```

## 🧾 Explainability

**Explains AI decisions to humans:**
```javascript
const { explainDecision, formatExplanation } = require("./security/copilot/explain");

const explanation = explainDecision({ score, trend, forecast, events });
const formatted = formatExplanation(explanation);
```

**Output:**
```javascript
{
  summary: "Risk trending upward",
  confidence: "HIGH",
  metrics: { score, trend, forecast, eventCount },
  reasons: ["Risk is trending upward", "Forecast predicts high risk"]
}
```

## ✋ Approval Gate

**Manages human approval for high-risk actions:**
```javascript
const { requireApproval, slackApproval, cliApproval } = require("./security/copilot/approval");

const approval = await requireApproval(tier, actions, { autoApprove: false });
```

**Approval methods:**
- `fakeHumanApproval`: Simulated approval (testing)
- `slackApproval`: Slack interactive buttons (production)
- `cliApproval`: CLI prompt (local development)

## ⚡ Execution Layer

**Executes approved actions:**
```javascript
const { execute } = require("./security/copilot/execute");

const results = execute(actions);
```

**Available actions:**
- BLOCK_DEPLOY: Block all deployments
- ROLLBACK_READY: Prepare rollback plan
- ALERT_ALL: Alert all teams
- LIMIT_RELEASE: Limit release cadence
- WARN_TEAM: Warn team of risk
- MONITOR: Monitor situation
- INCREASE_SCRUTINY: Increase code review scrutiny
- ALLOW: Allow normal operations

## 🧠 Co-Pilot Brain

**Full flow orchestrator:**
```javascript
const { copilotBrain } = require("./security/copilot/brain");

const result = await copilotBrain(events, {
  silent: false,
  autoApprove: false,
  override: false
});
```

**Output:**
```javascript
{
  approved: true,
  tier: "HIGH",
  actions: ["LIMIT_RELEASE", "WARN_TEAM"],
  explanation: { summary, confidence, metrics, reasons },
  executionResults: [...]
}
```

## 🔗 Slack Integration

**Real co-pilot feel with Slack buttons:**
```javascript
const { slackApproval } = require("./security/copilot/approval");

await slackApproval(actions);
```

**Pseudo-code:**
```javascript
sendSlack({
  text: "🚨 High Risk Detected",
  actions: [
    { type: "button", text: "Approve", value: "yes" },
    { type: "button", text: "Reject", value: "no" }
  ]
});
```

## 📜 Learning from Human Decisions

**System learns from approvals and rejections:**
```javascript
const { learnFromHuman } = require("./security/copilot/learn");

learnFromHuman(action, approved, { tier, score, explanation });
```

**Learning behavior:**
- If human rejects → system becomes more conservative
- If human approves → system gains confidence

## 🔒 Safety Rules

**Non-negotiable:**
- 🚫 AI cannot bypass approval for CRITICAL
- 🔁 Cooldown on repeated actions (5 minutes)
- 📜 Every decision logged
- 👀 Human override always possible

**Implementation:**
```javascript
// Critical tier requires human approval
if (tier === "CRITICAL" && !override) {
  // Force approval gate
}

// Cooldown on repeated actions
const actionsInCooldown = actions.filter(a => {
  const lastExecution = actionCooldown.get(a);
  return Date.now() - lastExecution < COOLDOWN_MS;
});
```

## 🔥 What You Built

You now have:
- 🤖 AI that thinks
- 🧾 AI that explains
- ✋ Human that controls risk
- 📚 System that learns from both

**This is how real-world high-stakes systems operate.**

## 🔗 Related Documentation

- [AI SOC Mode](./AI-SOC-MODE.md)
- [Org Brain](./ORG-BRAIN.md)
- [Predictive Security](./PREDICTIVE-SECURITY.md)
