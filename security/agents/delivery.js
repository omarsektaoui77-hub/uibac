// ZeroLeak Multi-Agent System - Delivery Agent
// Handles deploy risk

const { Agent } = require("./base");

class DeliveryAgent extends Agent {
  constructor() {
    super("DELIVERY");
  }

  analyze(events) {
    const deployFailures = events.filter(e => e.type === "DEPLOY_FAILURE");
    const rollbackEvents = events.filter(e => e.type === "ROLLBACK");
    const configChanges = events.filter(e => e.type === "CONFIG_CHANGE");

    const deployScore = deployFailures.length * 2;
    const rollbackScore = rollbackEvents.length * 3;
    const configScore = configChanges.length * 1;

    const score = Math.min(10, deployScore + rollbackScore + configScore);

    const actions = [];
    if (deployFailures.length > 3) actions.push("PAUSE_DEPLOYS");
    if (rollbackEvents.length > 2) actions.push("REQUIRE_APPROVAL");
    if (configChanges.length > 10) actions.push("REVIEW_CONFIG");

    const issues = [];
    if (deployFailures.length > 0) issues.push(`${deployFailures.length} deploy failure(s)`);
    if (rollbackEvents.length > 0) issues.push(`${rollbackEvents.length} rollback(s)`);
    if (configChanges.length > 0) issues.push(`${configChanges.length} config change(s)`);

    const confidence = (deployFailures.length > 3 || rollbackEvents.length > 2) ? 0.8 : 0.4;

    return {
      agent: this.name,
      score,
      confidence,
      actions,
      reasoning: issues.length > 0 ? issues.join(", ") : "No delivery issues"
    };
  }

  getType() {
    return "DELIVERY";
  }
}

module.exports = { DeliveryAgent };
