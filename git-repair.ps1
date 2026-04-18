# ============================================
# 🚀 GIT AUTO-REPAIR ENGINE (PRO VERSION)
# ============================================

$logFile = "git-repair.log"
$maxRetries = 3

function Log($msg) {
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$time | $msg" | Tee-Object -FilePath $logFile -Append
}

function Kill-LockingProcesses {
    Log "[INFO] Detecting locking processes..."

    $processes = @("node","git","code","powershell")
    foreach ($p in $processes) {
        Get-Process -Name $p -ErrorAction SilentlyContinue | ForEach-Object {
            Log "[WARN] Killing process: $($_.Name) (PID: $($_.Id))"
            Stop-Process -Id $_.Id -Force
        }
    }
}

function Test-GitRepo {
    if (-not (Test-Path ".git")) {
        Log "[ERROR] Not a git repository"
        exit 1
    }
    Log "[OK] Git repository detected"
}

function Repair-Git {
    for ($i = 1; $i -le $maxRetries; $i++) {
        $msg = "[RETRY] Attempt " + $i + ": Running git gc..."
        Log $msg

        git gc --prune=now 2>&1 | Tee-Object -FilePath $logFile -Append

        if ($LASTEXITCODE -eq 0) {
            Log "[OK] Git cleanup successful"
            return $true
        }

        Log "[WARN] Cleanup failed, retrying..."
        Kill-LockingProcesses
        Start-Sleep -Seconds 2
    }

    return $false
}

function Nuclear-Fallback {
    Log "[FALLBACK] Entering fallback mode..."

    if (Test-Path ".git\objects\pack") {
        Get-ChildItem ".git\objects\pack" | ForEach-Object {
            try {
                Log "[CLEAN] Removing $($_.FullName)"
                Remove-Item $_.FullName -Force -ErrorAction Stop
            } catch {
                Log "[ERROR] Failed to remove $($_.FullName)"
            }
        }
    }

    git gc 2>&1 | Tee-Object -FilePath $logFile -Append
}

# ================= RUN =================

Clear-Host
Log "[START] Starting Git Auto-Repair Engine"

Test-GitRepo

$success = Repair-Git

if (-not $success) {
    Log "[WARN] Standard repair failed - using fallback"
    Nuclear-Fallback
}

Log "[DONE] Repair process completed"
Write-Host "`n[OK] DONE - Check git-repair.log for details"
