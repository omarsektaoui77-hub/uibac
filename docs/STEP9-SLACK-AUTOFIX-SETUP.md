# Step 9: Slack Bot + Auto-Debug + Auto-Fix Agent

## 🚀 Overview

**PagerDuty-class incident response platform:**

```
Sentry Error → Webhook → AI Analysis → GitHub PR → Slack Notification
```

Transform observability into a self-healing system.

---

## 🏗️ System Architecture

```
┌─────────┐    ┌─────────────┐    ┌──────────────┐    ┌──────────┐    ┌────────┐
│ Sentry  │───→│ /api/alerts │───→│ Auto-Fix AI  │───→│ GitHub   │───→│ Slack  │
│ Error   │    │ Webhook     │    │ Patch Agent  │    │ PR       │    │ Alert  │
└─────────┘    └─────────────┘    └──────────────┘    └──────────┘    └────────┘
                                      ↓ (if unknown)
                                 ┌──────────┐
                                 │ Manual   │
                                 │ Review   │
                                 └──────────┘
```

---

## 📋 Prerequisites

1. **Sentry** configured and sending alerts
2. **GitHub** repository access
3. **Slack** workspace admin access

---

## 🔧 Step 1: Slack Webhook Setup

### Create Incoming Webhook

1. Go to **Slack → Your App → Incoming Webhooks**
2. Click **Add New Webhook to Workspace**
3. Select channel (e.g., `#incidents` or `#alerts`)
4. Copy the **Webhook URL**

**Example URL:**
```
REMOVED
```

---

## 📁 Step 2: Environment Variables

Add to `.env.local`:

```bash
# Required for Auto-Fix PRs
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=your-github-username
GITHUB_REPO=uibac

# Required for Slack notifications
SLACK_WEBHOOK_URL=REMOVED
```

---

## ✅ Step 3: Verification

### Check Webhook Status

```bash
curl http://localhost:3000/api/alerts
```

**Expected Response:**
```json
{
  "status": "ready",
  "features": [
    "severity-mapping",
    "incident-creation",
    "auto-response",
    "auto-fix-agent",
    "github-pr-creation",
    "slack-notifications"
  ],
  "integrations": {
    "github": {
      "configured": true,
      "envVars": ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"]
    },
    "slack": {
      "configured": true,
      "envVar": "SLACK_WEBHOOK_URL"
    }
  }
}
```

---

## 🧪 Step 4: Test Incident Flow

### Test 1: Full Auto-Fix Flow (CRITICAL + Known Pattern)

```bash
curl -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "level": "fatal",
    "title": "Cannot read property of undefined",
    "message": "Cannot read property \"data\" of undefined",
    "environment": "production",
    "event": {
      "event_id": "test-123",
      "release": "1.0.0"
    }
  }'
```

**Expected Results:**
- [ ] Console: `🚨 CRITICAL INCIDENT`
- [ ] Console: `🤖 AUTO-FIX AGENT: Generating PR`
- [ ] Console: `✅ AUTO-FIX PR CREATED: https://github.com/...`
- [ ] Console: `[SLACK] ✅ Alert sent`
- [ ] Slack: Alert appears with severity + PR link
- [ ] GitHub: Draft PR created with fix

---

### Test 2: Unknown Pattern (Manual Review)

```bash
curl -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "level": "fatal",
    "title": "Mysterious cosmic error",
    "message": "Something unknown happened",
    "environment": "production"
  }'
```

**Expected Results:**
- [ ] Console: `🚨 CRITICAL INCIDENT`
- [ ] Console: `🤖 AUTO-FIX: No pattern match`
- [ ] Console: `[SLACK] ✅ Alert sent`
- [ ] Slack: Alert appears with "Manual Review Required"
- [ ] No PR created

---

### Test 3: WARNING Severity (No Auto-Fix)

```bash
curl -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "level": "error",
    "title": "High latency detected",
    "message": "API response > 1000ms",
    "environment": "production"
  }'
```

**Expected Results:**
- [ ] Console: `⚠️ WARNING — Monitor closely`
- [ ] Console: `[SLACK] ✅ Alert sent`
- [ ] Slack: Alert appears (orange/warning color)
- [ ] No auto-fix attempted

---

## 🤖 Auto-Fix Agent Behavior

### Safety Constraints (ALL must be true)

| Constraint | Value | Why |
|------------|-------|-----|
| Severity | `CRITICAL` | Only fix urgent issues |
| Pattern | Known | Must recognize error type |
| Confidence | `high` | Must be safe to fix |
| Patch Size | < 20 lines | Minimal change |
| Directory | `lib/`, `app/`, `components/` | Safe paths only |

### Error Patterns Recognized

| Pattern | Error Message | Fix |
|---------|---------------|-----|
| **Undefined Access** | "Cannot read property of undefined" | `?.` optional chaining |
| **Fetch Errors** | "Failed to fetch" | Try-catch wrapper |
| **Type Error** | "is not a function" | Type guard |
| **Array Safety** | "length of undefined" | Array validation |
| **JSON Parse** | "Unexpected token" | Try-catch JSON.parse |
| **Reference Error** | "is not defined" | Existence check |

### Fallback Behavior

If auto-fix CANNOT run:
1. Incident still created
2. Slack alert still sent
3. Message indicates "Manual Review Required"
4. No PR created

---

## 📊 Slack Message Format

### CRITICAL with Auto-Fix

```
🚨 *Cannot read property of undefined*

[Severity: CRITICAL] [Environment: production]
Error: Cannot read property "data" of undefined

🤖 Auto-Fix Generated: Fix undefined access with optional chaining
🔧 Pull Request: View PR #42

Incident ID: INC-1234567890
```

### CRITICAL - Manual Review

```
🚨 *Mysterious cosmic error*

[Severity: CRITICAL] [Environment: production]
Error: Something unknown happened

⚠️ Auto-Fix Skipped: Unknown error pattern - manual review required

Incident ID: INC-1234567891
```

---

## 🔐 Security & Safety

### GitHub PR Safety

- ✅ All PRs created as **DRAFT**
- ✅ **No auto-merge** - human approval required
- ✅ Only patches **< 20 lines**
- ✅ Only **high confidence** patterns
- ✅ Only **safe directories**

### Slack Notifications

- ✅ No sensitive data in messages
- ✅ Error messages truncated at 500 chars
- ✅ Environment clearly labeled
- ✅ Incident ID for traceability

---

## 📈 Production Monitoring

### Key Metrics

| Metric | Target | Alert If |
|--------|--------|----------|
| Auto-fix success rate | > 80% | < 70% |
| PR creation time | < 5s | > 10s |
| Slack delivery | 100% | < 95% |
| False positive rate | < 5% | > 10% |

### Dashboard URLs

- **Incidents:** `http://localhost:3000/incidents`
- **Telemetry Debug:** `http://localhost:3000/telemetry-debug`
- **Webhook Status:** `http://localhost:3000/api/alerts`

---

## 🚨 Troubleshooting

### Slack Not Receiving Messages

```bash
# Check webhook URL
echo $SLACK_WEBHOOK_URL

# Test webhook
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message"}'
```

### GitHub PR Not Created

```bash
# Check environment
curl http://localhost:3000/api/alerts | grep githubConfigured

# Verify token scope (needs 'repo')
# Check repo permissions
```

### Auto-Fix Not Triggering

```bash
# Check all constraints
curl -X POST http://localhost:3000/api/alerts \
  -d '{"level":"fatal","message":"Cannot read property","environment":"production"}'

# Watch console logs for:
# - "🤖 AUTO-FIX AGENT: Generating PR" (pattern matched)
# - "🤖 AUTO-FIX SKIPPED" (safety check failed)
```

---

## 🎓 Validation Checklist

Before declaring system ready:

- [ ] Slack webhook configured and tested
- [ ] GitHub token configured and tested
- [ ] Test incident creates Slack alert (< 2s)
- [ ] Known pattern creates GitHub PR
- [ ] Unknown pattern skips PR (manual review)
- [ ] WARNING severity skips auto-fix
- [ ] All PRs are draft (require approval)
- [ ] Incident dashboard shows all alerts
- [ ] Full traceability: Error → Patch → PR → Slack

---

## 🏆 Success Criteria

**System is PRODUCTION READY when:**

✅ Real-time alert delivery (< 2s)
✅ Zero false-positive PRs (safety constraints working)
✅ All PRs require human approval (draft mode)
✅ Full traceability: Error → Patch → PR → Slack
✅ Observable end-to-end (dashboard + logs)

---

## 🚀 Investor Pitch Ready

**Demo Script:**

1. **Show Sentry Integration:** "We're fully instrumented"
2. **Trigger Test Error:** `curl` command
3. **Watch Console:** Real-time processing
4. **Show Slack:** Alert appears instantly
5. **Show GitHub:** Draft PR with fix
6. **Explain Safety:** "Only high-confidence, minimal patches"
7. **Close with:** "This is PagerDuty-class SRE automation"

**Key Message:**
> "We're not just monitoring errors—we're automatically detecting, classifying, and proposing fixes for production issues. Human approval required, but zero manual triage time."

---

## 🔮 Next Steps (Step 10)

- [ ] Auto-merge after tests pass
- [ ] Canary deployment + rollback
- [ ] LLM-powered deep fixes (OpenAI/Claude)
- [ ] Self-healing infrastructure

---

## Status

```
🚀 STEP 9 COMPLETE: Slack Bot + Auto-Debug + Auto-Fix Agent

✅ Sentry integration
✅ Alert webhook
✅ AI patch agent (6 patterns)
✅ GitHub PR automation
✅ Slack notifications
✅ Safety constraints
✅ Full traceability

SYSTEM UPGRADED TO: AI-POWERED SRE PLATFORM (PagerDuty-class)
```

---

**Run validation:** `node scripts/validate-step9.js`
