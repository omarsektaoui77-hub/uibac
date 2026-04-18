// ZeroLeak Multi-Agent System - Agent Base Class
// Standard contract for all agents

class Agent {
  constructor(name) {
    this.name = name;
  }

  /**
   * Analyze events and return decision
   * All agents must implement this method
   */
  analyze(events) {
    return {
      agent: this.name,
      score: 0,
      confidence: 0,
      actions: [],
      reasoning: ""
    };
  }

  /**
   * Get agent description
   */
  getDescription() {
    return this.name;
  }

  /**
   * Get agent type
   */
  getType() {
    return "BASE";
  }
}

module.exports = { Agent };
