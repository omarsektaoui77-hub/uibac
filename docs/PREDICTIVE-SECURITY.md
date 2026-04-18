# 🔮 Predictive Security System

## Overview

Predictive Security provides proactive threat detection by projecting current trajectory. It uses real signals (trend + velocity) to react to direction, not just state, preventing issues before explosion.

## 🧠 Core Idea

```
Past behavior → Trend → Forecast → Risk → Decision
```

**You're not guessing—you're projecting current trajectory.**

## 🧱 Feature Extraction

**Turn events into signals:**
```javascript
const { extractFeatures, extractVelocity, extractAcceleration } = require("./security/predict/features");

const features = extractFeatures(events);
// Returns: { total, high, critical, avgRisk, timeSpan, byType, byRepo }

const velocity = extractVelocity(events);
// Returns: events per minute

const acceleration = extractAcceleration(events);
// Returns: change in velocity
```

## 📈 Trend Detection

**Detect if risk is rising or falling:**
```javascript
const { computeTrend, getTrendDirection, computeTrendVelocity } = require("./security/predict/trend");

const trend = computeTrend(events);
// Returns: positive = rising, negative = falling

const direction = getTrendDirection(trend);
// Returns: "RISING", "FALLING", "STABLE"
```

## 🔮 Short-Term Forecast

**Next step risk using linear projection:**
```javascript
const { forecastRisk, forecastRiskWeighted, forecastTrend } = require("./security/predict/forecast");

const forecast = forecastRisk(events);
// Returns: predicted next risk value (0-10)

const trend = forecastTrend(events);
// Returns: "RISING", "FALLING", "STABLE"
```

## ⚠️ Predictive Risk Scoring

**Combines features, trend, and forecast:**
```javascript
const { predictiveScore, getPredictiveRiskLevel, getPredictionConfidence } = require("./security/predict/score");

const score = predictiveScore(events);
const level = getPredictiveRiskLevel(score);
const confidence = getPredictionConfidence(events);
```

**Score calculation:**
- Base: average risk
- +2 if trend is rising
- +3 if forecast >= 8
- +3 if critical events present
- +2 if high event velocity
- Max: 10

## ⚖️ Predictive Policy

**Act BEFORE failure:**
```javascript
const { predictivePolicy } = require("./security/predict/policy");

const actions = predictivePolicy(score);
```

**Policy by score:**
- Score >= 9: BLOCK_DEPLOY, ALERT_ALL, PREPARE_ROLLBACK
- Score >= 7: WARN_TEAM, LIMIT_RELEASE
- Score >= 5: MONITOR, INCREASE_SCRUTINY
- Score < 5: ALLOW

## 🧠 Predictive Brain

**Complete orchestrator:**
```javascript
const { runPredictive } = require("./security/predict/brain");

const result = runPredictive(events, {
  silent: false,
  autoAct: false,
  override: false
});
```

**Output:**
```javascript
{
  score: 8.5,
  level: "HIGH",
  confidence: "HIGH",
  actions: ["WARN_TEAM", "LIMIT_RELEASE"],
  explanation: ["Risk is trending upward", "Forecast predicts high risk"],
  valid: true,
  reason: "PREDICTIVE_DECISION"
}
```

## 🔗 Org Brain Integration

**Inside org brain:**
```javascript
const { runPredictive } = require("../predict/brain");

const result = runPredictive(inc.events);

if (result.actions.includes("BLOCK_DEPLOY")) {
  execute(["FREEZE_DEPLOYS"], inc);
}
```

## 📊 Example Behavior

| Situation | System Reaction |
|-----------|-----------------|
| Stable low risk | ALLOW |
| Rising errors | WARN_TEAM |
| Spike + upward trend | LIMIT_RELEASE |
| Critical + forecast high | BLOCK_DEPLOY |

## ⚠️ Critical Safeguards

**Non-negotiable:**
- 🔒 Minimum data threshold (≥5 events)
- 🚫 Never override hard security rules (secret leaks, auth failures)
- 📝 Log why decision was made
- ✅ Allow manual override (override flag required for auto-act)

**Implementation:**
```javascript
runPredictive(events, {
  autoAct: false,
  override: false  // Required for auto-act
});
```

## 🔥 Why This Works

- Uses real signals (trend + velocity)
- Reacts to direction, not just state
- Prevents issues before explosion
- Proactive, not reactive

## 🔗 Related Documentation

- [AI SOC Mode](./AI-SOC-MODE.md)
- [Org Brain](./ORG-BRAIN.md)
- [Self-Healing Production](./SELF-HEALING.md)
