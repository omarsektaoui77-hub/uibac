# Step 2: Automated Testing Setup

## Overview
Configure automated testing in GitHub Actions to run tests on every push and pull request.

## What is Automated Testing?
Automated testing runs your test suite automatically as part of the CI/CD pipeline, ensuring code quality before deployment.

## Step-by-Step Instructions

### 1: Add Test Script to package.json

#### Update package.json:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.4.3",
    "jest": "^29.5.0",
    "jest-environment-jsdom": "^29.5.0"
  }
}
```

#### PowerShell Command to Add Jest:
```powershell
cd C:\Users\DELL\uibac

# Install testing dependencies
npm install --save-dev jest @testing-library/jest-dom @testing-library/react @testing-library/user-event jest-environment-jsdom
```

### 2: Configure Jest

#### Create file: `jest.config.js`:
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'pages/**/*.{js,jsx}',
    'components/**/*.{js,jsx}',
    'lib/**/*.{js,jsx}',
    '!**/*.config.js',
    '!**/node_modules/**',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

#### Create file: `jest.setup.js`:
```javascript
import '@testing-library/jest-dom'
```

### 3: Create Sample Test

#### Create file: `__tests__/example.test.js`:
```javascript
import { render, screen } from '@testing-library/react'
import Home from '../pages/index'

describe('Home', () => {
  it('renders without crashing', () => {
    render(<Home />)
    expect(screen.getByText(/welcome/i)).toBeInTheDocument()
  })
})
```

#### PowerShell Command to Create Test Directory:
```powershell
# Create __tests__ directory
if (!(Test-Path "C:\Users\DELL\uibac\__tests__")) {
    New-Item -ItemType Directory -Path "C:\Users\DELL\uibac\__tests__"
}
```

### 4: Run Tests Locally

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### 5: Update GitHub Actions Workflow

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

### 6: Commit and Push

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit test configuration
git add .
git commit -m "Add automated testing with Jest"
git push origin main
```

### 7: Verify Tests Run in CI

#### Step A: Check GitHub Actions
1. Go to https://github.com/omarsektaoui77-hubs/uibac/actions
2. Click on the latest workflow run
3. Verify tests pass

#### Step B: Check Test Results
1. Click on the "Run tests" step
2. Check test output
3. Verify all tests pass

## Time Estimate
**15 minutes** to complete this step

## Cost
**$0** - Testing is free

## Common Issues

### Issue: Tests fail in CI but pass locally
**Solution:**
1. Check Node.js version in CI (should be v18)
2. Check environment variables in CI
3. Verify test configuration

### Issue: Jest configuration errors
**Solution:**
1. Check jest.config.js syntax
2. Ensure jest.setup.js exists
3. Verify test files are in correct location

## Next Steps
- Configure preview deployments (see `03-preview-deployments.md`)
