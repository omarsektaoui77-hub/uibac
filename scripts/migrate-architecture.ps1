# Architecture Migration Script for Windows PowerShell
# Creates clean structure: app/ (UI), core/ (business logic), infra/ (systems)

Write-Host "Starting architecture migration..." -ForegroundColor Green

# -------------------------
# 1. Create new structure
# -------------------------
Write-Host "Creating new folders..." -ForegroundColor Cyan

$coreFolders = @("ai", "learning", "gamification", "analytics", "auth", "sre")
$infraFolders = @("db", "cache", "logging", "monitoring", "config", "telemetry", "resilience", "jobs")

foreach ($folder in $coreFolders) {
    New-Item -ItemType Directory -Path "core\$folder" -Force | Out-Null
}

foreach ($folder in $infraFolders) {
    New-Item -ItemType Directory -Path "infra\$folder" -Force | Out-Null
}

New-Item -ItemType Directory -Path "app/api/v1" -Force | Out-Null

# -------------------------
# 2. Move LIB → CORE
# -------------------------
Write-Host "Moving business logic to core..." -ForegroundColor Cyan

if (Test-Path "lib/ai") { Move-Item -Path "lib/ai" -Destination "core/ai" -Force }
if (Test-Path "lib/adaptive") { Move-Item -Path "lib/adaptive" -Destination "core/learning" -Force }
if (Test-Path "lib/gamification") { Move-Item -Path "lib/gamification" -Destination "core/gamification" -Force }
if (Test-Path "lib/analytics") { Move-Item -Path "lib/analytics" -Destination "core/analytics" -Force }
if (Test-Path "lib/auth") { Move-Item -Path "lib/auth" -Destination "core/auth" -Force }
if (Test-Path "lib/events") { Move-Item -Path "lib/events" -Destination "core/events" -Force }

# -------------------------
# 3. Move LIB → INFRA
# -------------------------
Write-Host "Moving infra logic..." -ForegroundColor Cyan

if (Test-Path "lib/cache") { Move-Item -Path "lib/cache" -Destination "infra/cache" -Force }
if (Test-Path "lib/database") { Move-Item -Path "lib/database" -Destination "infra/db" -Force }
if (Test-Path "lib/logging") { Move-Item -Path "lib/logging" -Destination "infra/logging" -Force }
if (Test-Path "lib/monitoring") { Move-Item -Path "lib/monitoring" -Destination "infra/monitoring" -Force }
if (Test-Path "lib/telemetry") { Move-Item -Path "lib/telemetry" -Destination "infra/telemetry" -Force }
if (Test-Path "lib/config") { Move-Item -Path "lib/config" -Destination "infra/config" -Force }
if (Test-Path "lib/jobs") { Move-Item -Path "lib/jobs" -Destination "infra/jobs" -Force }

# -------------------------
# 4. Clean dangerous duplicates
# -------------------------
Write-Host "Cleaning duplicate pages..." -ForegroundColor Cyan

Get-ChildItem -Path "app" -Filter "page-*.tsx" -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force

# -------------------------
# 5. Create experiments folder
# -------------------------
New-Item -ItemType Directory -Path "app/__experiments__" -Force | Out-Null

# -------------------------
# 6. Version API
# -------------------------
Write-Host "Versioning API..." -ForegroundColor Cyan

$apiDirs = Get-ChildItem -Path "app/api" -Directory -ErrorAction SilentlyContinue
foreach ($dir in $apiDirs) {
    if ($dir.Name -ne "v1") {
        $targetDir = "app/api/v1/$($dir.Name)"
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        Move-Item -Path "$($dir.FullName)\*" -Destination $targetDir -Force -ErrorAction SilentlyContinue
    }
}

# -------------------------
# 7. Create resilience layer
# -------------------------
Write-Host "Adding resilience layer..." -ForegroundColor Cyan

$retryPolicy = @"
export async function retry(fn: () => Promise<any>, retries: number = 3): Promise<any> {
  try {
    return await fn();
  } catch (e) {
    if (retries <= 0) throw e;
    return retry(fn, retries - 1);
  }
}
"@

Set-Content -Path "infra/resilience/retryPolicy.ts" -Value $retryPolicy

$circuitBreaker = @"
let failures = 0;

export function circuitBreaker<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: any[]) => {
    if (failures > 5) throw new Error("Circuit open");
    try {
      const res = await fn(...args);
      failures = 0;
      return res;
    } catch (e) {
      failures++;
      throw e;
    }
  }) as T;
}
"@

Set-Content -Path "infra/resilience/circuitBreaker.ts" -Value $circuitBreaker

# -------------------------
# 8. Create system folder
# -------------------------
Write-Host "🧾 Creating system tracking..." -ForegroundColor Cyan

New-Item -ItemType Directory -Path "00_system/logs" -Force | Out-Null
New-Item -ItemType Directory -Path "00_system/snapshots" -Force | Out-Null

$manifest = @{
    version = "1.0"
    lastMigration = (Get-Date -Format "o")
} | ConvertTo-Json

Set-Content -Path "00_system/manifest.json" -Value $manifest

# -------------------------
# 9. Fix imports (basic)
# -------------------------
Write-Host "Updating import paths..." -ForegroundColor Cyan

Get-ChildItem -Path "." -Include "*.ts", "*.tsx", "*.js", "*.jsx" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content -Path $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content) {
        $content = $content -replace '@/lib', '@/core'
        Set-Content -Path $_.FullName -Value $content -NoNewline
    }
}

# -------------------------
# 10. Done
# -------------------------
Write-Host "Migration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. npm install"
Write-Host "2. npm run build"
Write-Host "3. Fix any broken imports manually"
Write-Host "4. Test app locally"
