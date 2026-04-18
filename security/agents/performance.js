// ZeroLeak Multi-Agent System - Performance Agent
// Handles latency, load

const { Agent } = require("./base");

class PerformanceAgent extends Agent {
  constructor() {
    super("PERFORMANCE");
  }

  analyze(events) {
    const highLatency = events.filter(e => e.type === "HIGH_LATENCY");
    const highLoad = events.filter(e => e.type === "HIGH_LOAD");
    const slowQueries = events.filter(e => e.type === "SLOW_QUERY");

    const latencyScore = highLatency.length * 1;
    const loadScore = highLoad.length * 2;
    const queryScore = slowQueries.length * 1;

    const score = Math.min(10, latencyScore + loadScore + queryScore);

    const actions = [];
    if (highLatency.length > 20) actions.push("SCALE_UP");
    if (highLoad.length > 10) actions.push("THROTTLE_TRAFFIC");
    if (slowQueries.length > 15) actions.push("OPTIMIZE_QUERIES");

    const issues = [];
    if (highLatency.length > 0) issues.push(`${highLatency.length} high latency event(s)`);
    if (highLoad.length > 0) issues.push(`${highLoad.length} high load event(s)`);
    if (slowQueries.length > 0) issues.push(`${slowQueries.length} slow query event(s)`);

    const confidence = (highLoad.length > 10) ? 0.7 : 0.3;

    return {
      agent: this.name,
      score,
      confidence,
      actions,
      reasoning: issues.length > 0 ? issues.join(", ") : "No performance issues"
    };
  }

  getType() {
    return "PERFORMANCE";
  }
}

module.exports = { PerformanceAgent };
