# =========================
# BacQuest Build Fix Script
# =========================

Write-Host "Starting cleanup..." -ForegroundColor Green

# 1. Go to project root (adjust if needed)
cd .

# 2. Backup problematic files instead of deleting
$backupDir = "backup_pages"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$files = @(
  "app\[locale]\page-optimized.tsx",
  "app\[locale]\page-hardened-final.tsx"
)

foreach ($file in $files) {
  if (Test-Path $file) {
    Move-Item $file $backupDir -Force
    Write-Host "Moved $file to $backupDir"
  }
}

# 3. Clean Next.js cache
if (Test-Path ".next") {
  Remove-Item -Recurse -Force ".next"
  Write-Host "Cleared .next cache"
}

# 4. Clean node_modules (optional but safe)
if (Test-Path "node_modules") {
  Remove-Item -Recurse -Force "node_modules"
  Write-Host "Removed node_modules"
}

# 5. Reinstall dependencies
Write-Host "Installing dependencies..."
npm install

# 6. Run build
Write-Host "Building project..."
npm run build

Write-Host "Done! If no errors you're clean"
