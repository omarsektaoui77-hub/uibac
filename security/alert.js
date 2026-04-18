// Slack alert system for ZeroLeak Security Engine

const https = require("https");

/**
 * Send alert to Slack webhook
 * @param {string} message - The message to send
 * @param {string} webhookUrl - Slack webhook URL (from env or parameter)
 */
function sendAlert(message, webhookUrl) {
  const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  
  if (!url) {
    console.error("⚠️ SLACK_WEBHOOK_URL not set - skipping alert");
    return;
  }

  const data = JSON.stringify({ 
    text: message,
    username: "ZeroLeak Security",
    icon_emoji: ":shield:"
  });

  const req = https.request(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  }, (res) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log("✅ Slack alert sent successfully");
    } else {
      console.error(`❌ Slack alert failed: ${res.statusCode}`);
    }
  });

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

module.exports = {
  sendAlert,
  formatSecretAlert
};
