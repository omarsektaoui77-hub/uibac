# Step 3: Preview Deployments

## Overview
Configure automatic preview deployments for every pull request using GitHub Actions and Vercel.

## What are Preview Deployments?
Preview deployments are automatically created for every pull request, allowing you to test changes before merging to production.

## Step-by-Step Instructions

### 1: Verify Vercel GitHub Integration

#### Step A: Check Vercel Dashboard
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/git
2. Verify GitHub is connected
3. Verify "Automatic Preview Deployments" is enabled

#### Step B: Check GitHub Webhooks
1. Go to https://github.com/omarsektaoui77-hubs/uibac/settings/hooks
2. Verify Vercel webhook is present
3. If missing, reconnect GitHub in Vercel

### 2: Update GitHub Actions Workflow

#### Update `.github/workflows/ci-cd.yml`:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint || echo "No lint script found"
      
      - name: Run tests
        run: npm test
      
      - name: Build project
        run: npm run build
  
  deploy-preview:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'pull_request'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prebuilt'
      
      - name: Comment Preview URL on PR
        uses: actions/github-script@v6
        if: success()
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Preview deployment ready! Check it out here: ' + '${{ steps.deploy.outputs.url }}'
            })
  
  deploy-production:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 3: Test Preview Deployment

#### Step A: Create Test Branch
```powershell
cd C:\Users\DELL\uibac

# Create test branch
git checkout -b feature/test-preview

# Make a small change
# (e.g., add a comment to README.md)

# Commit and push
git add .
git commit -m "Test preview deployment"
git push origin feature/test-preview
```

#### Step B: Create Pull Request
1. Go to https://github.com/omarsektaoui77-hubs/uibac
2. Click "Pull requests"
3. Click "New pull request"
4. Select `feature/test-preview` branch
5. Click "Create pull request"

#### Step C: Check GitHub Actions
1. Go to Actions tab
2. Wait for workflow to complete
3. Check preview deployment URL

#### Step D: Test Preview URL
1. Copy preview URL from workflow output
2. Open in browser
3. Test all features
4. Verify changes are deployed

### 4: Clean Up Test Branch

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Merge or close PR
# (Do this in GitHub UI)

# Delete branch
git checkout main
git branch -D feature/test-preview
git push origin --delete feature/test-preview
```

### 5: Configure Preview Deployment Settings

#### In Vercel Dashboard:
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/git
2. Configure preview deployment settings:
   - "Automatic Preview Deployments": Enabled
   - "Preview Deployment Comments": Enabled
   - "Preview Deployment Environment Variables": Same as production

## Time Estimate
**10 minutes** to complete this step

## Cost
**$0** - Preview deployments are free on Vercel

## Common Issues

### Issue: Preview deployment not triggered
**Solution:**
1. Check GitHub webhook is present
2. Verify Vercel is connected to GitHub
3. Check workflow triggers on pull_request

### Issue: Preview deployment fails
**Solution:**
1. Check build logs in GitHub Actions
2. Check Vercel deployment logs
3. Verify tests pass before deployment

## Next Steps
- Configure production deployments (see `04-production-deployments.md`)
