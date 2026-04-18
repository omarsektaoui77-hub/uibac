// ZeroLeak Multi-Agent System - Reliability Agent
// Handles uptime, errors, failures

const { Agent } = require("./base");

class ReliabilityAgent extends Agent {
  constructor() {
    super("RELIABILITY");
  }

  analyze(events) {
    const errors = events.filter(e => e.type === "ERROR");
    const failures = events.filter(e => e.type === "FAILURE");
    const outages = events.filter(e => e.type === "OUTAGE");

    const errorScore = errors.length * 2;
    const failureScore = failures.length * 3;
    const outageScore = outages.length * 5;

    const score = Math.min(10, errorScore + failureScore + outageScore);

    const actions = [];
    if (errors.length > 10) actions.push("ROLLBACK");
    if (failures.length > 5) actions.push("ALERT_OPS");
    if (outages.length > 0) actions.push("EMERGENCY_RESTORE");

    const issues = [];
    if (errors.length > 0) issues.push(`${errors.length} error(s)`);
    if (failures.length > 0) issues.push(`${failures.length} failure(s)`);
    if (outages.length > 0) issues.push(`${outages.length} outage(s)`);

    const confidence = (errors.length > 10 || failures.length > 5) ? 0.8 : 0.4;

    return {
      agent: this.name,
      score,
      confidence,
      actions,
      reasoning: issues.length > 0 ? issues.join(", ") : "No reliability issues"
    };
  }

  getType() {
    return "RELIABILITY";
  }
}

module.exports = { ReliabilityAgent };
