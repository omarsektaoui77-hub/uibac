// ZeroLeak AI SOC Mode - Correlation Engine
// Groups related events into incidents

/**
 * Correlate events into incidents based on time window and similarity
 */
function correlate(events, windowMs = 5 * 60 * 1000) {
  const incidents = [];
  const byKey = {};

  // Group events by repo:type
  for (const e of events) {
    const key = `${e.repo}:${e.type}`;
    byKey[key] = byKey[key] || [];
    byKey[key].push(e);
  }

  // Create incidents from groups
  for (const key in byKey) {
    const group = byKey[key].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // Only create incident if 3+ events
    if (group.length >= 3) {
      // Check if events are within time window
      const firstTime = new Date(group[0].time).getTime();
      const lastTime = new Date(group[group.length - 1].time).getTime();
      
      if (lastTime - firstTime <= windowMs) {
        incidents.push({
          id: "INC-" + Date.now(),
          repo: group[0].repo,
          type: group[0].type,
          events: group,
          start: group[0].time,
          end: group[group.length - 1].time,
          count: group.length
        });
      }
    }
  }

  return incidents;
}

/**
 * Advanced correlation with multiple grouping strategies
 */
function correlateAdvanced(events) {
  const incidents = [];

  // Strategy 1: Same repo, same type, short time window
  const byRepoType = correlate(events, 5 * 60 * 1000);
  incidents.push(...byRepoType);

  // Strategy 2: Same org, same type, longer time window
  const byOrgType = correlateByOrg(events, 15 * 60 * 1000);
  incidents.push(...byOrgType);

  // Strategy 3: Same actor, any type
  const byActor = correlateByActor(events, 10 * 60 * 1000);
  incidents.push(...byActor);

  return incidents;
}

/**
 * Correlate by organization
 */
function correlateByOrg(events, windowMs) {
  const incidents = [];
  const byKey = {};

  for (const e of events) {
    const key = `${e.org}:${e.type}`;
    byKey[key] = byKey[key] || [];
    byKey[key].push(e);
  }

  for (const key in byKey) {
    const group = byKey[key].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    if (group.length >= 5) {
      const firstTime = new Date(group[0].time).getTime();
      const lastTime = new Date(group[group.length - 1].time).getTime();
      
      if (lastTime - firstTime <= windowMs) {
        incidents.push({
          id: "INC-ORG-" + Date.now(),
          org: group[0].org,
          type: group[0].type,
          events: group,
          start: group[0].time,
          end: group[group.length - 1].time,
          count: group.length
        });
      }
    }
  }

  return incidents;
}

/**
 * Correlate by actor
 */
function correlateByActor(events, windowMs) {
  const incidents = [];
  const byActor = {};

  for (const e of events) {
    byActor[e.actor] = byActor[e.actor] || [];
    byActor[e.actor].push(e);
  }

  for (const actor in byActor) {
    const group = byActor[actor].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    if (group.length >= 5) {
      const firstTime = new Date(group[0].time).getTime();
      const lastTime = new Date(group[group.length - 1].time).getTime();
      
      if (lastTime - firstTime <= windowMs) {
        incidents.push({
          id: "INC-ACTOR-" + Date.now(),
          actor: actor,
          events: group,
          start: group[0].time,
          end: group[group.length - 1].time,
          count: group.length
        });
      }
    }
  }

  return incidents;
}

module.exports = {
  correlate,
  correlateAdvanced,
  correlateByOrg,
  correlateByActor
};
