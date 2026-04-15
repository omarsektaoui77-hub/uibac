# CI/CD Pipeline Documentation

## Overview

This document describes the CI/CD pipeline for BacFlow, including automated route validation, preview deployments, and rollback procedures.

---

## 🚀 Automated Route Validation

### GitHub Actions Workflow

**File:** `.github/workflows/route-validation.yml`

**Triggers:**
- Push to `main` branch
- Pull request to `main` branch

**What it does:**
1. Installs dependencies
2. Builds the application
3. Starts the production server
4. Runs route validation tests (`scripts/test-routes.js`)

**Test Coverage:**
- Root route redirect (`/ → /en`)
- All locale routes (`/en`, `/fr`, `/ar`, `/es`)
- Invalid nested routes (`/ar/es` → 404)

**Behavior:**
- ❌ If tests fail → Block merge + block deployment
- ✅ If tests pass → Allow deployment

---

## 🔒 Branch Protection (Manual Configuration)

### Steps to Protect Main Branch:

1. Go to: https://github.com/omarsektaoui77-hub/uibac/settings/branches

2. Click "Add rule"

3. Branch name pattern: `main`

4. **Enable:**
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

5. **Required status checks:**
   - `Route Validation` (from GitHub Actions)

6. Click "Create" or "Save changes"

**Result:** Direct pushes to `main` are blocked. All changes must go through PRs with passing CI checks.

---

## 🌍 Preview Deployments (Vercel Configuration)

### Steps to Enable Preview Deployments:

1. Go to: https://vercel.com/omarsektaoui77-hubs-projects/bacflow-production/settings/git

2. **Git Integration:**
   - Ensure GitHub is connected
   - Ensure "Deploy on Push" is enabled

3. **Preview Deployments:**
   - Go to: https://vercel.com/omarsektaoui77-hubs-projects/bacflow-production/settings/deployments
   - Ensure "Preview Deployments" is enabled
   - Set "Preview Branches" to "All branches" or specific branches

4. **Environment Variables:**
   - Ensure production variables are set for `main` branch
   - Set staging variables for preview branches if needed

**Preview URL Format:**
- `https://<branch-name>-bacflow-production.vercel.app`

**Example:**
- Branch: `feature/new-ui` → `https://feature-new-ui-bacflow-production.vercel.app`

---

## 🔁 Rollback Procedure (Vercel)

### Instant Rollback via Dashboard:

1. Go to: https://vercel.com/omarsektaoui77-hubs-projects/bacflow-production/deployments

2. Find the previous successful deployment

3. Click "⋮" (three dots) menu

4. Click "Promote to Production" or "Redeploy"

### Rollback via CLI (Optional):

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Rollback to previous deployment
vercel rollback <deployment-url>
```

---

## 🧪 Development Workflow

### Safe Feature Development:

1. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "Add your feature"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Get preview URL:**
   - Vercel automatically creates preview deployment
   - Check Vercel dashboard for preview URL

5. **Test preview deployment:**
   - Run manual tests on preview URL
   - Verify routes work correctly
   - Check new functionality

6. **Create Pull Request:**
   - Go to GitHub and create PR
   - CI route validation runs automatically
   - Wait for checks to pass

7. **Merge to main:**
   - Only after CI passes
   - Only after preview testing is successful
   - Production deployment triggers automatically

---

## 📊 Monitoring

### Production Monitoring:

**Endpoint:** `https://bacflow-production.vercel.app/api/monitoring`

**Metrics Available:**
- Total requests
- Success rate
- Average response time
- Error rate
- P95 response time

### Preview Monitoring:

Use the same endpoint on preview URLs:
`https://<branch-name>-bacflow-production.vercel.app/api/monitoring`

---

## 🚨 Troubleshooting

### CI Tests Failing:

1. Check GitHub Actions logs
2. Run tests locally:
   ```bash
   npm run build
   npm run start &
   sleep 10
   node scripts/test-routes.js
   ```

3. Fix issues and push again

### Preview Deployment Issues:

1. Check Vercel build logs
2. Ensure all environment variables are set
3. Verify build succeeds locally

### Production Issues:

1. Use instant rollback via Vercel dashboard
2. Check monitoring endpoint for errors
3. Investigate logs and fix issue
4. Deploy fix through normal workflow

---

## 🎯 Best Practices

1. **Always use feature branches** - Never commit directly to main
2. **Test preview deployments** - Never merge without preview testing
3. **Monitor production** - Check `/api/monitoring` regularly
4. **Keep deployments small** - Frequent, small deployments are safer
5. **Document changes** - Use clear commit messages and PR descriptions

---

## 📝 Summary

- ✅ Automated route validation on every push/PR
- ✅ Preview deployments for all branches
- ✅ Branch protection prevents direct main pushes
- ✅ Instant rollback capability via Vercel
- ✅ Safe, iterative development workflow
- ✅ Production monitoring with enhanced metrics

**Result:** Zero-risk deployments with continuous validation and instant recovery.
