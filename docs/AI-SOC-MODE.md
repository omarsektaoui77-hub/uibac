# 🧠 AI SOC Mode - Security Operations Center

## Overview

AI SOC Mode transforms the ZeroLeak Security Engine from a gatekeeper into an analyst + responder. It correlates events into incidents, classifies severity, decides actions, and maintains an auditable trail.

## 🏗️ Core Pipeline

```
Ingest → Normalize → Correlate → Score → Decide → Act → Verify → Rollback (if needed) → Audit
```

## 📡 Architecture

### 1. Normalize Events

Makes all events comparable for correlation and analysis.

```javascript
const { normalize } = require("./soc/normalize");

const normalized = normalize({
  type: "SECRET_LEAK",
  level: "HIGH",
  risk: 8,
  repo: "frontend-app"
});
```

**Output:**
```javascript
{
  id: 1234567890,
  org: "uibac",
  repo: "frontend-app",
  env: "dev",
  type: "SECRET_LEAK",
  level: "HIGH",
  risk: 8,
  actor: "system",
  meta: {},
  time: "2026-04-18T12:00:00Z"
}
```

### 2. Correlation Engine

Groups related events into incidents based on time window and similarity.

```javascript
const { correlate } = require("./soc/correlate");

const incidents = correlate(events, 5 * 60 * 1000); // 5 minute window
```

**Example:**
- 5 secret leaks in 3 minutes → 1 incident, not 5 alerts
- 3 auth attacks in 2 minutes → 1 incident

**Advanced Correlation:**
- Same repo, same type (5 min window)
- Same org, same type (15 min window)
- Same actor, any type (10 min window)

### 3. Classification Engine

Classifies incident severity and category.

```javascript
const { classify } = require("./soc/classify");

const classification = classify(incident);
```

**Output:**
```javascript
{
  severity: "CRITICAL",
  category: "SECRET_LEAK",
  riskScore: 10,
  confidence: "HIGH"
}
```

**Severity Levels:**
- **CRITICAL**: 1+ critical events, 3+ high events, or 5+ events
- **HIGH**: 1+ high events or 3+ events
- **MEDIUM**: 2+ events
- **LOW**: Default

**Categories:**
- SECRET_LEAK
- AUTH_ATTACK
- CODE_INJECTION
- CODE_VULNERABILITY
- NETWORK_ANOMALY
- RUNTIME_THREAT
- ANOMALY

### 4. Decision Engine

Decides what actions to take based on incident classification.

```javascript
const { decide } = require("./soc/decide");

const actions = decide(incident, classification);
```

**Actions by Severity:**

| Severity | Actions |
|----------|---------|
| CRITICAL | BLOCK_CI, ALERT_SECURITY, REQUIRE_ROTATION, FREEZE_ACCOUNT |
| HIGH | ALERT_SECURITY, OPEN_ISSUE, REQUIRE_ROTATION |
| MEDIUM | ALERT_DEVELOPER, LOG_ONLY |
| LOW | LOG_ONLY |

### 5. Action Layer

Executes actions safely with logging.

```javascript
const { act } = require("./soc/act");

const results = await act(actions, incident, classification);
```

**Available Actions:**
- `BLOCK_CI`: Block CI pipeline
- `ALERT_SECURITY`: Alert security team
- `ALERT_DEVELOPER`: Alert developer
- `REQUIRE_ROTATION`: Require secret rotation
- `FREEZE_ACCOUNT`: Freeze user account
- `OPEN_ISSUE`: Create GitHub issue
- `LOG_ONLY`: Log incident only

### 6. Audit Trail

Non-negotiable audit logging for SOC operations.

```javascript
const { log } = require("./soc/audit");

log({
  incident: "INC-123",
  severity: "CRITICAL",
  category: "SECRET_LEAK",
  actions: ["BLOCK_CI", "ALERT_SECURITY"],
  time: "2026-04-18T12:00:00Z"
});
```

**Features:**
- Tamper-resistant with HMAC signatures
- Keeps last 10,000 entries
- Query by incident or action
- Verification function for integrity

### 7. Verification Module

Verifies action effectiveness and triggers rollback if needed.

```javascript
const { verify, verifyAll, needsRollback } = require("./soc/verify");

// Verify single action
const verification = await verify("BLOCK_CI", incident, classification);
// Returns: { action, success, reason, timestamp }

// Verify all actions
const verifications = await verifyAll(actions, incident, classification);

// Check if rollback needed
const rollbackNeeded = needsRollback(verifications);
```

**Verification Logic:**
- BLOCK_CI: Checks if CI pipeline is blocked
- ALERT_SECURITY: Checks if security team was alerted
- ALERT_DEVELOPER: Checks if developer was alerted
- REQUIRE_ROTATION: Checks if rotation was required
- FREEZE_ACCOUNT: Checks if account was frozen
- OPEN_ISSUE: Checks if issue was created
- LOG_ONLY: Always succeeds

### 8. Rollback Module

Rolls back failed actions to maintain system integrity.

```javascript
const { rollback, rollbackFailed, emergencyRollback } = require("./soc/rollback");

// Rollback single action
const rollbackResult = await rollback("BLOCK_CI", incident, classification);

// Rollback all failed actions
const rollbacks = await rollbackFailed(verifications, incident, classification);

// Emergency rollback (all actions)
const rollbacks = await emergencyRollback(actions, incident, classification);
```

**Rollback Logic:**
- BLOCK_CI: Unblocks CI pipeline
- ALERT_SECURITY: Retracts security alert
- ALERT_DEVELOPER: Retracts developer alert
- REQUIRE_ROTATION: Removes rotation requirement
- FREEZE_ACCOUNT: Unfreezes account
- OPEN_ISSUE: Closes issue
- LOG_ONLY: No rollback needed

**When Rollback Triggers:**
- Critical action (BLOCK_CI, FREEZE_ACCOUNT, REQUIRE_ROTATION) fails verification
- Manual emergency rollback requested

### 9. SOC Brain Orchestrator

Core pipeline orchestrator.

```javascript
const { runSOC } = require("./soc/brain");

const result = runSOC(events, {
  silent: false,
  autoAct: false
});
```

**Output:**
```javascript
{
  events: 100,
  incidents: 5,
  results: [
    {
      incident: "INC-123",
      classification: { severity: "CRITICAL", category: "SECRET_LEAK", ... },
      actions: ["BLOCK_CI", "ALERT_SECURITY"],
      actionResults: [...],
      autoActed: false
    }
  ]
}
```

### 10. Brain Runner

Command-line interface for SOC analysis.

```bash
# Run with sample events
node security/soc/brain-runner.js

# Run with event file
node security/soc/brain-runner.js events.json

# Run with silent mode
node security/soc/brain-runner.js --silent

# Run with auto-act enabled
node security/soc/brain-runner.js --auto-act

# Run with ingestion from command center
node security/soc/brain-runner.js --ingest
```

## 🔗 Integration

### CI/CD Integration

**GitHub Actions:**
```yaml
- name: AI SOC Analysis
  run: node security/soc/brain-runner.js --silent
  env:
    CC_ORG: ${{ github.repository_owner }}
    CC_REPO: ${{ github.repository }}
    CC_ENV: production
    CC_ROLE: security
    CC_SOURCE: trusted-ci
    CC_TOKEN: ${{ secrets.CC_TOKEN }}
```

### Command Center Integration

**Ingest events from command center:**
```javascript
const { runSOCWithIngestion } = require("./soc/brain");

const result = await runSOCWithIngestion({
  ccHost: "localhost",
  ccPort: 4000,
  ccToken: process.env.CC_TOKEN,
  ccRole: "security"
});
```

## 🧪 Testing

### Test with Sample Events

```bash
node security/soc/brain-runner.js
```

### Test with Custom Events

Create `events.json`:
```json
[
  {
    "id": 1,
    "org": "uibac",
    "repo": "frontend-app",
    "env": "production",
    "type": "SECRET_LEAK",
    "level": "HIGH",
    "risk": 8,
    "actor": "omar",
    "time": "2026-04-18T12:00:00Z"
  },
  {
    "id": 2,
    "org": "uibac",
    "repo": "frontend-app",
    "env": "production",
    "type": "SECRET_LEAK",
    "level": "HIGH",
    "risk": 8,
    "actor": "omar",
    "time": "2026-04-18T12:02:00Z"
  },
  {
    "id": 3,
    "org": "uibac",
    "repo": "frontend-app",
    "env": "production",
    "type": "SECRET_LEAK",
    "level": "HIGH",
    "risk": 8,
    "actor": "omar",
    "time": "2026-04-18T12:04:00Z"
  }
]
```

Run:
```bash
node security/soc/brain-runner.js events.json
```

### Test Auto-Act

```bash
node security/soc/brain-runner.js --auto-act
```

**Warning:** Auto-act will block CI on critical incidents.

## 📋 Environment Variables

```bash
CC_HOST=localhost
CC_PORT=4000
CC_TOKEN=your-secret-token
CC_ROLE=security
CC_ORG=uibac
CC_REPO=frontend-app
CC_ENV=production
CC_SERVICE=api
CC_SOURCE=trusted-ci
SOC_SECRET=your-hmac-secret
```

## 🔒 Security Considerations

### Audit Trail Integrity

- HMAC signatures on all audit entries
- Verification function for tamper detection
- Non-negotiable for compliance

### Safe Automation

- Auto-act disabled by default
- Destructive actions require explicit flag
- All actions logged with audit trail

### Rate Limiting

- Inherited from command center
- 100 requests per minute per IP

## 🧠 Adaptive Learning Mode

### Overview

Adaptive Learning Mode adds intelligent anomaly detection and baseline learning to the SOC system. It learns normal patterns per repo/env/type and detects deviations automatically.

### Principles

- 📊 Learn normal behavior per repo/env/type
- 🧮 Use simple statistics (no black-box AI)
- 🐢 Adapt slowly (avoid drift)
- 🚫 Never override critical security rules

### Baseline Model

**Tracks per key:** `repo:env:type`

**Stores:**
- Event frequency
- Average risk
- Variance
- Min/max risk
- Last updated

**Example:**
```json
{
  "frontend:prod:CODE_SCAN": {
    "count": 120,
    "avgRisk": 3.2,
    "variance": 1.1,
    "minRisk": 1,
    "maxRisk": 8,
    "lastUpdated": "2026-04-18T10:00:00Z"
  }
}
```

### Anomaly Detection

**Z-score style detection:**
- Requires 10+ events for baseline
- Detects anomalies at 3+ standard deviations
- Returns severity: NONE, LOW, MEDIUM, HIGH, CRITICAL

**Example:**
```javascript
const { detectAnomaly, getAnomalySeverity } = require("./soc/anomaly");

const isAnomalous = detectAnomaly(event, baseline);
const severity = getAnomalySeverity(event, baseline);
```

### Adaptive Classification

**Combines rule-based with anomaly detection:**
- Rule-based classification as base
- Anomaly detection upgrades severity
- 3+ anomalies → CRITICAL
- 1+ anomalies → Upgrade severity

**Example:**
```javascript
const { adaptiveClassify } = require("./soc/adaptive-classify");

const classification = adaptiveClassify(incident);
// Returns: { severity, category, riskScore, isAnomalous, anomalyHits, ... }
```

### Safe Learning

**Controlled learning safeguards:**
- ❌ Do NOT learn from CRITICAL incidents
- ⚠️ Only learn LOW/MEDIUM (optional)
- ⏳ Delayed learning with cooldown
- 🎲 Sampled learning for rate control

**Example:**
```javascript
const { safeLearn, delayedLearn, sampledLearn } = require("./soc/safe-learn");

// Basic safe learning
safeLearn(event, classification);

// Delayed learning (60s cooldown)
delayedLearn(event, classification, 60 * 1000);

// Sampled learning (50% sample rate)
sampledLearn(event, classification, 0.5);
```

### Drift Protection

**Prevents baseline poisoning:**
- Decays old data after 10,000 events
- Resets count to 1,000
- Decays variance by 10%

**Prevents:**
- Attackers slowly shifting baseline
- Long-term drift
- Data poisoning attacks

### Usage

**Enable adaptive learning (default):**
```bash
node security/soc/brain-runner.js
```

**Disable adaptive learning:**
```bash
node security/soc/brain-runner.js --no-adaptive
```

**View baseline data:**
```javascript
const { getAllBaselines } = require("./soc/learn");
const baselines = getAllBaselines();
console.log(baselines);
```

### Critical Safeguards

**Never allow adaptive system to:**
- Override secret leak detection
- Ignore auth failures
- Reduce CRITICAL thresholds
- Learn from CRITICAL incidents

**Hard rules stay hard.**

## 📊 What You Now Have

- 🔗 Event correlation (real SOC behavior)
- 🧠 Incident classification
- ⚖️ Automated decision making
- 🛠️ Controlled auto-response
- 📜 Full audit trail
- 📚 Adaptive baseline learning
- 🚨 Anomaly detection
- 🛡️ Safe learning with safeguards

## ⚠️ Reality Check

This is opinionated, minimal, and deployable:

- **Opinionated:** Fixed correlation strategies, severity thresholds
- **Minimal:** No over-engineering, clear pipeline
- **Deployable:** Works with existing infrastructure
- **Adaptive:** Simple statistics, no black-box AI

**Not:**
- Full SIEM replacement
- ML-based anomaly detection
- Complex alert routing
- Unsupervised learning

## 🔗 Related Documentation

- [Enterprise Mode](./ENTERPRISE-MODE.md)
- [Production Hardening](./PRODUCTION-HARDENING.md)
- [Zero Trust Mode](./ZERO-TRUST-MODE.md)

