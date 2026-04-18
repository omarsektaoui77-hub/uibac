#!/usr/bin/env node

// ZeroLeak Security Engine - Autonomous Secret Scanner

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const patterns = require("./patterns");
const { findHighEntropyStrings } = require("./entropy");
const { sendAlert, formatSecretAlert } = require("./alert");

// Parse command line arguments
const args = process.argv.slice(2);
const AUTO_FIX = args.includes("--fix");
const SILENT = args.includes("--silent");
const STAGED_ONLY = args.includes("--staged");

// Directories to ignore
const IGNORE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".vercel",
  ".turbo",
  "venv",
  "env",
  ".venv",
  "bacquest-backend" // Python backend with venv
];

// Files to ignore
const IGNORE_FILES = [
  "package-lock.json",
  "yarn.lock",
  ".env.example",
  "replacements.txt",
  "tsconfig.tsbuildinfo",
  ".tsbuildinfo",
  ".env.local",
  ".env"
];

// File extensions to ignore (binary files, build artifacts, docs)
const IGNORE_EXTS = [
  ".tsbuildinfo",
  ".lock",
  ".map",
  ".dll",
  ".exe",
  ".bin",
  ".pem",
  ".key",
  ".crt",
  ".md" // Documentation files often contain examples
];

/**
 * Check if path should be ignored
 */
function shouldIgnore(filePath) {
  const parts = filePath.split(path.sep);
  
  for (const ignoreDir of IGNORE_DIRS) {
    if (parts.includes(ignoreDir)) return true;
  }
  
  const fileName = path.basename(filePath);
  if (IGNORE_FILES.includes(fileName)) return true;
  
  const ext = path.extname(filePath);
  if (IGNORE_EXTS.includes(ext)) return true;
  
  return false;
}

/**
 * Get files to scan
 */
function getFilesToScan() {
  let files = [];
  
  if (STAGED_ONLY) {
    try {
      const staged = execSync("git diff --name-only --cached", { encoding: "utf8" });
      files = staged.trim().split("\n").filter(f => f);
    } catch (e) {
      console.error("⚠️ No staged files found");
    }
  } else {
    const walk = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!shouldIgnore(fullPath)) {
            walk(fullPath);
          }
        } else if (stat.isFile()) {
          files.push(fullPath);
        }
      }
    };
    walk(".");
  }
  
  return files.filter(f => !shouldIgnore(f));
}

/**
 * Get staged content for a file (more secure than reading working directory)
 */
function getStagedContent(filePath) {
  try {
    const content = execSync(`git diff --cached -- "${filePath}"`, { encoding: "utf8" });
    return content;
  } catch (e) {
    return "";
  }
}

/**
 * Normalize content for scanning (join lines, remove whitespace tricks)
 */
function normalizeContent(content) {
  // Remove common whitespace tricks
  return content
    .replace(/\s+/g, ' ')  // Collapse whitespace
    .replace(/\\n/g, '')    // Remove escaped newlines
    .replace(/\\r/g, '')    // Remove escaped carriage returns
    .replace(/\\t/g, '');   // Remove escaped tabs
}

/**
 * Decode and rescan base64 strings
 */
function decodeAndRescan(base64String) {
  try {
    const decoded = Buffer.from(base64String, 'base64').toString('utf8');
    const allPatterns = patterns.allPatterns();
    const results = [];
    
    for (const pattern of allPatterns) {
      if (pattern === patterns.base64Secret) continue; // Skip base64 pattern itself
      const matches = decoded.match(pattern);
      if (matches) {
        results.push({
          type: `Base64 Decoded: ${patterns.getPatternName(pattern)}`,
          secret: decoded.substring(0, 50)
        });
      }
    }
    
    return results;
  } catch (e) {
    return [];
  }
}

/**
 * Scan a single file
 */
function scanFile(filePath) {
  const results = [];
  
  try {
    // Use staged content if in staged mode, otherwise read file
    let content;
    if (STAGED_ONLY) {
      content = getStagedContent(filePath);
      // If no staged diff, try reading the file directly
      if (!content) {
        content = fs.readFileSync(filePath, "utf8");
      }
    } else {
      content = fs.readFileSync(filePath, "utf8");
    }
    
    // Normalize content to catch line-splitting tricks
    const normalizedContent = normalizeContent(content);
    const allPatterns = patterns.allPatterns();
    
    for (const pattern of allPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        const lines = content.split("\n");
        matches.forEach(match => {
          const lineIndex = lines.findIndex(line => line.includes(match));
          results.push({
            type: patterns.getPatternName(pattern),
            file: filePath,
            line: lineIndex + 1,
            secret: match.substring(0, 50) + (match.length > 50 ? "..." : "")
          });
        });
      }
      
      // Also scan normalized content to catch line-splitting tricks
      const normalizedMatches = normalizedContent.match(pattern);
      if (normalizedMatches) {
        normalizedMatches.forEach(match => {
          // Only add if not already detected
          const alreadyDetected = results.some(r => r.secret.includes(match.substring(0, 20)));
          if (!alreadyDetected) {
            results.push({
              type: `${patterns.getPatternName(pattern)} (normalized)`,
              file: filePath,
              line: "N/A",
              secret: match.substring(0, 50) + (match.length > 50 ? "..." : "")
            });
          }
        });
      }
    }
    
    // Decode and rescan base64 strings
    const base64Matches = content.match(patterns.base64Secret);
    if (base64Matches) {
      base64Matches.forEach(b64 => {
        const decodedResults = decodeAndRescan(b64);
        results.push(...decodedResults);
      });
    }
    
  } catch (e) {
    // Try to scan even if file read fails (might be binary)
    // Don't skip binary files anymore - scan them as text
    try {
      const content = fs.readFileSync(filePath, "binary");
      const allPatterns = patterns.allPatterns();
      
      for (const pattern of allPatterns) {
        const matches = content.toString().match(pattern);
        if (matches) {
          results.push({
            type: `${patterns.getPatternName(pattern)} (binary)`,
            file: filePath,
            line: "N/A",
            secret: "Detected in binary file"
          });
        }
      }
    } catch (e2) {
      // Skip files that truly can't be read
    }
  }
  
  return results;
}

/**
 * Scan commit message for secrets
 */
function scanCommitMessage() {
  const results = [];
  
  try {
    const commitMsgFile = process.env.GIT_PARAMS || ".git/COMMIT_EDITMSG";
    let commitMsg;
    
    if (fs.existsSync(commitMsgFile)) {
      commitMsg = fs.readFileSync(commitMsgFile, "utf8");
    } else {
      // Try to get from git command
      try {
        commitMsg = execSync("git log -1 --pretty=%B", { encoding: "utf8" });
      } catch (e) {
        return [];
      }
    }
    
    const allPatterns = patterns.allPatterns();
    
    for (const pattern of allPatterns) {
      const matches = commitMsg.match(pattern);
      if (matches) {
        matches.forEach(match => {
          results.push({
            type: `${patterns.getPatternName(pattern)} (commit message)`,
            file: "COMMIT_MESSAGE",
            line: "N/A",
            secret: match.substring(0, 50) + (match.length > 50 ? "..." : "")
          });
        });
      }
    }
  } catch (e) {
    // Skip if can't read commit message
  }
  
  return results;
}

/**
 * Main scan function
 */
function scan() {
  if (!SILENT) {
    console.log("🔍 ZeroLeak Security Scanner");
    console.log("========================\n");
  }
  
  const files = getFilesToScan();
  
  if (!SILENT) {
    console.log(`📁 Scanning ${files.length} files...\n`);
  }
  
  const results = [];
  
  for (const file of files) {
    const fileResults = scanFile(file);
    results.push(...fileResults);
  }
  
  // Scan commit message
  const commitMsgResults = scanCommitMessage();
  results.push(...commitMsgResults);
  
  if (results.length > 0) {
    if (!SILENT) {
      console.error("🚨 SECRET LEAK DETECTED\n");
      console.error(`${results.length} secret(s) found:\n`);
      
      results.forEach(r => {
        console.error(`${r.type} → ${r.file}:${r.line}`);
        console.error(`  Secret: ${r.secret}\n`);
      });
    }
    
    // Send Slack alert if webhook is configured
    if (process.env.SLACK_WEBHOOK_URL) {
      sendAlert(formatSecretAlert(results));
    }
    
    // Generate auto-fix script if requested
    if (AUTO_FIX) {
      const fixScript = `# AUTO-GENERATED CLEANUP SCRIPT
# Generated by ZeroLeak Security Engine
# Review before running!

Write-Host "🔧 ZeroLeak Auto-Fix Script"
Write-Host "=============================\n"

Write-Host "⚠️  This script will:"
Write-Host "  1. Create replacements.txt with secret patterns"
Write-Host "  2. Run git-filter-repo to remove secrets from history"
Write-Host "  3. Force push to GitHub"
Write-Host ""
Write-Host "⚠️  BACKUP YOUR REPO BEFORE RUNNING THIS!"
Write-Host ""
$confirm = Read-Host "Continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "❌ Aborted"
    exit 1
}

Write-Host "\n📝 Creating replacements.txt..."
"regex:https://hooks\\.slack\\.com/services/[A-Za-z0-9/]+==>REMOVED" | Out-File -Encoding ASCII replacements.txt
"regex:sk-[a-zA-Z0-9]{48,}==>REMOVED" | Out-File -Encoding ASCII replacements.txt -Append
"regex:AIza[a-zA-Z0-9_-]{35}==>REMOVED" | Out-File -Encoding ASCII replacements.txt -Append
"regex:AKIA[0-9A-Z]{16}==>REMOVED" | Out-File -Encoding ASCII replacements.txt -Append
"regex:ghp_[a-zA-Z0-9]{36}==>REMOVED" | Out-File -Encoding ASCII replacements.txt -Append

Write-Host "🔧 Running git-filter-repo..."
C:\\Users\\DELL\\AppData\\Roaming\\Python\\Python314\\Scripts\\git-filter-repo.exe --replace-text replacements.txt --force

Write-Host "🔧 Restoring remote..."
git remote remove origin 2>$null
git remote add origin https://github.com/omarsektaoui77-hub/uibac.git

Write-Host "📤 Force pushing cleaned history..."
git push --force origin HEAD

Write-Host "✅ Done - Please rotate any exposed credentials!"
`;
      fs.writeFileSync("auto-fix.ps1", fixScript);
      if (!SILENT) {
        console.log("🛠️ Fix script generated: auto-fix.ps1");
        console.log("👉 Review and run: powershell -ExecutionPolicy Bypass -File auto-fix.ps1\n");
      }
    } else if (!SILENT) {
      console.log("👉 Run with --fix to generate cleanup script");
      console.log("   node security/scan-secrets.js --fix\n");
    }
    
    process.exit(1);
  }
  
  if (!SILENT) {
    console.log("✅ No secrets detected");
  }
  
  process.exit(0);
}

// Run scan
scan();
