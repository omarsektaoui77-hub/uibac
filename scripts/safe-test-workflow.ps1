# Safe Testing Workflow for Windows PowerShell
# Next.js + Railway + Vercel (Free Tier)

$ErrorActionPreference = "Stop"

# Configuration
$RepoUrl = "https://github.com/omarsektaoui77-hub/uibac"
$SandboxDir = "C:\Users\DELL\Desktop\uibac-safe-test"
$BranchName = "test-safe-" + (Get-Date -Format "yyyyMMddHHmmss")
$BackendUrl = "http://roundhouse.proxy.rlwy.net:39487"
$Port = 3000

Write-Host "=== Safe Testing Workflow ===" -ForegroundColor Cyan
Write-Host "Sandbox: $SandboxDir" -ForegroundColor Yellow
Write-Host "Branch: $BranchName" -ForegroundColor Yellow
Write-Host ""

# Step 1: Backup current state
Write-Host "Step 1: Backup current state..." -ForegroundColor Green
$ProjectDir = "C:\Users\DELL\uibac"
if (Test-Path "$ProjectDir\vercel.json") {
    Copy-Item "$ProjectDir\vercel.json" "$ProjectDir\vercel.json.backup"
    Write-Host "✅ vercel.json backed up" -ForegroundColor Green
}
if (Test-Path "$ProjectDir\.env") {
    Copy-Item "$ProjectDir\.env" "$ProjectDir\.env.backup" -ErrorAction SilentlyContinue
    Write-Host "✅ .env backed up" -ForegroundColor Green
}
if (Test-Path "$ProjectDir\.env.local") {
    Copy-Item "$ProjectDir\.env.local" "$ProjectDir\.env.local.backup" -ErrorAction SilentlyContinue
    Write-Host "✅ .env.local backed up" -ForegroundColor Green
}
Write-Host ""

# Step 2: Check if port 3000 is free
Write-Host "Step 2: Checking if port $Port is free..." -ForegroundColor Green
$PortInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
if ($PortInUse) {
    Write-Host "❌ ERROR: Port $Port is already in use" -ForegroundColor Red
    Write-Host "Run: Stop-Process -Id (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue).OwningProcess -Force" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Port $Port is free" -ForegroundColor Green
Write-Host ""

# Step 3: Create sandbox directory
Write-Host "Step 3: Creating sandbox directory..." -ForegroundColor Green
if (Test-Path $SandboxDir) {
    Write-Host "⚠️  Sandbox directory already exists, removing..." -ForegroundColor Yellow
    Remove-Item -Path $SandboxDir -Recurse -Force
}
New-Item -ItemType Directory -Path $SandboxDir -Force | Out-Null
Write-Host "✅ Sandbox directory created" -ForegroundColor Green
Write-Host ""

# Step 4: Clone repository
Write-Host "Step 4: Cloning repository..." -ForegroundColor Green
Set-Location $SandboxDir
git clone $RepoUrl .
Write-Host "✅ Repository cloned" -ForegroundColor Green
Write-Host ""

# Step 5: Create test branch
Write-Host "Step 5: Creating test branch..." -ForegroundColor Green
git checkout -b $BranchName
Write-Host "✅ Branch $BranchName created" -ForegroundColor Green
Write-Host ""

# Step 6: Backup existing config files in sandbox
Write-Host "Step 6: Backing up configuration files in sandbox..." -ForegroundColor Green
if (Test-Path "vercel.json") {
    Copy-Item "vercel.json" "vercel.json.backup"
    Write-Host "✅ vercel.json backed up" -ForegroundColor Green
} else {
    Write-Host "No vercel.json found" -ForegroundColor Yellow
}
if (Test-Path ".env.local") {
    Copy-Item ".env.local" ".env.local.backup"
    Write-Host "✅ .env.local backed up" -ForegroundColor Green
} else {
    Write-Host "No .env.local found" -ForegroundColor Yellow
}
if (Test-Path ".env") {
    Copy-Item ".env" ".env.backup"
    Write-Host "✅ .env backed up" -ForegroundColor Green
} else {
    Write-Host "No .env found" -ForegroundColor Yellow
}
Write-Host ""

# Step 7: Create .env.local from vercel.json
Write-Host "Step 7: Creating .env.local from vercel.json..." -ForegroundColor Green
if (Test-Path "vercel.json") {
    $VercelJson = Get-Content "vercel.json" -Raw | ConvertFrom-Json
    if ($VercelJson.env.NEXT_PUBLIC_API_URL) {
        $ApiUrl = $VercelJson.env.NEXT_PUBLIC_API_URL
    } else {
        $ApiUrl = $BackendUrl
    }
} else {
    $ApiUrl = $BackendUrl
}

@"
NEXT_PUBLIC_API_URL=$ApiUrl
NODE_ENV=production
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
Write-Host "✅ .env.local created with NEXT_PUBLIC_API_URL=$ApiUrl" -ForegroundColor Green
Write-Host ""

# Step 8: Install dependencies
Write-Host "Step 8: Installing dependencies..." -ForegroundColor Green
npm install
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 9: Build project
Write-Host "Step 9: Building project..." -ForegroundColor Green
try {
    npm run build
    Write-Host "✅ Build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ BUILD FAILED" -ForegroundColor Red
    Write-Host "Check the error messages above" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 10: Start server in background
Write-Host "Step 10: Starting server in background..." -ForegroundColor Green
$ServerProcess = Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow -PassThru -RedirectStandardOutput "server.log" -RedirectStandardError "server-error.log"
$ServerPid = $ServerProcess.Id
Write-Host "✅ Server started with PID: $ServerPid" -ForegroundColor Green
Write-Host ""

# Step 11: Wait for server to start
Write-Host "Step 11: Waiting 5 seconds for server to start..." -ForegroundColor Green
Start-Sleep -Seconds 5
Write-Host ""

# Step 12: Verify server is running
Write-Host "Step 12: Verifying server is running..." -ForegroundColor Green
try {
    $Response = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Server is running at http://localhost:$Port" -ForegroundColor Green
} catch {
    Write-Host "❌ Server failed to start or not responding" -ForegroundColor Red
    Write-Host "Check server-error.log for details" -ForegroundColor Yellow
    Stop-Process -Id $ServerPid -Force -ErrorAction SilentlyContinue
    exit 1
}
Write-Host ""

# Step 13: Test backend connectivity
Write-Host "Step 13: Testing backend connectivity..." -ForegroundColor Green
try {
    $BackendResponse = Invoke-WebRequest -Uri $BackendUrl -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend is reachable at $BackendUrl" -ForegroundColor Green
} catch {
    Write-Host "⚠️  WARNING: Backend is not reachable at $BackendUrl" -ForegroundColor Yellow
    Write-Host "This may cause issues in the application" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "Sandbox: $SandboxDir" -ForegroundColor Yellow
Write-Host "Branch: $BranchName" -ForegroundColor Yellow
Write-Host "Server PID: $ServerPid" -ForegroundColor Yellow
Write-Host "Server URL: http://localhost:$Port" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Open http://localhost:$Port in your browser" -ForegroundColor White
Write-Host "2. Test the application" -ForegroundColor White
Write-Host "3. If everything works, run Vercel deployment commands" -ForegroundColor White
Write-Host "4. If something fails, run the cleanup commands below" -ForegroundColor White
Write-Host ""
Write-Host "=== Cleanup Commands (if something fails) ===" -ForegroundColor Red
Write-Host "Stop-Process -Id $ServerPid -Force" -ForegroundColor White
Write-Host "Remove-Item -Path '$SandboxDir' -Recurse -Force" -ForegroundColor White
Write-Host "git push origin --delete $BranchName" -ForegroundColor White
