# 🤖 Self-Healing Production System

## Overview

Self-Healing Production provides a closed-loop autonomous system for automatically fixing production issues with strict safety guardrails. The control loop is:

```
Detect → Classify → Decide → Fix → Verify → (Success ✅ | Rollback 🔙) → Audit
```

**No step is optional.**

## 🔁 Control Loop

### 1. Detect
- Events ingested from production tester
- SOC correlates events into incidents

### 2. Classify
- Incident severity determined (LOW, MEDIUM, HIGH, CRITICAL)
- Category identified (ROUTE_TEST, SECRET_LEAK, etc.)

### 3. Decide
- Policy engine determines if auto-fix is allowed
- Only low-risk, reversible fixes permitted

### 4. Fix
- Controlled actions executed
- Rollback deployment, restore config, sanitize files

### 5. Verify
- Fix effectiveness verified
- Never assume fix worked

### 6. Success ✅ | Rollback 🔙
- If verification fails, escalate to human
- Full audit trail maintained

## 🧠 Policy Module

**Auto-fixable incidents:**
- ROUTE_TEST: 3+ events, low risk, reversible
- BROKEN_REDIRECT: CRITICAL severity, low risk, reversible
- PLACEHOLDER_SECRET: HIGH severity, medium risk, reversible
- BAD_CONFIG: CRITICAL severity, low risk, reversible

**Never auto-fix:**
- DATABASE_CHANGE
- AUTH_LOGIC
- PAYMENT_ISSUE
- DESTRUCTIVE_MIGRATION
- DATA_LOSS

**Usage:**
```javascript
const { canAutoFix } = require("./security/self-heal/policy");

if (canAutoFix(incident)) {
  // Safe to auto-fix
}
```

## 🛠️ Fix Engine

**Available fixes:**
- `rollbackDeploy`: Revert deployment via git
- `restoreRedirect`: Restore broken redirect config
- `sanitizeSecret`: Remove placeholder secrets
- `rollbackConfig`: Rollback bad config push

**Usage:**
```javascript
const { executeFix } = require("./security/self-heal/fix");

const success = executeFix(incident);
```

## 🔍 Verification Module

**Verification methods:**
- `verify`: Check URL returns expected status
- `verifyRoute`: Verify route is accessible
- `verifyRedirect`: Verify redirect is working
- `verifySanitized`: Verify file has no placeholders

**Usage:**
```javascript
const { verify } = require("./security/self-heal/verify");

const ok = await verify("https://your-app.com");
```

## 🔙 Rollback Module

**Escalation:**
- Logs failure to audit trail
- Escalates to human intervention
- Emergency rollback available

**Usage:**
```javascript
const { rollbackFailure } = require("./security/self-heal/rollback");

rollbackFailure(incident);
```

## 🤖 Self-Healing Engine

**Complete orchestrator:**
```javascript
const { selfHeal } = require("./security/self-heal/engine");

const result = await selfHeal(incident, "https://your-app.com");
// Returns: { success: true/false, reason: "..." }
```

## 🛡️ Safety Guardrails

**Non-negotiable:**
- 🔒 Max 1 auto-fix per incident
- ⏱️ Cooldown (10 minutes between fixes)
- 🧪 Always verify fix worked
- 👀 Always log to audit trail
- 🚫 Never chain fixes blindly

**Guardrails enforced in engine:**
```javascript
const { isInCooldown, hasExceededMaxFixes } = require("./security/self-heal/engine");

if (isInCooldown(incident.id)) {
  // Skip auto-fix
}

if (hasExceededMaxFixes(incident.id)) {
  // Escalate to human
}
```

## 🔗 SOC Integration

**Enable in SOC brain:**
```javascript
const result = await runSOC(events, {
  silent: false,
  autoAct: false,
  adaptive: true,
  selfHeal: true,
  healUrl: "https://your-app.com"
});
```

**Trigger conditions:**
- Self-healing enabled
- Actions include BLOCK_CI
- Classification severity is CRITICAL

## 📜 Audit Trail

**All actions logged:**
```javascript
log({
  incident: incident.id,
  action: "SELF_HEAL",
  result: "SUCCESS",
  time: new Date().toISOString()
});
```

**Audit entries:**
- Fix attempts
- Verification results
- Rollback triggers
- Escalations to human

## 🚀 Usage Example

**Production tester integration:**
```javascript
// In production tester
await sendToSOC({
  org: "uibac",
  repo: "frontend",
  env: "production",
  type: "ROUTE_TEST",
  level: "HIGH",
  risk: 7,
  meta: {
    path: "/xx",
    expected: 404,
    actual: 200
  }
});
```

**SOC brain triggers self-healing:**
```javascript
// SOC brain automatically triggers self-healing
// when conditions are met
```

## ⚠️ Important Guardrails

**Do NOT:**
- Send sensitive data in events
- Spam events (keep rate-limited)
- Trust unauthenticated sources
- Allow auto-fix for database changes
- Allow auto-fix for auth logic
- Allow auto-fix for payments
- Allow auto-fix for destructive migrations

**Always:**
- Verify fix worked
- Log to audit trail
- Respect cooldowns
- Escalate on failure
- Keep fixes reversible

## 🔥 What This Unlocks

- 🧪 Automated production testing
- 📡 Real-time event ingestion
- 🧠 SOC correlation and classification
- 🤖 Autonomous self-healing
- 🔍 Verification of fixes
- 🔙 Rollback on failure
- 📜 Full audit trail

**This is a closed-loop autonomous system.**

## 🔗 Related Documentation

- [AI SOC Mode](./AI-SOC-MODE.md)
- [Enterprise Mode](./ENTERPRISE-MODE.md)
- [Production Hardening](./PRODUCTION-HARDENING.md)
