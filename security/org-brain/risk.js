// ZeroLeak Org Brain - Risk Engine
// Computes organization-level risk scores

/**
 * Compute organization-level risk for an incident
 */
function computeOrgRisk(incident) {
  const repoCount = incident.repos.length;
  const eventCount = incident.events.length;
  
  let risk = 5;
  
  // More repos affected = higher risk
  if (repoCount >= 3) risk += 3;
  else if (repoCount >= 2) risk += 2;
  
  // More events = higher risk
  if (eventCount >= 10) risk += 2;
  else if (eventCount >= 5) risk += 1;
  
  return Math.min(risk, 10);
}

/**
 * Compute organization-wide risk score
 */
function computeOrgWideRisk(incidents) {
  if (incidents.length === 0) return 0;
  
  const totalRisk = incidents.reduce((sum, inc) => sum + computeOrgRisk(inc), 0);
  return Math.min(totalRisk / incidents.length, 10);
}

/**
 * Get risk level from score
 */
function getRiskLevel(risk) {
  if (risk >= 9) return "CRITICAL";
  if (risk >= 7) return "HIGH";
  if (risk >= 4) return "MEDIUM";
  return "LOW";
}

/**
 * Compute risk by repository
 */
function computeRiskByRepo(incidents) {
  const repoRisks = {};
  
  for (const inc of incidents) {
    for (const repo of inc.repos) {
      if (!repoRisks[repo]) {
        repoRisks[repo] = 0;
      }
      repoRisks[repo] += computeOrgRisk(inc);
    }
  }
  
  // Normalize by number of incidents per repo
  const repoCounts = {};
  for (const inc of incidents) {
    for (const repo of inc.repos) {
      repoCounts[repo] = (repoCounts[repo] || 0) + 1;
    }
  }
  
  for (const repo in repoRisks) {
    repoRisks[repo] = Math.min(repoRisks[repo] / repoCounts[repo], 10);
  }
  
  return repoRisks;
}

/**
 * Detect risk escalation
 */
function detectRiskEscalation(currentRisk, previousRisk) {
  if (!previousRisk) return false;
  return currentRisk > previousRisk * 1.5;
}

module.exports = {
  computeOrgRisk,
  computeOrgWideRisk,
  getRiskLevel,
  computeRiskByRepo,
  detectRiskEscalation
};
