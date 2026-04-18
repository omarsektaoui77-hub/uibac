// ZeroLeak AppSec Scanner - Behavior-based detection
// Detects suspicious patterns that indicate attacks, not just secrets

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Domain allowlist for outbound requests
const ALLOWED_DOMAINS = [
  "api.openai.com",
  "api.groq.com",
  "api.anthropic.com",
  "slack.com",
  "hooks.slack.com",
  "firebaseio.com",
  "firebaseapp.com",
  "firebasestorage.app",
  "github.com",
  "api.github.com",
  "vercel.com",
  "vercel.app",
  "localhost",
  "127.0.0.1"
];

// Suspicious patterns for behavior detection
const APPSEC_PATTERNS = {
  // Exfiltration attempts
  exfiltration: {
    pattern: /(fetch|axios|http\.request|https\.request)\s*\(\s*['"]https?:\/\/[^'"]*['"]\s*\+\s*process\.env/gi,
    severity: "CRITICAL",
    description: "Outbound request with environment variable (potential exfiltration)"
  },
  
  // String concatenation with env vars (fragmentation attack)
  fragmentation: {
    pattern: /['"](https?:\/\/[^'"]+)['"]\s*\+\s*(process\.env|process\.getenv)/gi,
    severity: "HIGH",
    description: "URL concatenation with environment variable (secret fragmentation)"
  },
  
  // Unknown domain usage
  unknownDomain: {
    pattern: /(fetch|axios|http\.request|https\.request)\s*\(\s*['"]https?:\/\/([^'"]+)['"]/gi,
    severity: "MEDIUM",
    description: "Outbound request to potentially unknown domain"
  },
  
  // Direct env var usage in sensitive contexts (only flag actual secrets, not base URLs)
  envInSensitive: {
    pattern: /(fetch|axios|http\.request)\s*\([^)]*process\.env\.(SLACK_WEBHOOK|API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)/gi,
    severity: "MEDIUM",
    description: "Environment variable with secret name used in network request (potential exfiltration)"
  }
};

/**
 * Check if domain is in allowlist
 */
function isAllowedDomain(domain) {
  return ALLOWED_DOMAINS.some(allowed => domain.includes(allowed));
}

/**
 * Scan a single file for AppSec patterns
 */
function scanFile(filePath) {
  const results = [];
  
  try {
    const content = fs.readFileSync(filePath, "utf8");
    
    for (const [patternName, config] of Object.entries(APPSEC_PATTERNS)) {
      const matches = content.match(config.pattern);
      if (matches) {
        const lines = content.split("\n");
        matches.forEach(match => {
          const lineIndex = lines.findIndex(line => line.includes(match));
          
          // Special handling for unknown domain pattern
          if (patternName === "unknownDomain") {
            const domainMatch = match.match(/https?:\/\/([^'"]+)/);
            if (domainMatch) {
              const domain = domainMatch[1];
              if (!isAllowedDomain(domain)) {
                results.push({
                  type: patternName,
                  severity: config.severity,
                  file: filePath,
                  line: lineIndex + 1,
                  secret: `${config.description}: ${domain}`,
                  pattern: match.substring(0, 50) + (match.length > 50 ? "..." : "")
                });
              }
            }
          } else {
            results.push({
              type: patternName,
              severity: config.severity,
              file: filePath,
              line: lineIndex + 1,
              secret: config.description,
              pattern: match.substring(0, 50) + (match.length > 50 ? "..." : "")
            });
          }
        });
      }
    }
  } catch (e) {
    // Skip files that can't be read
  }
  
  return results;
}

/**
 * Get files to scan
 */
function getFilesToScan() {
  let files = [];
  
  const walk = (dir) => {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules, .git, etc.
          if (![".git", "node_modules", ".next", "dist", "build"].includes(item)) {
            walk(fullPath);
          }
        } else if (stat.isFile()) {
          // Only scan code files
          const ext = path.extname(fullPath);
          if ([".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (e) {
      // Skip directories that can't be read
    }
  };
  
  walk(".");
  return files;
}

/**
 * Main scan function
 */
function scan() {
  const args = process.argv.slice(2);
  const SILENT = args.includes("--silent");
  
  if (!SILENT) {
    console.log("🔍 ZeroLeak AppSec Scanner");
    console.log("===========================\n");
  }
  
  const files = getFilesToScan();
  
  if (!SILENT) {
    console.log(`📁 Scanning ${files.length} code files...\n`);
  }
  
  const results = [];
  
  for (const file of files) {
    const fileResults = scanFile(file);
    results.push(...fileResults);
  }
  
  if (results.length > 0) {
    if (!SILENT) {
      console.error("🚨 APPSEC ISSUE DETECTED\n");
      console.error(`${results.length} issue(s) found:\n`);
      
      results.forEach(r => {
        console.error(`[${r.severity}] ${r.type} → ${r.file}:${r.line}`);
        console.error(`  ${r.secret}`);
        console.error(`  Pattern: ${r.pattern}\n`);
      });
    }
    
    process.exit(1);
  }
  
  if (!SILENT) {
    console.log("✅ No AppSec issues detected");
  }
  
  process.exit(0);
}

// Run scan if called directly
if (require.main === module) {
  scan();
}

module.exports = { scan, ALLOWED_DOMAINS };
