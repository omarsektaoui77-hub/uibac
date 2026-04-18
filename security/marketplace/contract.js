// ZeroLeak Agent Marketplace - Agent Contract
// Strict interface that all marketplace agents must follow

class MarketplaceAgent {
  constructor(name, version, author) {
    this.name = name;
    this.version = version;
    this.author = author;
  }

  /**
   * Analyze events and return decision
   * All marketplace agents MUST implement this method
   */
  analyze(events) {
    return {
      agent: this.name,
      version: this.version,
      score: 0,
      confidence: 0,
      actions: [],
      reasoning: ""
    };
  }

  /**
   * Get agent metadata
   */
  getMetadata() {
    return {
      name: this.name,
      version: this.version,
      author: this.author,
      type: "MARKETPLACE_AGENT"
    };
  }

  /**
   * Validate agent contract
   */
  validate() {
    if (!this.name) return false;
    if (!this.version) return false;
    if (typeof this.analyze !== "function") return false;
    return true;
  }
}

module.exports = { MarketplaceAgent };
