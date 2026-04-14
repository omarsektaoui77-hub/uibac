# Emergency Recovery System for BacQuest
# Provides git-based resets and surgical PowerShell fixes for corrupted files

param(
    [string]$Action,
    [string]$FilePath
)

switch ($Action) {
    "reset-file" {
        if (-not $FilePath) {
            Write-Host "Error: FilePath parameter required for reset-file action" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Resetting file: $FilePath" -ForegroundColor Yellow
        git checkout HEAD -- $FilePath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "File reset successfully" -ForegroundColor Green
        } else {
            Write-Host "Failed to reset file" -ForegroundColor Red
            exit 1
        }
    }
    
    "reset-all" {
        Write-Host "Resetting all files to HEAD" -ForegroundColor Yellow
        git checkout HEAD -- .
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "All files reset successfully" -ForegroundColor Green
        } else {
            Write-Host "Failed to reset files" -ForegroundColor Red
            exit 1
        }
    }
    
    "status" {
        Write-Host "Git Status:" -ForegroundColor Cyan
        git status
    }
    
    "diff" {
        if (-not $FilePath) {
            Write-Host "Git Diff (all files):" -ForegroundColor Cyan
            git diff
        } else {
            Write-Host "Git Diff for: $FilePath" -ForegroundColor Cyan
            git diff $FilePath
        }
    }
    
    default {
        Write-Host "Usage: .\emergency-recovery.ps1 -Action <action> [-FilePath <path>]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Actions:" -ForegroundColor Cyan
        Write-Host "  reset-file    Reset a specific file to HEAD (requires FilePath)"
        Write-Host "  reset-all     Reset all files to HEAD"
        Write-Host "  status        Show git status"
        Write-Host "  diff          Show git diff (optionally for specific file)"
        exit 1
    }
}
