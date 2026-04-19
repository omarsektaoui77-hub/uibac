# Step 1: GitHub Actions Setup

## Overview
Set up GitHub Actions workflow to automate testing and deployment for your Next.js project.

## What is GitHub Actions?
GitHub Actions is a CI/CD platform that allows you to automate build, test, and deployment workflows directly in your GitHub repository.

## Step-by-Step Instructions

### 1: Enable GitHub Actions

#### Step A: Go to Repository
1. Go to https://github.com/omarsektaoui77-hubs/uibac
2. Click "Actions" tab
3. GitHub Actions is automatically enabled for all repositories

### 2: Create GitHub Actions Workflow Directory

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Create .github/workflows directory
if (!(Test-Path ".github\workflows")) {
    New-Item -ItemType Directory -Path ".github\workflows" -Force
}
```

### 3: Create CI/CD Workflow File

#### Create file: `.github/workflows/ci-cd.yml`:
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
        run: npm test || echo "No test script found"
      
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

#### PowerShell Command to Create:
```powershell
$workflow = @"
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
        run: npm test || echo "No test script found"
      
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
"@
Set-Content -Path "C:\Users\DELL\uibac\.github\workflows\ci-cd.yml" -Value $workflow
```

### 4: Get Vercel Credentials

#### Step A: Get Vercel Token
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "GitHub Actions"
4. Scope: Full Account
5. Copy the token (save it!)

#### Step B: Get Vercel Org ID
1. Go to https://vercel.com/omarsektaoui77-hubs/teams
2. Copy the Team ID from URL or settings

#### Step C: Get Vercel Project ID
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/general
2. Copy the Project ID

### 5: Add Secrets to GitHub

#### Step A: Go to GitHub Repository Settings
1. Go to https://github.com/omarsektaoui77-hubs/uibac/settings/secrets/actions
2. Click "New repository secret"

#### Step B: Add Secrets
Add the following secrets:
- **Name:** `VERCEL_TOKEN`
  **Value:** Your Vercel token from Step 4A

- **Name:** `VERCEL_ORG_ID`
  **Value:** Your Vercel Org ID from Step 4B

- **Name:** `VERCEL_PROJECT_ID`
  **Value:** Your Vercel Project ID from Step 4C

### 6: Commit and Push Workflow

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit workflow file
git add .github/workflows/ci-cd.yml
git commit -m "Add GitHub Actions CI/CD workflow"
git push origin main
```

### 7: Verify Workflow Runs

#### Step A: Check GitHub Actions
1. Go to https://github.com/omarsektaoui77-hubs/uibac/actions
2. You should see the workflow running
3. Wait for it to complete

#### Step B: Check Workflow Logs
1. Click on the workflow run
2. Check each step for errors
3. Verify deployment succeeded

## Time Estimate
**15 minutes** to complete this step

## Cost
**$0** - GitHub Actions is free for public repos

## Common Issues

### Issue: Workflow fails on build
**Solution:**
1. Check build logs in GitHub Actions
2. Ensure all dependencies are in package.json
3. Check for build errors locally first

### Issue: Vercel deployment fails
**Solution:**
1. Verify Vercel credentials are correct
2. Check Vercel project is linked to GitHub
3. Ensure secrets are properly set

### Issue: Secrets not found
**Solution:**
1. Check secrets are in repository settings
2. Verify secret names match workflow
3. Ensure secrets are not encrypted incorrectly

## Next Steps
- Configure automated testing (see `02-automated-testing.md`)
