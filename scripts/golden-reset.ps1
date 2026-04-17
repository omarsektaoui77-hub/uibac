#!/usr/bin/env pwsh
#requires -Version 5.1

<#
.SYNOPSIS
    Golden Reset Command - Full System Recovery
    
.DESCRIPTION
    Performs deep clean and restart of the entire application stack.
    Use this when the system is in an unknown/unrecoverable state.
    
    Actions:
    1. Kills all Node.js processes
    2. Deletes .next cache
    3. Deletes node_modules/.cache
    4. Reinstalls dependencies (clean)
    5. Starts dev server
    
.EXAMPLE
    .\scripts\golden-reset.ps1
    
.EXAMPLE
    .\scripts\golden-reset.ps1 -SkipInstall  # Skip npm install (faster)
#>

[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$VerboseOutput,
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-Step {
    param([string]$Message)
    Write-Host "`n${Blue}[STEP]${Reset} $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "${Green}✓${Reset} $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "${Yellow}⚠${Reset} $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "${Red}✗${Reset} $Message" -ForegroundColor Red
}

function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# ============================================
# STEP 0: Pre-flight checks
# ============================================
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "  🚀 GOLDEN RESET - Deep System Recovery" -ForegroundColor Cyan
Write-Host ("=" * 60) + "`n" -ForegroundColor Cyan

Write-Step "Pre-flight checks..."

# Check Node.js
if (-not (Test-CommandExists "node")) {
    Write-Error "Node.js not found. Please install Node.js first."
    exit 1
}
$nodeVersion = (node --version)
Write-Success "Node.js found: $nodeVersion"

# Check npm
if (-not (Test-CommandExists "npm")) {
    Write-Error "npm not found. Please install npm first."
    exit 1
}
$npmVersion = (npm --version)
Write-Success "npm found: v$npmVersion"

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found. Are you in the project root?"
    exit 1
}
Write-Success "Project root confirmed"

# ============================================
# STEP 1: Kill all Node.js processes
# ============================================
Write-Step "Terminating Node.js processes..."

try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Success "Killed $($nodeProcesses.Count) Node.js process(es)"
    } else {
        Write-Warning "No Node.js processes found"
    }
} catch {
    Write-Warning "Could not terminate some processes (may require admin rights)"
}

# Verify port is free
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Warning "Port $Port is still in use. Waiting..."
    Start-Sleep -Seconds 3
    $portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($portInUse) {
        Write-Error "Port $Port is still occupied. Please manually kill the process."
        exit 1
    }
}
Write-Success "Port $Port is free"

# ============================================
# STEP 2: Clear .next cache
# ============================================
Write-Step "Clearing Next.js build cache..."

if (Test-Path ".next") {
    try {
        Remove-Item -Path ".next" -Recurse -Force
        Write-Success ".next cache deleted"
    } catch {
        Write-Warning "Could not fully delete .next (some files may be locked)"
    }
} else {
    Write-Warning "No .next directory found"
}

# ============================================
# STEP 3: Clear node_modules/.cache
# ============================================
Write-Step "Clearing node_modules cache..."

$cachePaths = @(
    "node_modules/.cache",
    "node_modules/.vite",
    "node_modules/.turbo"
)

foreach ($cachePath in $cachePaths) {
    if (Test-Path $cachePath) {
        try {
            Remove-Item -Path $cachePath -Recurse -Force
            Write-Success "$cachePath deleted"
        } catch {
            Write-Warning "Could not delete $cachePath"
        }
    }
}

# ============================================
# STEP 4: Reinstall dependencies (optional)
# ============================================
if (-not $SkipInstall) {
    Write-Step "Reinstalling dependencies (clean install)..."
    
    # Remove node_modules if it exists and seems corrupted
    if (Test-Path "node_modules") {
        $random = Get-Random -Minimum 1000 -Maximum 9999
        $backupName = "node_modules_backup_$random"
        try {
            Rename-Item -Path "node_modules" -NewName $backupName
            Write-Success "node_modules renamed to $backupName"
            
            # Schedule cleanup of backup
            Start-Job -ScriptBlock {
                param($path)
                Start-Sleep -Seconds 30
                if (Test-Path $path) {
                    Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                }
            } -ArgumentList $backupName | Out-Null
        } catch {
            Write-Warning "Could not rename node_modules, attempting install anyway..."
        }
    }
    
    # Fresh install
    Write-Host "  Running npm install..." -ForegroundColor Gray
    try {
        $installOutput = npm install 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE"
        }
        Write-Success "Dependencies installed successfully"
    } catch {
        Write-Error "npm install failed: $_"
        Write-Host "`nAttempting recovery with --legacy-peer-deps..." -ForegroundColor Yellow
        npm install --legacy-peer-deps
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Recovery install also failed. Manual intervention required."
            exit 1
        }
        Write-Success "Recovery install succeeded"
    }
} else {
    Write-Warning "Skipping dependency reinstall (--SkipInstall specified)"
}

# ============================================
# STEP 5: Verify environment
# ============================================
Write-Step "Verifying environment..."

# Check for required env files
$envFiles = @(".env.local", ".env")
$envFound = $false
foreach ($envFile in $envFiles) {
    if (Test-Path $envFile) {
        Write-Success "Found $envFile"
        $envFound = $true
        break
    }
}
if (-not $envFound) {
    Write-Warning "No .env.local or .env found. Create from .env.example?"
}

# ============================================
# STEP 6: Start dev server
# ============================================
Write-Step "Starting development server..."

# Clear console for clean start
Clear-Host

Write-Host "`n" + ("=" * 60) -ForegroundColor Green
Write-Host "  ✅ GOLDEN RESET COMPLETE" -ForegroundColor Green
Write-Host ("=" * 60) + "`n" -ForegroundColor Green

$EndTime = Get-Date
$Duration = $EndTime - $StartTime
Write-Host "  Duration: $($Duration.Minutes)m $($Duration.Seconds)s" -ForegroundColor Gray
Write-Host "  Port: $Port" -ForegroundColor Gray
Write-Host "  Ready at: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "`n  Starting Next.js...`n" -ForegroundColor Gray

# Start the dev server
npm run dev
