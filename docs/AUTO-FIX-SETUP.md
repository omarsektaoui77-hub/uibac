# Auto-Fix Agent Setup Guide

## 🤖 Overview

The Auto-Fix Agent automatically generates GitHub PRs with code patches for CRITICAL production errors.

```
Sentry Error → AI Analysis → Patch Generation → GitHub PR → Slack Notification
```

---

## Prerequisites

1. **GitHub Account** with repository access
2. **GitHub Personal Access Token** (classic)
3. **Repository** with proper permissions

---

## Step 1: Create GitHub Personal Access Token

1. Go to **GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Optional: Update GitHub Action workflow files)
4. Generate and copy the token

---

## Step 2: Configure Environment Variables

Add to `.env.local`:

```bash
# GitHub Integration (Required for Auto-Fix)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=your-github-username
GITHUB_REPO=uibac
```

**Example:**
```bash
GITHUB_TOKEN=ghp_abc123def456ghi789
GITHUB_OWNER=omarsektaoui
GITHUB_REPO=uibac
```

---

## Step 3: Validate GitHub Integration

Start the dev server and test:

```bash
npm run dev
```

Check webhook status:
```bash
curl http://localhost:3000/api/alerts
```

**Expected response:**
```json
{
  "status": "ready",
  "autoFix": {
    "enabled": true,
    "githubConfigured": true,
    "patterns": [...]
  }
}
```

If `githubConfigured` is `false`, check your environment variables.

---

## Step 4: Test Auto-Fix Flow

### Test 1: Known Error Pattern (Should Create PR)

Trigger a CRITICAL alert with a known error:

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

**Expected:**
- Incident created with CRITICAL severity
- Auto-fix agent triggered
- GitHub PR created (if configured)
- Console logs show: `✅ AUTO-FIX PR CREATED: https://github.com/...`

### Test 2: Unknown Error Pattern (Should Skip)

```bash
curl -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "level": "fatal",
    "title": "Unknown mystical error",
    "message": "Something strange happened",
    "environment": "production"
  }'
```

**Expected:**
- Incident created with CRITICAL severity
- Console logs show: `🤖 AUTO-FIX: No pattern match`
- No PR created

---

## Supported Error Patterns

The Auto-Fix Agent can generate patches for:

| Pattern | Error Message | Fix Type |
|---------|---------------|----------|
| **Undefined Access** | "Cannot read property of undefined" | Optional chaining (`?.`) |
| **Fetch Errors** | "Failed to fetch", "NetworkError" | Try-catch wrapper |
| **Type Errors** | "is not a function" | Type guard |
| **Array Safety** | "Cannot read property 'length' of undefined" | Array validation |
| **JSON Parse** | "Unexpected token in JSON" | Try-catch for JSON.parse |
| **Reference Errors** | "is not defined" | Existence check |

---

## Safety Rules

Auto-fix ONLY applies when:

1. ✅ Severity is **CRITICAL**
2. ✅ Error pattern is **known**
3. ✅ Patch confidence is **high**
4. ✅ Patch size is **< 20 lines**
5. ✅ File path matches **safe patterns** (lib/, app/, components/)
6. ✅ GitHub is **configured**

If ANY rule fails:
→ Falls back to "suggest only" mode
→ Incident created, but no PR generated

---

## Architecture

### File Structure

```
lib/
├── ai/
│   └── patchAgent.ts          # Pattern matching & patch generation
├── github/
│   ├── createPR.ts            # GitHub API integration
│   └── commitPatch.ts         # Branch/commit/PR workflow
app/
├── api/
│   └── alerts/
│       └── route.ts           # Webhook with auto-fix integration
```

### Flow

```
1. Sentry sends alert → POST /api/alerts
2. Severity mapped → CRITICAL/WARNING/INFO
3. If CRITICAL:
   a. Generate incident
   b. Analyze error pattern
   c. If pattern known + safe → generate patch
   d. Create GitHub branch
   e. Commit patch
   f. Create draft PR
   g. Return PR URL in response
4. Slack notification (optional)
```

---

## Configuration Options

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | ✅ Yes | GitHub Personal Access Token |
| `GITHUB_OWNER` | ✅ Yes | GitHub username or org |
| `GITHUB_REPO` | ✅ Yes | Repository name |
| `NEXT_PUBLIC_SENTRY_DSN` | ✅ Yes | Sentry DSN (for error tracking) |

### Auto-Fix Behavior

Edit `/lib/ai/patchAgent.ts` to:
- Add new error patterns
- Adjust safety thresholds
- Modify confidence levels

---

## Production Deployment

### Before Deploying

1. ✅ GitHub token has `repo` scope
2. ✅ Environment variables set in production
3. ✅ Tested with demo error
4. ✅ Repository allows PR creation from API
5. ✅ Branch protection rules reviewed

### Deployment Steps

```bash
# Set production env vars
export GITHUB_TOKEN=ghp_xxx
export GITHUB_OWNER=your-org
export GITHUB_REPO=production-repo

# Build and start
npm run build
npm start
```

### Post-Deployment Verification

```bash
# 1. Check webhook health
curl https://your-domain.com/api/alerts

# 2. Trigger test error
curl -X POST https://your-domain.com/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"level":"fatal","title":"Cannot read property of undefined","environment":"production"}'

# 3. Verify PR appears in GitHub
```

---

## Troubleshooting

### Issue: "GitHub not configured"

**Cause:** Environment variables missing

**Fix:**
```bash
# Verify env vars are loaded
echo $GITHUB_TOKEN
echo $GITHUB_OWNER
echo $GITHUB_REPO

# Restart dev server after adding to .env.local
```

### Issue: "Failed to create PR: 404"

**Cause:** Token lacks permissions or repo doesn't exist

**Fix:**
1. Check token has `repo` scope
2. Verify `GITHUB_OWNER` and `GITHUB_REPO` are correct
3. Ensure repository exists and token owner has access

### Issue: "Branch already exists"

**Cause:** Race condition or duplicate alert

**Fix:** The code handles this gracefully - branch will be reused.

### Issue: Auto-fix not triggering

**Checklist:**
- [ ] Error is CRITICAL severity?
- [ ] Error pattern is known? (check logs)
- [ ] Patch confidence is high?
- [ ] GitHub is configured?
- [ ] File path is in safe patterns?

---

## Security Considerations

1. **Token Scope:** Use classic token with minimal `repo` scope
2. **Draft PRs:** All auto-fix PRs are created as drafts
3. **Code Review:** Never auto-merge - always require human review
4. **Audit Log:** All auto-fix actions logged in incident store
5. **Rate Limiting:** GitHub API has rate limits - implement caching if needed

---

## Future Enhancements

- [ ] **LLM Integration:** Use OpenAI/Anthropic for complex patches
- [ ] **AST Parsing:** Apply actual diffs using abstract syntax trees
- [ ] **Auto-Test:** Run tests on generated PRs
- [ ] **Auto-Merge:** Merge PRs that pass all checks
- [ ] **Canary Deploy:** Deploy fix to 1% of traffic first
- [ ] **Rollback:** Auto-rollback if error rate increases

---

## Status

```
🤖 AUTO-FIX AGENT: READY FOR PRODUCTION

✅ Pattern recognition active
✅ GitHub integration configured
✅ Safety rules enforced
✅ Draft PRs created automatically
✅ Human review required before merge
```

---

## Support

For issues or questions:
1. Check logs in `/incidents` dashboard
2. Review webhook response at `/api/alerts`
3. Verify GitHub token permissions
4. Test with known error patterns first
