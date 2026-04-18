# 🏢 Enterprise Mode - Security Command Center

## Overview

Enterprise Mode transforms the Security Command Center from a single-repo tool into a multi-tenant, org-wide security platform with RBAC, policy enforcement, and cross-repo intelligence.

## 🏗️ Architecture

### Multi-Tenant Data Model

Events now include ownership metadata:

```javascript
{
  "org": "uibac",
  "repo": "frontend-app",
  "env": "production",
  "service": "api",
  "type": "CODE_SCAN",
  "level": "HIGH",
  "risk": 9,
  "actor": "omar",
  "time": "2026-04-18T12:00:00Z"
}
```

### Environment Variables

```bash
CC_TOKEN=your-secret-token-here
CC_SECRET=your-hmac-secret-here
CC_TRUSTED_SOURCES=trusted-ci,local
CC_ORG=default-org
CC_ROLE=developer
CC_REPO=your-repo-name
CC_ENV=development
CC_SERVICE=your-service-name
```

## 🔐 Role-Based Access Control (RBAC)

### Role Hierarchy

```
viewer < developer < security < admin
```

### Permissions

| Role | Permissions |
|------|-------------|
| viewer | Read-only access to events and stats |
| developer | Can send events, view own repo data |
| security | Full visibility, can trigger actions |
| admin | Control policies, access audit trail |

### Usage

```bash
# Set role header
curl -H "x-role: security" -H "x-cc-token: YOUR_TOKEN" http://localhost:4000/events
```

### Middleware

```javascript
function authorize(roleRequired) {
  return (req, res, next) => {
    const role = req.headers["x-role"] || "viewer";
    
    if (ROLE_HIERARCHY.indexOf(role) < ROLE_HIERARCHY.indexOf(roleRequired)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    next();
  };
}
```

## 🌐 Central Ingestion Gateway

### Endpoint

```bash
POST /ingest
```

### Required Headers

```
x-source: trusted-ci
x-role: developer
x-cc-token: YOUR_TOKEN
```

### Example

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-source: trusted-ci" \
  -H "x-role: developer" \
  -H "x-cc-token: YOUR_TOKEN" \
  -d '{
    "type": "CODE_SCAN",
    "level": "HIGH",
    "risk": 9,
    "repo": "frontend-app",
    "env": "production"
  }' \
  http://localhost:4000/ingest
```

## 🧠 Cross-Repo Anomaly Detection

### Coordinated Attack Detection

Detects when 5+ high-risk events occur across different repositories within 1 hour:

```javascript
{
  type: "ORG_ATTACK_PATTERN",
  severity: "CRITICAL",
  description: "Coordinated attack detected across multiple repositories",
  affectedRepos: ["repo1", "repo2", "repo3", "repo4", "repo5"]
}
```

### Systemic Issue Detection

Detects when the same issue occurs in 3+ repositories:

```javascript
{
  type: "SYSTEMIC_ISSUE",
  severity: "HIGH",
  description: "Systemic SECRET_LEAK detected across multiple repositories",
  affectedRepos: ["repo1", "repo2", "repo3"]
}
```

## ⚖️ Policy Engine

### Built-in Policies

| Policy | Condition | Action |
|--------|-----------|--------|
| BLOCK_CRITICAL | level === "CRITICAL" | BLOCK_DEPLOY |
| REQUIRE_ROTATION_SECRET_LEAK | type === "SECRET_LEAK" | REQUIRE_ROTATION |
| BLOCK_HIGH_RISK_PROD | level === "HIGH" && env === "production" | BLOCK_DEPLOY |
| ALERT_ORG_ATTACK | type === "ORG_ATTACK_PATTERN" | ALERT_ALL |

### Policy Enforcement

Policies are automatically enforced on every event:

```javascript
const triggeredPolicies = enforce(event);
// Returns: [{ name: "BLOCK_CRITICAL", action: "BLOCK_DEPLOY" }]
```

## 📊 Enterprise Dashboard Filters

### Available Filters

- Organization
- Repository
- Environment (development, staging, production)
- Risk Level (LOW, MEDIUM, HIGH, CRITICAL)

### Example

```javascript
// Filter by repo and environment
GET /events?repo=frontend-app&env=production

// Filter by org and level
GET /events?org=uibac&level=HIGH
```

## 🔁 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Security Brain
  run: node security/autonomous.js
  env:
    CC_ORG: ${{ github.repository_owner }}
    CC_REPO: ${{ github.repository }}
    CC_ENV: production
    CC_ROLE: developer
    CC_SOURCE: trusted-ci
    CC_TOKEN: ${{ secrets.CC_TOKEN }}

- name: Send Event to Command Center
  run: node security/send-to-cc.js
  env:
    CC_ORG: ${{ github.repository_owner }}
    CC_REPO: ${{ github.repository }}
    CC_ENV: production
    CC_ROLE: developer
    CC_SOURCE: trusted-ci
    CC_TOKEN: ${{ secrets.CC_TOKEN }}
```

## 🔐 Identity Integration

### Current Implementation

- Token-based authentication
- Role-based access control
- Source validation

### Future Enhancements

- GitHub Actions identity
- OAuth / SSO
- Signed JWT tokens

## 🧱 Environment Isolation

### Strict Separation

- Development / Staging / Production separated
- No cross-environment secret reuse
- Production events get highest priority

### Configuration

```bash
# Development
CC_ENV=development

# Staging
CC_ENV=staging

# Production
CC_ENV=production
```

## 📡 Alert Routing

### Role-Based Alerts

| Role | Alert Types |
|------|-------------|
| Developer | Code issues, low risk |
| Security | High risk, anomalies |
| Admin | Org-wide events, policy violations |

## 🧾 Audit Trail

### Access

**Admin only:**

```bash
curl -H "x-role: admin" -H "x-cc-token: YOUR_TOKEN" http://localhost:4000/audit
```

### Audit Entry Structure

```javascript
{
  id: 1234567890,
  time: "2026-04-18T12:00:00Z",
  action: "INGEST_SUCCESS",
  details: { eventId: 123, policies: [...] },
  actor: "developer",
  signature: "abc123..."
}
```

### What's Logged

- Event ingestions (success/failure)
- Policy triggers
- Action requests
- Errors
- Authentication attempts

## 🚫 Abuse Prevention

### Payload Validation

- Required fields: `type`, `level`
- Max event size: 10KB
- Allowed fields only (deny unknown fields)

### Validation Rules

```javascript
const allowedFields = [
  "org", "repo", "env", "service", "type", "level", "risk", 
  "actor", "time", "signals", "author", "anomalyScore", "anomalous", "drift"
];
```

### Rate Limiting

- 100 requests per minute per IP
- Prevents spam and DoS attacks

## 📋 Deployment Checklist

Before deploying Enterprise Mode:

- [ ] Set `CC_ORG` to your organization name
- [ ] Set `CC_TOKEN` to a strong, unique value
- [ ] Set `CC_SECRET` to a strong, unique value
- [ ] Configure `CC_TRUSTED_SOURCES` appropriately
- [ ] Set up role-based access
- [ ] Configure environment isolation
- [ ] Set up policy enforcement
- [ ] Configure audit trail retention
- [ ] Set up cross-repo anomaly detection
- [ ] Update CI/CD workflows with multi-tenant metadata
- [ ] Test RBAC permissions
- [ ] Test policy enforcement
- [ ] Test cross-repo anomaly detection
- [ ] Verify audit trail logging

## 🧪 Testing

### RBAC Test

```bash
# Should fail (viewer cannot access admin endpoint)
curl -H "x-role: viewer" -H "x-cc-token: YOUR_TOKEN" http://localhost:4000/audit

# Should succeed (admin can access audit endpoint)
curl -H "x-role: admin" -H "x-cc-token: YOUR_TOKEN" http://localhost:4000/audit
```

### Policy Test

```bash
# Should trigger BLOCK_CRITICAL policy
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-source: trusted-ci" \
  -H "x-role: developer" \
  -H "x-cc-token: YOUR_TOKEN" \
  -d '{"type":"SCAN","level":"CRITICAL","risk":10}' \
  http://localhost:4000/ingest
```

### Cross-Repo Anomaly Test

```bash
# Send events from multiple repos to trigger anomaly detection
for i in {1..6}; do
  curl -X POST \
    -H "Content-Type: application/json" \
    -H "x-source: trusted-ci" \
    -H "x-role: developer" \
    -H "x-cc-token: YOUR_TOKEN" \
    -d "{\"type\":\"SCAN\",\"level\":\"HIGH\",\"repo\":\"repo$i\"}" \
    http://localhost:4000/ingest
done
```

## 🔗 Related Documentation

- [Production Hardening](./PRODUCTION-HARDENING.md)
- [Zero Trust Mode](./ZERO-TRUST-MODE.md)
- [Slack Autofix Setup](./STEP9-SLACK-AUTOFIX-SETUP.md)

## ⚠️ Hard Truth

At this level, failures come from:

- Bad policies
- Human approvals
- Misconfigured roles

Not missing code.

Enterprise Mode provides the infrastructure for governance, but proper configuration and human oversight remain critical.
