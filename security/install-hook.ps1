# ZeroLeak Security Engine - Hook Installer for Windows
# This script installs the pre-commit hook

Write-Host "[INFO] ZeroLeak Security - Hook Installer"
Write-Host "========================================`n"

$scriptPath = "security\pre-commit"
$hooksPath = ".git\hooks\pre-commit"

# Check if .git directory exists
if (-not (Test-Path ".git")) {
  Write-Host "[ERROR] Not a git repository"
  exit 1
}

# Check if pre-commit script exists
if (-not (Test-Path $scriptPath)) {
  Write-Host "[ERROR] Pre-commit script not found: $scriptPath"
  exit 1
}

# Copy the pre-commit script to .git/hooks
Write-Host "[INFO] Copying pre-commit hook..."
Copy-Item $scriptPath $hooksPath -Force

# Make it executable (on Windows, this just ensures it's not read-only)
Write-Host "[INFO] Setting permissions..."
$attribs = Get-Item $hooksPath -Force
$attribs.Attributes = $attribs.Attributes -bor [System.IO.FileAttributes]::Normal

Write-Host "[OK] Pre-commit hook installed successfully"
Write-Host ""
Write-Host "[INFO] Hook location: $hooksPath"
Write-Host ""
Write-Host "[INFO] The hook will now scan all commits for secrets"
Write-Host "[WARN] Commits with secrets will be automatically blocked"
Write-Host ""
Write-Host "To uninstall: Remove .git\hooks\pre-commit"
