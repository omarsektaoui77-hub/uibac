# Troubleshooting Guide - CI/CD Pipeline

## Common Issues and Solutions

### Issue 1: GitHub Actions Workflow Not Triggering

**Symptoms:**
- Workflow doesn't run on push
- Workflow doesn't run on pull request
- No workflow runs in Actions tab

**Solutions:**

#### Check 1: Workflow File Location
```powershell
# Verify workflow file exists
Test-Path "C:\Users\DELL\uibac\.github\workflows\ci-cd.yml"
```

#### Check 2: Workflow File Syntax
1. Go to https://github.com/omarsektaoui77-hubs/uibac/actions
2. Click on the workflow file
3. Check for syntax errors
4. YAML must be properly indented

#### Check 3: Workflow Triggers
```yaml
# Verify triggers are correct
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
```

#### Check 4: Branch Names
- Ensure branch names match exactly
- Check for typos in branch names
- Verify you're pushing to correct branch

### Issue 2: Tests Fail in CI but Pass Locally

**Symptoms:**
- Tests pass locally
- Tests fail in GitHub Actions
- Build fails in CI

**Solutions:**

#### Check 1: Node.js Version
```yaml
# Ensure Node.js version matches
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '18'
```

#### Check 2: Dependencies
```yaml
# Use npm ci for clean install
- name: Install dependencies
  run: npm ci
```

#### Check 3: Environment Variables
- Check if environment variables are set in CI
- Add secrets to GitHub repository settings
- Verify variable names match

#### Check 4: Test Configuration
- Check jest.config.js is correct
- Ensure test files are in correct location
- Verify test scripts in package.json

### Issue 3: Vercel Deployment Fails

**Symptoms:**
- Deployment step fails in workflow
- Vercel token errors
- Project not found errors

**Solutions:**

#### Check 1: Vercel Credentials
```powershell
# Verify secrets are set in GitHub
# Go to: https://github.com/omarsektaoui77-hubs/uibac/settings/secrets/actions
# Check: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
```

#### Check 2: Vercel Token
1. Go to https://vercel.com/account/tokens
2. Verify token is valid
3. Regenerate token if needed

#### Check 3: Vercel Project Link
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/git
2. Verify GitHub is connected
3. Reconnect if needed

#### Check 4: Workflow Syntax
```yaml
# Ensure Vercel action is correct
- name: Deploy to Vercel Production
  uses: amondnet/vercel-action@v20
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
    vercel-args: '--prod'
```

### Issue 4: Preview Deployment Not Created

**Symptoms:**
- Preview deployment not created on PR
- No preview URL in workflow output
- Preview deployment fails

**Solutions:**

#### Check 1: Pull Request Trigger
```yaml
# Verify trigger condition
deploy-preview:
  if: github.event_name == 'pull_request'
```

#### Check 2: Test Job Dependency
```yaml
# Ensure deploy-preview depends on test
deploy-preview:
  needs: test
```

#### Check 3: Vercel Preview Settings
1. Go to Vercel dashboard → Settings → Git
2. Verify "Automatic Preview Deployments" is enabled
3. Check preview deployment settings

### Issue 5: Production Deployment Not Triggered

**Symptoms:**
- Production deployment not triggered on merge
- No production deployment in Vercel
- Workflow doesn't run on main branch push

**Solutions:**

#### Check 1: Branch Name
```yaml
# Verify branch name is correct
deploy-production:
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

#### Check 2: Merge to Main
- Ensure you're merging to `main` branch
- Not `master` or other branch
- Check branch protection settings

#### Check 3: Test Job Dependency
```yaml
# Ensure deploy-production depends on test
deploy-production:
  needs: test
```

### Issue 6: Secrets Not Found

**Symptoms:**
- "Secret not found" error in workflow
- Environment variables missing
- Deployment fails due to missing secrets

**Solutions:**

#### Check 1: Secrets in Repository Settings
1. Go to https://github.com/omarsektaoui77-hubs/uibac/settings/secrets/actions
2. Verify all secrets are present
3. Check secret names match workflow

#### Check 2: Secret Syntax
```yaml
# Ensure correct syntax
${{ secrets.VERCEL_TOKEN }}
```

#### Check 3: Secret Scope
- Ensure secrets are in "Actions" scope
- Not "Codespaces" or other scope
- Check organization vs repository secrets

### Issue 7: Build Fails in CI

**Symptoms:**
- Build step fails
- TypeScript errors
- Module not found errors

**Solutions:**

#### Check 1: Build Locally First
```powershell
cd C:\Users\DELL\uibac
npm run build
```

#### Check 2: Dependencies
```yaml
# Use npm ci for clean install
- name: Install dependencies
  run: npm ci
```

#### Check 3: Node.js Version
- Ensure Node.js version is compatible
- Check package.json engines field
- Update Node.js version if needed

### Issue 8: Status Badges Not Updating

**Symptoms:**
- Badges show error
- Badges not updating
- Badge URLs broken

**Solutions:**

#### Check 1: Badge URLs
- Verify badge URLs are correct
- Check if service is accessible
- Test badge URL in browser

#### Check 2: Workflow Name
```
# Ensure workflow name matches badge URL
# Badge: .../actions/workflows/ci-cd.yml/badge.svg
# Workflow: .github/workflows/ci-cd.yml
```

#### Check 3: Cache
- Clear browser cache
- Hard refresh page (Ctrl+F5)
- Wait a few minutes for update

### Getting Help

#### Check Workflow Logs
1. Go to https://github.com/omarsektaoui77-hubs/uibac/actions
2. Click on failed workflow run
3. Check each step for errors
4. Download logs for detailed analysis

#### Check Vercel Logs
1. Go to Vercel dashboard → Deployments
2. Click on failed deployment
3. Check build logs
4. Check function logs

#### Useful Commands
```powershell
# Check workflow file exists
Test-Path "C:\Users\DELL\uibac\.github\workflows\ci-cd.yml"

# View workflow file
Get-Content "C:\Users\DELL\uibac\.github\workflows\ci-cd.yml"

# Test build locally
cd C:\Users\DELL\uibac
npm run build

# Test locally
npm test
```

#### Disable CI/CD (Rollback)
If CI/CD is causing issues and you need to disable:

```powershell
# Rename workflow file to disable
Rename-Item "C:\Users\DELL\uibac\.github\workflows\ci-cd.yml" "C:\Users\DELL\uibac\.github\workflows\ci-cd.yml.disabled"

# Commit and push
git add .github/workflows/
git commit -m "Disable CI/CD workflow"
git push origin main
```

#### Contact Support
- GitHub Actions Support: https://github.com/support
- Vercel Support: https://vercel.com/support
- GitHub Community: https://github.community

## Prevention Tips

1. **Test locally first** - Always test build and tests locally
2. **Use semantic versioning** - Tag releases for easy rollback
3. **Monitor workflows** - Check workflow status regularly
4. **Keep secrets secure** - Never commit secrets to repository
5. **Use branch protection** - Require PRs for main branch
6. **Review logs** - Check workflow logs for issues
7. **Keep workflows simple** - Avoid overly complex workflows

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Workflow not triggering | Check workflow file location and syntax |
| Tests fail in CI | Check Node.js version and dependencies |
| Vercel deployment fails | Verify Vercel credentials in secrets |
| Preview not created | Check PR trigger and test dependency |
| Production not triggered | Check branch name and merge to main |
| Secrets not found | Verify secrets in repository settings |
| Build fails | Test build locally first |
| Badges not updating | Check badge URLs and clear cache |

## Workflow URLs

- **GitHub Actions:** https://github.com/omarsektaoui77-hubs/uibac/actions
- **Vercel Deployments:** https://vercel.com/omarsektaoui77-hubs-projects/uibac/deployments
- **GitHub Secrets:** https://github.com/omarsektaoui77-hubs/uibac/settings/secrets/actions
- **Vercel Settings:** https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings
