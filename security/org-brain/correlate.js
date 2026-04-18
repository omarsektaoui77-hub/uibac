// ZeroLeak Org Brain - Cross-Repo Correlation
// Correlates incidents across repositories and environments

/**
 * Correlate events at organization level
 * Detects multi-repo failures and systemic issues
 */
function correlateOrg(events) {
  const incidents = [];
  
  const grouped = {};
  
  // Group events by type:env
  for (const e of events) {
    const key = `${e.type}:${e.env}`;
    grouped[key] = grouped[key] || [];
    grouped[key].push(e);
  }
  
  // Create incidents from groups
  for (const key in grouped) {
    const group = grouped[key];
    
    // Create incident if 5+ events across repos
    if (group.length >= 5) {
      const uniqueRepos = new Set(group.map(e => e.repo));
      
      if (uniqueRepos.size >= 2) {
        incidents.push({
          id: "ORG-" + Date.now(),
          type: key,
          repos: Array.from(uniqueRepos),
          severity: computeOrgSeverity(group, uniqueRepos.size),
          events: group,
          count: group.length,
          time: new Date().toISOString()
        });
      }
    }
  }
  
  return incidents;
}

/**
 * Compute organization-level severity
 */
function computeOrgSeverity(group, repoCount) {
  const eventCount = group.length;
  
  // Critical if 10+ events across 3+ repos
  if (eventCount >= 10 && repoCount >= 3) {
    return "CRITICAL";
  }
  
  // High if 5+ events across 2+ repos
  if (eventCount >= 5 && repoCount >= 2) {
    return "HIGH";
  }
  
  // Medium if 3+ events
  if (eventCount >= 3) {
    return "MEDIUM";
  }
  
  return "LOW";
}

/**
 * Detect systemic issues across organization
 */
function detectSystemicIssues(events) {
  const issues = [];
  
  // Group by type only (across all envs)
  const byType = {};
  for (const e of events) {
    byType[e.type] = byType[e.type] || [];
    byType[e.type].push(e);
  }
  
  // Detect issues affecting 3+ repos
  for (const type in byType) {
    const group = byType[type];
    const uniqueRepos = new Set(group.map(e => e.repo));
    
    if (uniqueRepos.size >= 3) {
      issues.push({
        type,
        severity: "HIGH",
        repos: Array.from(uniqueRepos),
        description: `Systemic ${type} detected across ${uniqueRepos.size} repositories`
      });
    }
  }
  
  return issues;
}

/**
 * Get organization-wide incident summary
 */
function getOrgSummary(incidents) {
  return {
    total: incidents.length,
    bySeverity: incidents.reduce((acc, inc) => {
      acc[inc.severity] = (acc[inc.severity] || 0) + 1;
      return acc;
    }, {}),
    affectedRepos: [...new Set(incidents.flatMap(inc => inc.repos))],
    totalEvents: incidents.reduce((sum, inc) => sum + inc.count, 0)
  };
}

module.exports = {
  correlateOrg,
  computeOrgSeverity,
  detectSystemicIssues,
  getOrgSummary
};
