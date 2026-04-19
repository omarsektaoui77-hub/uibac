# Step 4: Production Deployments

## Overview
Configure automatic production deployments when code is merged to the main branch.

## What are Production Deployments?
Production deployments automatically deploy your changes to production when you merge to the main branch, ensuring a smooth deployment process.

## Step-by-Step Instructions

### 1: Verify Production Deployment Settings

#### In Vercel Dashboard:
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/git
2. Verify "Production Branch" is set to `main`
3. Verify "Automatic Deployments" is enabled

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
      
      - name: Create Git Tag
        uses: actions/github-script@v6
        with:
          script: |
            const tag = `prod-${new Date().toISOString().slice(0,10)}-${context.sha.slice(0,7)}`
            github.rest.git.createRef({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: `refs/tags/${tag}`,
              sha: context.sha
            })
```

### 3: Test Production Deployment

#### Step A: Create Test Branch
```powershell
cd C:\Users\DELL\uibac

# Create test branch
git checkout -b feature/test-production

# Make a small change
# (e.g., add a comment to README.md)

# Commit and push
git add .
git commit -m "Test production deployment"
git push origin feature/test-production
```

#### Step B: Create Pull Request
1. Go to https://github.com/omarsektaoui77-hubs/uibac
2. Click "Pull requests"
3. Click "New pull request"
4. Select `feature/test-production` branch
5. Click "Create pull request"

#### Step C: Test Preview
1. Wait for preview deployment
2. Test preview URL
3. Verify changes work

#### Step D: Merge to Main
1. Click "Merge pull request"
2. Click "Confirm merge"
3. Delete branch

#### Step E: Verify Production Deployment
1. Go to Actions tab
2. Wait for workflow to complete
3. Check production deployment URL
4. Open https://uibac.vercel.app
5. Verify changes are deployed

### 4: Configure Deployment Protection (Optional)

#### In Vercel Dashboard:
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/protection
2. Configure protection rules:
   - "Require Review": Optional
   - "Branch Protection": Configure in GitHub

#### In GitHub:
1. Go to https://github.com/omarsektaoui77-hubs/uibac/settings/branches
2. Add rule for `main` branch:
   - Require pull request before merging
   - Require status checks to pass
   - Select "test" job as required

## Time Estimate
**10 minutes** to complete this step

## Cost
**$0** - Production deployments are free on Vercel

## Common Issues

### Issue: Production deployment not triggered
**Solution:**
1. Check if push is to `main` branch
2. Verify workflow trigger conditions
3. Check GitHub Actions logs

### Issue: Production deployment fails
**Solution:**
1. Check build logs in GitHub Actions
2. Check Vercel deployment logs
3. Ensure tests pass before deployment

## Next Steps
- Add status badges (see `05-status-badges.md`)
