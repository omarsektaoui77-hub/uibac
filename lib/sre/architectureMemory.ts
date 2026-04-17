/**
 * Architecture Memory System
 * 
 * Stores and retrieves architecture patterns and their outcomes:
 * - Successful architecture patterns
 * - Failed experiments (avoid)
 * - Performance gains achieved
 * - Reusable solutions
 * 
 * Enables the system to remember what works and what doesn't.
 */

import { ArchitectureProposal } from './architectureAdvisor';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Stored architecture pattern with outcome */
export interface ArchitectureMemory {
  readonly id: string;
  readonly pattern_type: string;           // e.g., 'api_latency', 'render_performance'
  readonly problem_signature: string;       // Hash of problem characteristics
  readonly solution: ArchitectureProposal;
  readonly outcome: 'success' | 'failure' | 'partial';
  readonly impact: number;                // 0-100 measured impact
  readonly metrics_before: MemoryMetrics;
  readonly metrics_after: MemoryMetrics;
  readonly experiment_id?: string;
  readonly created_at: number;
  readonly last_accessed: number;
  readonly access_count: number;
  readonly tags: string[];
}

/** Metrics stored in memory */
interface MemoryMetrics {
  readonly error_rate: number;
  readonly avg_latency_ms: number;
  readonly throughput_rps: number;
  readonly memory_mb: number;
  readonly timestamp: number;
}

/** Memory search result with relevance */
export interface MemorySearchResult {
  readonly memory: ArchitectureMemory;
  readonly relevance_score: number;       // 0-1 similarity
  readonly estimated_success_rate: number;
  readonly recommendation: 'use' | 'review' | 'avoid';
}

/** Pattern effectiveness statistics */
export interface MemoryStats {
  readonly total_memories: number;
  readonly successful: number;
  readonly failed: number;
  readonly by_type: Record<string, number>;
  readonly avg_impact: number;
  readonly most_effective_patterns: string[];
}

// ============================================================================
// STORAGE
// ============================================================================

const memoryStore = new Map<string, ArchitectureMemory>();
const patternIndex = new Map<string, string[]>(); // pattern_type -> memory_ids

// ============================================================================
// MEMORY MANAGEMENT
// ============================================================================

/**
 * Store successful architecture experiment
 */
export function storeSuccess(
  proposal: ArchitectureProposal,
  impact: number,
  metricsBefore: MemoryMetrics,
  metricsAfter: MemoryMetrics,
  experimentId: string
): ArchitectureMemory {
  const memoryId = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const memory: ArchitectureMemory = {
    id: memoryId,
    pattern_type: proposal.type,
    problem_signature: generateProblemSignature(proposal),
    solution: proposal,
    outcome: 'success',
    impact,
    metrics_before: metricsBefore,
    metrics_after: metricsAfter,
    experiment_id: experimentId,
    created_at: Date.now(),
    last_accessed: Date.now(),
    access_count: 0,
    tags: generateTags(proposal),
  };
  
  memoryStore.set(memoryId, memory);
  indexMemory(memory);
  
  console.log(`[ARCH-MEMORY] Stored success: ${proposal.title} (impact: ${impact})`);
  return memory;
}

/**
 * Store failed experiment (for avoidance)
 */
export function storeFailure(
  proposal: ArchitectureProposal,
  reason: string,
  experimentId: string
): ArchitectureMemory {
  const memoryId = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const memory: ArchitectureMemory = {
    id: memoryId,
    pattern_type: proposal.type,
    problem_signature: generateProblemSignature(proposal),
    solution: proposal,
    outcome: 'failure',
    impact: 0,
    metrics_before: {
      error_rate: 0,
      avg_latency_ms: 0,
      throughput_rps: 0,
      memory_mb: 0,
      timestamp: Date.now(),
    },
    metrics_after: {
      error_rate: 0,
      avg_latency_ms: 0,
      throughput_rps: 0,
      memory_mb: 0,
      timestamp: Date.now(),
    },
    experiment_id: experimentId,
    created_at: Date.now(),
    last_accessed: Date.now(),
    access_count: 0,
    tags: [...generateTags(proposal), 'failed', reason],
  };
  
  memoryStore.set(memoryId, memory);
  indexMemory(memory);
  
  console.log(`[ARCH-MEMORY] Stored failure: ${proposal.title} (${reason})`);
  return memory;
}

/**
 * Search for relevant patterns given a problem description
 */
export function searchMemory(
  problemType: string,
  location?: string,
  minImpact: number = 50
): MemorySearchResult[] {
  const results: MemorySearchResult[] = [];
  
  // Find memories matching problem type
  const candidateIds = patternIndex.get(problemType) || [];
  
  for (const memoryId of candidateIds) {
    const memory = memoryStore.get(memoryId);
    if (!memory) continue;
    
    // Filter by minimum impact
    if (memory.outcome === 'success' && memory.impact < minImpact) continue;
    
    // Calculate relevance
    let relevance = calculateRelevance(memory, problemType, location);
    
    // Boost recent memories
    const ageDays = (Date.now() - memory.created_at) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 1 - ageDays / 90); // 90-day decay
    relevance = relevance * 0.7 + recencyBoost * 0.3;
    
    // Determine recommendation
    let recommendation: 'use' | 'review' | 'avoid';
    if (memory.outcome === 'failure') {
      recommendation = 'avoid';
    } else if (memory.impact >= 70 && memory.access_count >= 2) {
      recommendation = 'use';
    } else {
      recommendation = 'review';
    }
    
    // Estimate success rate based on outcome history
    const similarOutcomes = getSimilarOutcomes(memory.pattern_type);
    const successRate = similarOutcomes.filter(o => o === 'success').length / similarOutcomes.length;
    
    results.push({
      memory,
      relevance_score: Math.round(relevance * 100) / 100,
      estimated_success_rate: successRate,
      recommendation,
    });
  }
  
  // Sort by relevance
  return results.sort((a, b) => b.relevance_score - a.relevance_score);
}

/**
 * Find best pattern for a specific problem
 */
export function findBestPattern(
  problemType: string,
  location?: string
): ArchitectureMemory | null {
  const results = searchMemory(problemType, location, 60);
  
  // Return highest relevance successful pattern
  const successfulResults = results.filter(r => 
    r.memory.outcome === 'success' && r.recommendation === 'use'
  );
  
  if (successfulResults.length === 0) return null;
  
  const best = successfulResults[0];
  
  // Update access stats
  const memory = best.memory;
  memoryStore.set(memory.id, {
    ...memory,
    last_accessed: Date.now(),
    access_count: memory.access_count + 1,
  });
  
  return best.memory;
}

/**
 * Check if a pattern has been tried before and failed
 */
export function hasPatternFailedBefore(proposal: ArchitectureProposal): {
  failed: boolean;
  similar_attempts: number;
  reason?: string;
} {
  const signature = generateProblemSignature(proposal);
  
  const failedMemories = Array.from(memoryStore.values()).filter(m => 
    m.outcome === 'failure' &&
    m.problem_signature === signature
  );
  
  if (failedMemories.length === 0) {
    return { failed: false, similar_attempts: 0 };
  }
  
  // Get most recent failure reason from tags
  const latest = failedMemories.sort((a, b) => b.created_at - a.created_at)[0];
  const reason = latest.tags.find(t => !['failed', ...generateTags(proposal)].includes(t));
  
  return {
    failed: true,
    similar_attempts: failedMemories.length,
    reason,
  };
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

/**
 * Get memory statistics
 */
export function getMemoryStats(): MemoryStats {
  const memories = Array.from(memoryStore.values());
  const successful = memories.filter(m => m.outcome === 'success');
  const failed = memories.filter(m => m.outcome === 'failure');
  
  const byType: Record<string, number> = {};
  for (const m of memories) {
    byType[m.pattern_type] = (byType[m.pattern_type] || 0) + 1;
  }
  
  const avgImpact = successful.length > 0
    ? successful.reduce((s, m) => s + m.impact, 0) / successful.length
    : 0;
  
  // Find most effective patterns
  const patternEffectiveness = new Map<string, number>();
  for (const m of successful) {
    const current = patternEffectiveness.get(m.pattern_type) || 0;
    patternEffectiveness.set(m.pattern_type, current + m.impact);
  }
  
  const mostEffective = Array.from(patternEffectiveness.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type]) => type);
  
  return {
    total_memories: memories.length,
    successful: successful.length,
    failed: failed.length,
    by_type: byType,
    avg_impact: Math.round(avgImpact * 10) / 10,
    most_effective_patterns: mostEffective,
  };
}

/**
 * Get performance gains from memory
 */
export function getPerformanceGains(): Array<{
  pattern_type: string;
  avg_latency_reduction_ms: number;
  avg_error_rate_reduction: number;
  count: number;
}> {
  const gains = new Map<string, { latency_reductions: number[]; error_reductions: number[] }>();
  
  for (const memory of memoryStore.values()) {
    if (memory.outcome !== 'success') continue;
    
    const latencyReduction = memory.metrics_before.avg_latency_ms - memory.metrics_after.avg_latency_ms;
    const errorReduction = memory.metrics_before.error_rate - memory.metrics_after.error_rate;
    
    const existing = gains.get(memory.pattern_type) || { latency_reductions: [], error_reductions: [] };
    existing.latency_reductions.push(latencyReduction);
    existing.error_reductions.push(errorReduction);
    gains.set(memory.pattern_type, existing);
  }
  
  return Array.from(gains.entries()).map(([pattern_type, data]) => ({
    pattern_type,
    avg_latency_reduction_ms: Math.round(
      data.latency_reductions.reduce((a, b) => a + b, 0) / data.latency_reductions.length
    ),
    avg_error_rate_reduction: Math.round(
      (data.error_reductions.reduce((a, b) => a + b, 0) / data.error_reductions.length) * 10000
    ) / 10000,
    count: data.latency_reductions.length,
  }));
}

/**
 * Get learning velocity (new patterns per week)
 */
export function getLearningVelocity(): {
  new_patterns_this_week: number;
  avg_impact_this_week: number;
  trend: 'increasing' | 'stable' | 'decreasing';
} {
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
  
  const thisWeek = Array.from(memoryStore.values()).filter(m => 
    m.created_at > oneWeekAgo && m.outcome === 'success'
  );
  
  const lastWeek = Array.from(memoryStore.values()).filter(m => 
    m.created_at > twoWeeksAgo && m.created_at <= oneWeekAgo && m.outcome === 'success'
  );
  
  const avgImpactThisWeek = thisWeek.length > 0
    ? thisWeek.reduce((s, m) => s + m.impact, 0) / thisWeek.length
    : 0;
  
  const trend = thisWeek.length > lastWeek.length ? 'increasing' :
    thisWeek.length < lastWeek.length ? 'decreasing' : 'stable';
  
  return {
    new_patterns_this_week: thisWeek.length,
    avg_impact_this_week: Math.round(avgImpactThisWeek * 10) / 10,
    trend,
  };
}

// ============================================================================
// INDEXING & UTILITIES
// ============================================================================

function indexMemory(memory: ArchitectureMemory): void {
  // Add to pattern type index
  const existing = patternIndex.get(memory.pattern_type) || [];
  if (!existing.includes(memory.id)) {
    patternIndex.set(memory.pattern_type, [...existing, memory.id]);
  }
  
  // Index by tags
  for (const tag of memory.tags) {
    const tagExisting = patternIndex.get(tag) || [];
    if (!tagExisting.includes(memory.id)) {
      patternIndex.set(tag, [...tagExisting, memory.id]);
    }
  }
}

function generateProblemSignature(proposal: ArchitectureProposal): string {
  // Create hash from problem characteristics
  const components = [
    proposal.type,
    proposal.pattern_id,
    proposal.affected_files.sort().join(','),
  ];
  return hashString(components.join('|'));
}

function generateTags(proposal: ArchitectureProposal): string[] {
  const tags = [
    proposal.type,
    proposal.risk_level,
    ...proposal.affected_files.map(f => f.split('/')[0]), // Top-level directories
  ];
  
  // Add impact level tag
  if (proposal.expected_impact >= 70) tags.push('high-impact');
  else if (proposal.expected_impact >= 40) tags.push('medium-impact');
  else tags.push('low-impact');
  
  return [...new Set(tags)];
}

function calculateRelevance(
  memory: ArchitectureMemory,
  problemType: string,
  location?: string
): number {
  let score = 0;
  
  // Type match
  if (memory.pattern_type === problemType) score += 0.5;
  
  // Location similarity
  if (location && memory.solution.affected_files.some(f => f.includes(location))) {
    score += 0.3;
  }
  
  // Tag overlap
  const problemTags = [problemType, location].filter(Boolean) as string[];
  const overlap = memory.tags.filter(t => problemTags.includes(t)).length;
  score += (overlap / Math.max(1, problemTags.length)) * 0.2;
  
  return score;
}

function getSimilarOutcomes(patternType: string): ('success' | 'failure' | 'partial')[] {
  return Array.from(memoryStore.values())
    .filter(m => m.pattern_type === patternType)
    .map(m => m.outcome);
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// ============================================================================
// MAINTENANCE
// ============================================================================

/**
 * Cleanup old memories (older than 180 days)
 */
export function cleanupOldMemories(): number {
  const now = Date.now();
  const cutoff = now - 180 * 24 * 60 * 60 * 1000; // 180 days
  
  let removed = 0;
  for (const [id, memory] of memoryStore) {
    if (memory.created_at < cutoff) {
      memoryStore.delete(id);
      removed++;
    }
  }
  
  return removed;
}

/**
 * Export all memories
 */
export function exportMemories(): ArchitectureMemory[] {
  return Array.from(memoryStore.values());
}

/**
 * Import memories (for backup restore)
 */
export function importMemories(memories: ArchitectureMemory[]): void {
  for (const memory of memories) {
    memoryStore.set(memory.id, memory);
    indexMemory(memory);
  }
}

// ============================================================================
// DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).architectureMemory = {
    storeSuccess,
    storeFailure,
    searchMemory,
    findBestPattern,
    hasPatternFailedBefore,
    getMemoryStats,
    getPerformanceGains,
    getLearningVelocity,
    exportMemories,
    importMemories,
  };
}
