// Slack alert system for ZeroLeak Security Engine

const https = require("https");
const fs = require("fs");
const path = require("path");

const webhook = process.env.SLACK_WEBHOOK_URL;

/**
 * Send alert to Slack
 */
function sendAlert(message) {
  if (!webhook) {
    console.warn("[SECURITY] SLACK_WEBHOOK_URL not configured - skipping alert");
    return;
  }

  const data = JSON.stringify({ text: message });

  const req = https.request(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  req.on("error", (error) => {
    console.error(`❌ Slack alert error: ${error.message}`);
  });

  req.write(data);
  req.end();
}

/**
 * Format secret detection alert
 * @param {Array} results - Array of detected secrets
 * @returns {string} - Formatted alert message
 */
function formatSecretAlert(results) {
  const count = results.length;
  const locations = results.map(r => `${r.type} → ${r.file}:${r.line}`).join("\n");
  
  return `🚨 SECRET LEAK DETECTED

${count} secret(s) found in repository:

${locations}

👉 Please review and rotate any exposed credentials immediately.

Repository: ${process.cwd()}
Branch: ${process.env.GITHUB_REF || "local"}
Actor: ${process.env.GITHUB_ACTOR || "developer"}`;
}

/**
 * Send brain analysis alert
 * @param {Object} analysis - Brain analysis result
 */
function sendBrainAlert(analysis) {
  const { level, risk, signals } = analysis;
  
  if (level === "CRITICAL" || (level === "HIGH" && risk > 8)) {
    const message = `🧠 SECURITY BRAIN ALERT

Risk Level: ${level}
Risk Score: ${risk}

Signals:
- Files changed: ${signals.fileCount}
- Lines changed: ${signals.lineCount}
- Uses env: ${signals.usesEnv ? "YES" : "NO"}
- Adds fetch: ${signals.addsFetch ? "YES" : "NO"}
- Adds axios: ${signals.addsAxios ? "YES" : "NO"}
- Touches security: ${signals.touchesSecurity ? "YES" : "NO"}
- Touches CI: ${signals.touchesCI ? "YES" : "NO"}
- Direct env: ${signals.addsProcessEnvDirect ? "YES" : "NO"}
- Env concatenation: ${signals.addsEnvConcatenation ? "YES" : "NO"}

⚠️ Requires immediate review

Repository: ${process.cwd()}
Branch: ${process.env.GITHUB_REF || "local"}
Actor: ${process.env.GITHUB_ACTOR || "developer"}`;
    
    sendAlert(message);
  }
}

/**
 * Send secret detection alert
 * @param {Array} results - Array of detected secrets
 */
function sendSecretAlert(results) {
  const message = formatSecretAlert(results);
  sendAlert(message);
}

module.exports = {
  sendAlert,
  formatSecretAlert,
  sendBrainAlert,
  sendSecretAlert
};
