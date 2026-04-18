# 🏢 Org Brain - Organization-Level Security Intelligence

## Overview

Org Brain provides organization-wide security intelligence, correlating incidents across repositories and environments. It applies org-wide policy, triggers coordinated actions, and enforces zero-trust + RBAC.

## 🏗️ Architecture

```
[Repos / Services]
        ↓
   (events)
        ↓
[Ingestion Gateway]
        ↓
[Org Brain Core]
   ├─ Correlation
   ├─ Risk Engine
   ├─ Policy Engine
   ├─ Decision Engine
        ↓
[Action Layer]
   ├─ CI/CD
   ├─ Deployments
   ├─ Secrets
   ├─ Alerts
        ↓
[Audit + Dashboard]
```

## 🧱 Org-Level Data Model

```javascript
{
  "org": "uibac",
  "repo": "frontend",
  "env": "production",
  "service": "web",
  "type": "ROUTE_TEST",
  "severity": "HIGH",
  "risk": 8,
  "time": "2026-04-18T12:00:00Z"
}
```

**Everything must follow this schema.**

## 🔗 Cross-Repo Correlation

**Detects:**
- Multi-repo failures
- Systemic issues

**Usage:**
```javascript
const { correlateOrg, detectSystemicIssues } = require("./security/org-brain/correlate");

const incidents = correlateOrg(events);
const systemicIssues = detectSystemicIssues(events);
```

**Correlation logic:**
- Groups events by `type:env`
- Creates incidents if 5+ events across 2+ repos
- Detects systemic issues affecting 3+ repos

## 🧠 Org Risk Engine

**Compute organization-level risk:**
```javascript
const { computeOrgRisk, computeOrgWideRisk, getRiskLevel } = require("./security/org-brain/risk");

const risk = computeOrgRisk(incident);
const orgWideRisk = computeOrgWideRisk(incidents);
const riskLevel = getRiskLevel(risk);
```

**Risk calculation:**
- Base risk: 5
- +3 if 3+ repos affected
- +2 if 10+ events
- +1 if 5+ events
- Max: 10

## ⚖️ Policy Engine

**Org-level rules:**
```javascript
const { orgPolicy, getPolicyDescription } = require("./security/org-brain/policy");

const actions = orgPolicy(incident, risk);
// Returns: ["FREEZE_DEPLOYS", "ALERT_ALL", "START_HEALING"]
```

**Policy by risk:**
- Risk >= 9: FREEZE_DEPLOYS, ALERT_ALL, START_HEALING
- Risk >= 7: ALERT_SECURITY, LIMIT_RELEASES
- Risk >= 5: MONITOR, ALERT_LEADS
- Risk < 5: MONITOR

## 🤖 Action Layer

**Coordinated response:**
```javascript
const { execute } = require("./security/org-brain/actions");

const results = execute(actions, incident);
```

**Available actions:**
- `FREEZE_DEPLOYS`: Freeze all deployments across organization
- `ALERT_ALL`: Alert all security teams and leads
- `START_HEALING`: Trigger self-healing across repos
- `ALERT_SECURITY`: Alert security team
- `LIMIT_RELEASES`: Limit release cadence
- `MONITOR`: Monitor situation
- `ALERT_LEADS`: Alert team leads

## 🧠 Org Brain Orchestrator

**Complete orchestrator:**
```javascript
const { runOrgBrain } = require("./security/org-brain/brain");

const result = runOrgBrain(events, {
  silent: false,
  autoAct: false
});
```

**Output:**
```javascript
{
  incidents: 3,
  results: [...],
  systemicIssues: [...],
  orgWideRisk: 8.5,
  repoRisks: { frontend: 7.2, backend: 9.1 },
  summary: { total: 3, totalEvents: 25, affectedRepos: [...] }
}
```

## 🔗 SOC Integration

**Command center integration:**
```javascript
const { runSOC } = require("./soc/brain");
const { runOrgBrain } = require("./org-brain/brain");

app.post("/ingest", (req, res) => {
  const events = read();
  events.push(req.body);
  write(events);

  runSOC(events);       // repo-level
  runOrgBrain(events);  // org-level

  res.json({ ok: true });
});
```

**Dual-layer analysis:**
- SOC: Repo-level correlation and response
- Org Brain: Org-level correlation and coordinated response

## 🔐 Zero Trust Enforcement

**Every event must include:**
- Signed token (later JWT)
- Source validation
- Repo ownership check

**No trust by default.**

**Implementation:**
```javascript
// Zero trust: validate org/repo ownership
const org = req.headers["x-org"] || req.body?.org;
const repo = req.headers["x-repo"] || req.body?.repo;

if (org && repo) {
  // In production, verify repo ownership via GitHub API
  console.log(`[ZERO-TRUST] Validating ownership: ${org}/${repo}`);
}
```

## 📊 Org Dashboard Views

**Add to dashboard:**
- Incidents across repos
- Risk heatmap
- Active policies
- Blocked deployments
- Org-wide risk score
- Repo-specific risk scores

## 🔥 What You Built

You now have:
- 🏢 Org-wide intelligence layer
- 🔗 Cross-repo correlation
- ⚖️ Centralized policy control
- 🤖 Coordinated response system
- 🔐 Zero-trust enforcement
- 📊 Organization-wide risk visibility

## 🔗 Related Documentation

- [AI SOC Mode](./AI-SOC-MODE.md)
- [Enterprise Mode](./ENTERPRISE-MODE.md)
- [Self-Healing Production](./SELF-HEALING.md)
