// ZeroLeak Self-Healing Mode - Auto-Sanitization
// Safe rewrite only - replaces known patterns with placeholders

const fs = require("fs");
const { log } = require("./audit-log");

/**
 * Sanitize a file by replacing known secret patterns
 */
function sanitizeFile(file) {
  try {
    if (!fs.existsSync(file)) {
      console.warn(`⚠️ File not found: ${file}`);
      return false;
    }
    
    let content = fs.readFileSync(file, "utf8");
    let sanitized = false;
    let originalLength = content.length;
    
    // Remove Slack webhooks
    const slackCount = (content.match(/https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/g) || []).length;
    if (slackCount > 0) {
      content = content.replace(
        /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/g,
        "REMOVED_SLACK_WEBHOOK"
      );
      sanitized = true;
    }
    
    // Remove OpenAI API keys
    const openaiCount = (content.match(/sk-[A-Za-z0-9]{48}/g) || []).length;
    if (openaiCount > 0) {
      content = content.replace(
        /sk-[A-Za-z0-9]{48}/g,
        "REMOVED_OPENAI_KEY"
      );
      sanitized = true;
    }
    
    // Remove Firebase API keys
    const firebaseCount = (content.match(/AIza[A-Za-z0-9_-]{35}/g) || []).length;
    if (firebaseCount > 0) {
      content = content.replace(
        /AIza[A-Za-z0-9_-]{35}/g,
        "REMOVED_FIREBASE_KEY"
      );
      sanitized = true;
    }
    
    // Remove GitHub tokens
    const githubCount = (content.match(/ghp_[A-Za-z0-9]{36}/g) || []).length;
    if (githubCount > 0) {
      content = content.replace(
        /ghp_[A-Za-z0-9]{36}/g,
        "REMOVED_GITHUB_TOKEN"
      );
      sanitized = true;
    }
    
    // Remove generic API keys
    const genericCount = (content.match(/[A-Za-z0-9]{32,}/g) || []).length;
    if (genericCount > 0) {
      // Only replace very long strings that look like keys
      content = content.replace(
        /[A-Za-z0-9]{40,}/g,
        "REMOVED_SECRET"
      );
      sanitized = true;
    }
    
    if (sanitized) {
      fs.writeFileSync(file, content);
      console.log(`🧹 Sanitized: ${file}`);
      console.log(`   - Slack webhooks: ${slackCount}`);
      console.log(`   - OpenAI keys: ${openaiCount}`);
      console.log(`   - Firebase keys: ${firebaseCount}`);
      console.log(`   - GitHub tokens: ${githubCount}`);
      console.log(`   - Generic secrets: ${genericCount}`);
      
      log("SELF_HEAL_SANITIZE", {
        file,
        slackCount,
        openaiCount,
        firebaseCount,
        githubCount,
        genericCount,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } else {
      console.log(`✅ No secrets found in: ${file}`);
      return false;
    }
  } catch (e) {
    console.error(`❌ Failed to sanitize ${file}:`, e.message);
    log("SELF_HEAL_ERROR", {
      file,
      error: e.message,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

/**
 * Contain the threat - block and isolate
 */
function contain() {
  console.log("🔒 Containment: blocking commit & isolating change");
  log("SELF_HEAL_CONTAIN", {
    timestamp: new Date().toISOString()
  });
  process.exit(1);
}

/**
 * Require secret rotation (mandatory human action)
 */
function requireRotation(secretName) {
  console.error(`🚨 ROTATE SECRET NOW: ${secretName}`);
  console.error(`👉 This is a mandatory human action - cannot be automated`);
  log("SELF_HEAL_REQUIRE_ROTATION", {
    secretName,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  sanitizeFile,
  contain,
  requireRotation
};
