// ZeroLeak Agent Marketplace - Sandbox Execution
// CRITICAL: No agent touches production directly

/**
 * Run agent in sandbox with safety checks
 */
async function runInSandbox(agent, events, options = {}) {
  const { timeout = 5000 } = options;

  try {
    // Timeout protection
    const result = await Promise.race([
      agent.analyze(events),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Agent execution timeout")), timeout)
      )
    ]);

    // Validate result structure
    if (!result || typeof result !== "object") {
      throw new Error("Invalid agent result structure");
    }

    if (!result.agent) {
      throw new Error("Agent result missing agent name");
    }

    return {
      ...result,
      safe: true,
      sandboxed: true
    };
  } catch (e) {
    return {
      agent: agent.name,
      safe: false,
      sandboxed: true,
      error: e.message,
      errorType: e.constructor.name
    };
  }
}

/**
 * Run multiple agents in parallel sandbox
 */
async function runParallelInSandbox(agents, events, options = {}) {
  const { concurrency = 5 } = options;

  const results = [];

  for (let i = 0; i < agents.length; i += concurrency) {
    const batch = agents.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(agent => runInSandbox(agent, events, options))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Validate sandbox result
 */
function validateSandboxResult(result) {
  return result.safe && result.sandboxed;
}

module.exports = {
  runInSandbox,
  runParallelInSandbox,
  validateSandboxResult
};
