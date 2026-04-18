# ================================
# 🔥 FULL AUTO SECRET CLEANER
# ================================

$repoPath = "C:\Users\DELL\uibac"
$filterRepo = "C:\Users\DELL\AppData\Roaming\Python\Python314\Scripts\git-filter-repo.exe"
$remoteUrl = "https://github.com/omarsektaoui77-hub/uibac.git"
$branch = "feat/cognitive-sre-system"

Write-Host "👉 Moving to repo..."
cd $repoPath

Write-Host "👉 Ensuring clean state..."
git rebase --abort 2>$null

Write-Host "👉 Creating replacements.txt..."
@"
regex:https://hooks\.slack\.com/services/[A-Za-z0-9/]+==>REMOVED
"@ | Out-File -Encoding ASCII replacements.txt

Write-Host "👉 Running git-filter-repo (this rewrites history)..."
& $filterRepo --replace-text replacements.txt --force

Write-Host "👉 Verifying cleanup..."
$logCheck = git log -S "hooks.slack.com" --all
$grepCheck = git grep -I "hooks.slack.com" $(git rev-list --all) 2>$null

if ($logCheck -or $grepCheck) {
    Write-Host "❌ Secret STILL FOUND. Stopping."
    exit 1
}

Write-Host "✅ No secrets found in history."

Write-Host "👉 Restoring remote..."
git remote remove origin 2>$null
git remote add origin $remoteUrl

Write-Host "👉 Force pushing clean history..."
git push --force origin $branch

Write-Host "🎉 DONE: Repo cleaned and pushed successfully."
