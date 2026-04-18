// ZeroLeak Multi-Agent System - Security Agent
// Handles secrets, auth, leaks

const { Agent } = require("./base");

class SecurityAgent extends Agent {
  constructor() {
    super("SECURITY");
  }

  analyze(events) {
    const leaks = events.filter(e => e.type === "SECRET_LEAK");
    const authFailures = events.filter(e => e.type === "AUTH_FAILURE");
    const suspiciousActivity = events.filter(e => e.type === "SUSPICIOUS_ACTIVITY");

    const leakScore = leaks.length * 3;
    const authScore = authFailures.length * 2;
    const suspiciousScore = suspiciousActivity.length * 1;

    const score = Math.min(10, leakScore + authScore + suspiciousScore);

    const actions = [];
    if (leaks.length > 0) actions.push("BLOCK_DEPLOY", "ROTATE_SECRET");
    if (authFailures.length > 5) actions.push("ALERT_SECURITY");
    if (suspiciousActivity.length > 10) actions.push("FREEZE_ACCOUNT");

    const issues = [];
    if (leaks.length > 0) issues.push(`${leaks.length} secret leak(s)`);
    if (authFailures.length > 0) issues.push(`${authFailures.length} auth failure(s)`);
    if (suspiciousActivity.length > 0) issues.push(`${suspiciousActivity.length} suspicious activity`());

    const confidence = (leaks.length > 0 || authFailures.length > 5) ? 0.9 : 0.3;

    return {
      agent: this.name,
      score,
      confidence,
      actions,
      reasoning: issues.length > 0 ? issues.join(", ") : "No security issues"
    };
  }

  getType() {
    return "SECURITY";
  }
}

module.exports = { SecurityAgent };
