// ZeroLeak Agent Marketplace - Agent Registry
// Manages registration and listing of marketplace agents

const agents = [];

/**
 * Register a new agent in the marketplace
 */
function register(agent) {
  if (!agent.validate()) {
    throw new Error(`Agent ${agent.name} failed validation`);
  }

  const existing = agents.find(a => a.name === agent.name);
  if (existing) {
    throw new Error(`Agent ${agent.name} already registered`);
  }

  agents.push(agent);
  console.log(`✅ Registered agent: ${agent.name} v${agent.version}`);
}

/**
 * List all registered agents
 */
function listAgents() {
  return agents;
}

/**
 * Get agent by name
 */
function getAgent(name) {
  return agents.find(a => a.name === name);
}

/**
 * Unregister an agent
 */
function unregister(name) {
  const index = agents.findIndex(a => a.name === name);
  if (index === -1) {
    throw new Error(`Agent ${name} not found`);
  }

  agents.splice(index, 1);
  console.log(`🗑️ Unregistered agent: ${name}`);
}

/**
 * Get registry statistics
 */
function getRegistryStats() {
  return {
    totalAgents: agents.length,
    agents: agents.map(a => ({
      name: a.name,
      version: a.version,
      author: a.author
    }))
  };
}

module.exports = {
  register,
  listAgents,
  getAgent,
  unregister,
  getRegistryStats
};
