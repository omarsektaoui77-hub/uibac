# PowerShell Commands - CI/CD Pipeline Setup

# ============================================
# GITHUB ACTIONS SETUP
# ============================================

# Create GitHub Actions workflow directory
Set-Location "C:\Users\DELL\uibac"
if (!(Test-Path ".github\workflows")) {
    New-Item -ItemType Directory -Path ".github\workflows" -Force
}

# ============================================
# TESTING SETUP
# ============================================

# Install Jest and testing dependencies
npm install --save-dev jest @testing-library/jest-dom @testing-library/react @testing-library/user-event jest-environment-jsdom

# Verify installation
npm list jest

# Create __tests__ directory
if (!(Test-Path "C:\Users\DELL\uibac\__tests__")) {
    New-Item -ItemType Directory -Path "C:\Users\DELL\uibac\__tests__"
}

# Run tests locally
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# ============================================
# GIT COMMANDS
# ============================================

# Create test branch for preview deployment
git checkout -b feature/test-preview

# Commit changes
git add .
git commit -m "Test CI/CD pipeline"
git push origin feature/test-preview

# Switch back to main
git checkout main

# Delete test branch
git branch -D feature/test-preview
git push origin --delete feature/test-preview

# ============================================
# VERIFICATION
# ============================================

# Check workflow file exists
Test-Path "C:\Users\DELL\uibac\.github\workflows\ci-cd.yml"

# View workflow file
Get-Content "C:\Users\DELL\uibac\.github\workflows\ci-cd.yml"

# Check test directory exists
Test-Path "C:\Users\DELL\uibac\__tests__"

# Check package.json scripts
Get-Content "C:\Users\DELL\uibac\package.json" | Select-String "scripts"

# ============================================
# DEPLOYMENT
# ============================================

# Build project locally
npm run build

# Deploy to preview manually (if needed)
vercel --yes

# Deploy to production manually (if needed)
vercel --prod --yes

# List deployments
vercel ls

# ============================================
# CLEANUP / ROLLBACK
# ============================================

# Disable CI/CD workflow
Rename-Item "C:\Users\DELL\uibac\.github\workflows\ci-cd.yml" "C:\Users\DELL\uibac\.github\workflows\ci-cd.yml.disabled"

# Re-enable CI/CD workflow
Rename-Item "C:\Users\DELL\uibac\.github\workflows\ci-cd.yml.disabled" "C:\Users\DELL\uibac\.github\workflows\ci-cd.yml"

# Remove Jest dependencies
npm uninstall jest @testing-library/jest-dom @testing-library/react @testing-library/user-event jest-environment-jsdom

# Remove test directory
Remove-Item "C:\Users\DELL\uibac\__tests__" -Recurse -Force

# Remove Jest config files
Remove-Item "C:\Users\DELL\uibac\jest.config.js"
Remove-Item "C:\Users\DELL\uibac\jest.setup.js"

# ============================================
# VERIFICATION SCRIPT
# ============================================

Write-Host "=== CI/CD PIPELINE SETUP VERIFICATION ===" -ForegroundColor Cyan

Write-Host "`n1. Checking GitHub Actions setup..." -ForegroundColor Yellow
$workflowExists = Test-Path "C:\Users\DELL\uibac\.github\workflows\ci-cd.yml"
if ($workflowExists) { Write-Host "✅ Workflow file exists" -ForegroundColor Green } else { Write-Host "❌ Workflow file missing" -ForegroundColor Red }

Write-Host "`n2. Checking testing setup..." -ForegroundColor Yellow
$jestExists = npm list jest 2>$null
$testDirExists = Test-Path "C:\Users\DELL\uibac\__tests__"
if ($jestExists) { Write-Host "✅ Jest installed" -ForegroundColor Green } else { Write-Host "❌ Jest not installed" -ForegroundColor Red }
if ($testDirExists) { Write-Host "✅ Test directory exists" -ForegroundColor Green } else { Write-Host "❌ Test directory missing" -ForegroundColor Red }

Write-Host "`n3. Checking configuration files..." -ForegroundColor Yellow
$jestConfigExists = Test-Path "C:\Users\DELL\uibac\jest.config.js"
$jestSetupExists = Test-Path "C:\Users\DELL\uibac\jest.setup.js"
if ($jestConfigExists) { Write-Host "✅ jest.config.js exists" -ForegroundColor Green } else { Write-Host "❌ jest.config.js missing" -ForegroundColor Red }
if ($jestSetupExists) { Write-Host "✅ jest.setup.js exists" -ForegroundColor Green } else { Write-Host "❌ jest.setup.js missing" -ForegroundColor Red }

Write-Host "`n4. Testing build..." -ForegroundColor Yellow
try {
    Set-Location "C:\Users\DELL\uibac"
    npm run build
    Write-Host "✅ Build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== VERIFICATION COMPLETE ===" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Add Vercel credentials to GitHub secrets" -ForegroundColor White
Write-Host "2. Test workflow by creating a pull request" -ForegroundColor White
Write-Host "3. Verify preview deployment works" -ForegroundColor White
Write-Host "4. Test production deployment by merging to main" -ForegroundColor White
Write-Host "5. Add status badges to README" -ForegroundColor White
