/**
 * Vector Memory System - Error Learning & Knowledge Base
 * Cognitive SRE System - Memory Layer
 * 
 * Stores error signatures, RCA results, and applied fixes
 * Enables retrieval of known fixes for similar errors
 * 
 * Design:
 * - In-memory storage with localStorage persistence
 * - Pluggable interface for Pinecone/similar vector DB
 * - Error similarity matching using fingerprints
 * - Fix effectiveness tracking
 */

import { RCAResult } from '@/lib/ai/patchAgent';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Error fingerprint for similarity matching */
export interface ErrorFingerprint {
  readonly id: string;
  readonly errorSignature: string;     // Normalized error message
  readonly stackSignature?: string;    // Stack trace hash
  readonly component?: string;         // Component where error occurred
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly timestamp: number;
  readonly vector?: number[];          // Optional vector embedding
}

/** Stored error knowledge entry */
export interface ErrorKnowledge {
  readonly id: string;
  readonly fingerprint: ErrorFingerprint;
  readonly rca: RCAResult | null;
  readonly fix?: {
    readonly patch: string;
    readonly file: string;
    readonly description: string;
    readonly appliedAt: number;
    readonly success: boolean;         // Whether fix resolved the issue
    readonly resolutionTime?: number;  // Time to resolution in ms
  };
  readonly metadata: {
    readonly occurrenceCount: number;
    readonly firstSeen: number;
    readonly lastSeen: number;
    readonly tenantId?: string;
  };
}

/** Search result with similarity score */
export interface SimilarErrorResult {
  readonly knowledge: ErrorKnowledge;
  readonly similarity: number;  // 0.0 - 1.0
  readonly matchedOn: 'signature' | 'component' | 'stack' | 'vector';
}

/** Memory system configuration */
export interface VectorMemoryConfig {
  readonly storageKey: string;
  readonly maxEntries: number;
  readonly similarityThreshold: number;  // Min similarity for match
  readonly enableVectorEmbeddings: boolean;
  readonly retentionDays: number;
}

/** Memory statistics */
export interface MemoryStats {
  readonly totalEntries: number;
  readonly entriesWithFixes: number;
  readonly entriesWithSuccessfulFixes: number;
  readonly fixSuccessRate: number;
  readonly averageResolutionTime: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: VectorMemoryConfig = {
  storageKey: 'sre_vector_memory',
  maxEntries: 1000,
  similarityThreshold: 0.75,
  enableVectorEmbeddings: false,  // Requires Pinecone/similar
  retentionDays: 90,
};

let currentConfig = DEFAULT_CONFIG;

/** Configure vector memory system */
export function configureVectorMemory(config: Partial<VectorMemoryConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

// ============================================================================
// ERROR FINGERPRINTING
// ============================================================================

/**
 * Generate error fingerprint from error details
 * Creates a normalized signature for similarity matching
 */
export function generateErrorFingerprint(
  errorMessage: string,
  stackTrace?: string,
  component?: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): ErrorFingerprint {
  const normalized = normalizeError(errorMessage);
  const id = `fp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    errorSignature: normalized,
    stackSignature: stackTrace ? hashStackTrace(stackTrace) : undefined,
    component,
    severity,
    timestamp: Date.now(),
  };
}

/**
 * Normalize error message for consistent matching
 */
function normalizeError(errorMessage: string): string {
  return errorMessage
    .toLowerCase()
    // Remove variable values (e.g., "undefined" from "Cannot read property 'foo' of undefined")
    .replace(/['"`][a-zA-Z0-9_$]+['"`]/g, "'_VAR_'")
    // Remove specific URLs/paths
    .replace(/https?:\/\/[^\s]+/g, '_URL_')
    // Remove specific file paths
    .replace(/[\/\\][\w\-\.]+[\/\\]/g, '/_PATH_/')
    // Remove line numbers
    .replace(/:\d+:\d+/g, ':_LINE_')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Hash stack trace for comparison
 * Captures only the structure, not specific line numbers
 */
function hashStackTrace(stackTrace: string): string {
  const lines = stackTrace.split('\n');
  const relevant = lines
    .filter(line => line.includes('at '))
    .map(line => {
      // Extract function and file without line numbers
      const match = line.match(/at\s+(\S+)\s*\(([^)]+)\)/) ||
                    line.match(/at\s+(\S+)/);
      if (match) {
        const location = match[2] || match[1];
        // Remove line numbers from file path
        return location.replace(/:\d+:\d+/g, '');
      }
      return line.trim();
    })
    .slice(0, 5)  // Only first 5 frames
    .join('->');
  
  // Simple hash
  return hashString(relevant);
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// ============================================================================
// SIMILARITY CALCULATION
// ============================================================================

/**
 * Calculate similarity between two error fingerprints
 * Returns score 0.0 - 1.0
 */
export function calculateSimilarity(
  a: ErrorFingerprint,
  b: ErrorFingerprint
): number {
  let score = 0;
  let weights = 0;
  
  // Error signature similarity (most important)
  const signatureSim = stringSimilarity(a.errorSignature, b.errorSignature);
  score += signatureSim * 0.5;
  weights += 0.5;
  
  // Component match
  if (a.component && b.component) {
    if (a.component === b.component) {
      score += 0.3;
    }
    weights += 0.3;
  }
  
  // Stack signature similarity
  if (a.stackSignature && b.stackSignature) {
    if (a.stackSignature === b.stackSignature) {
      score += 0.2;  // Exact match
    }
    weights += 0.2;
  }
  
  // Severity match (small bonus)
  if (a.severity === b.severity) {
    score += 0.05;
    weights += 0.05;
  }
  
  return weights > 0 ? score / weights : 0;
}

/**
 * Calculate string similarity using Jaccard index on words
 */
function stringSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

// ============================================================================
// STORAGE MANAGEMENT
// ============================================================================

/**
 * Get all stored knowledge entries
 */
export function getAllKnowledge(): ErrorKnowledge[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(currentConfig.storageKey);
    if (stored) {
      const entries = JSON.parse(stored) as ErrorKnowledge[];
      // Filter out expired entries
      const cutoff = Date.now() - (currentConfig.retentionDays * 24 * 60 * 60 * 1000);
      return entries.filter(e => e.metadata.lastSeen > cutoff);
    }
  } catch (e) {
    console.error('[VECTOR MEMORY] Failed to read storage:', e);
  }
  return [];
}

/**
 * Save knowledge entries to storage
 */
function saveKnowledge(entries: ErrorKnowledge[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Limit to max entries (keep most recent)
    const sorted = entries.sort((a, b) => b.metadata.lastSeen - a.metadata.lastSeen);
    const limited = sorted.slice(0, currentConfig.maxEntries);
    
    localStorage.setItem(currentConfig.storageKey, JSON.stringify(limited));
  } catch (e) {
    console.error('[VECTOR MEMORY] Failed to save storage:', e);
  }
}

/**
 * Store new error knowledge
 */
export function storeErrorKnowledge(
  fingerprint: ErrorFingerprint,
  rca: RCAResult | null,
  fix?: ErrorKnowledge['fix'],
  tenantId?: string
): ErrorKnowledge {
  const allKnowledge = getAllKnowledge();
  const now = Date.now();
  
  // Check if similar error already exists
  const existing = allKnowledge.find(k => 
    calculateSimilarity(k.fingerprint, fingerprint) > 0.9
  );
  
  if (existing) {
    // Update existing entry
    const updated: ErrorKnowledge = {
      ...existing,
      fingerprint: {
        ...existing.fingerprint,
        timestamp: now,  // Update timestamp
      },
      rca: rca ?? existing.rca,
      fix: fix ?? existing.fix,
      metadata: {
        ...existing.metadata,
        occurrenceCount: existing.metadata.occurrenceCount + 1,
        lastSeen: now,
      },
    };
    
    const updatedAll = allKnowledge.map(k => 
      k.id === existing.id ? updated : k
    );
    saveKnowledge(updatedAll);
    
    return updated;
  }
  
  // Create new entry
  const newKnowledge: ErrorKnowledge = {
    id: `ek-${now}-${Math.random().toString(36).substr(2, 9)}`,
    fingerprint,
    rca,
    fix,
    metadata: {
      occurrenceCount: 1,
      firstSeen: now,
      lastSeen: now,
      tenantId,
    },
  };
  
  const newAll = [...allKnowledge, newKnowledge];
  saveKnowledge(newAll);
  
  return newKnowledge;
}

/**
 * Update fix result for existing knowledge
 */
export function updateFixResult(
  knowledgeId: string,
  success: boolean,
  resolutionTime?: number
): ErrorKnowledge | null {
  const allKnowledge = getAllKnowledge();
  const entry = allKnowledge.find(k => k.id === knowledgeId);
  
  if (!entry) return null;
  
  const updated: ErrorKnowledge = {
    ...entry,
    fix: entry.fix ? {
      ...entry.fix,
      success,
      resolutionTime,
    } : undefined,
  };
  
  const updatedAll = allKnowledge.map(k => 
    k.id === knowledgeId ? updated : k
  );
  saveKnowledge(updatedAll);
  
  return updated;
}

// ============================================================================
// RETRIEVAL & SEARCH
// ============================================================================

/**
 * Find similar errors with known fixes
 * Returns ordered by similarity score
 */
export function findSimilarErrorsWithFixes(
  fingerprint: ErrorFingerprint,
  limit: number = 5
): SimilarErrorResult[] {
  const allKnowledge = getAllKnowledge();
  
  // Filter to entries with fixes and calculate similarity
  const withFixes = allKnowledge
    .filter(k => k.fix && k.fix.success !== false)  // Has fix and not known to fail
    .map(k => ({
      knowledge: k,
      similarity: calculateSimilarity(k.fingerprint, fingerprint),
      matchedOn: 'signature' as const,
    }));
  
  // Sort by similarity descending
  const sorted = withFixes.sort((a, b) => b.similarity - a.similarity);
  
  // Filter to threshold and limit
  return sorted
    .filter(r => r.similarity >= currentConfig.similarityThreshold)
    .slice(0, limit);
}

/**
 * Search knowledge base by query
 */
export function searchKnowledge(
  query: string,
  options: {
    hasFix?: boolean;
    successfulOnly?: boolean;
    component?: string;
    limit?: number;
  } = {}
): ErrorKnowledge[] {
  const allKnowledge = getAllKnowledge();
  const queryLower = query.toLowerCase();
  
  let results = allKnowledge.filter(k => {
    // Text search
    const matchesSearch = 
      k.fingerprint.errorSignature.includes(queryLower) ||
      k.rca?.symptom.toLowerCase().includes(queryLower) ||
      k.rca?.root_cause.toLowerCase().includes(queryLower) ||
      k.fix?.description.toLowerCase().includes(queryLower);
    
    if (!matchesSearch) return false;
    
    // Filters
    if (options.hasFix !== undefined) {
      if (options.hasFix && !k.fix) return false;
      if (!options.hasFix && k.fix) return false;
    }
    
    if (options.successfulOnly && k.fix && !k.fix.success) {
      return false;
    }
    
    if (options.component && k.fingerprint.component !== options.component) {
      return false;
    }
    
    return true;
  });
  
  // Sort by occurrence count (most frequent first)
  results.sort((a, b) => b.metadata.occurrenceCount - a.metadata.occurrenceCount);
  
  return results.slice(0, options.limit ?? 20);
}

/**
 * Get knowledge entry by ID
 */
export function getKnowledgeById(id: string): ErrorKnowledge | null {
  const allKnowledge = getAllKnowledge();
  return allKnowledge.find(k => k.id === id) ?? null;
}

// ============================================================================
// INTELLIGENT RETRIEVAL
// ============================================================================

/**
 * Find best fix for error
 * Returns fix recommendation or null if no suitable fix found
 */
export function findBestFix(
  errorMessage: string,
  stackTrace?: string,
  component?: string
): {
  knowledge: ErrorKnowledge;
  confidence: number;
  reason: string;
} | null {
  // Generate fingerprint
  const fingerprint = generateErrorFingerprint(
    errorMessage,
    stackTrace,
    component
  );
  
  // Find similar errors with successful fixes
  const similar = findSimilarErrorsWithFixes(fingerprint, 3);
  
  if (similar.length === 0) {
    return null;
  }
  
  // Take highest similarity match
  const best = similar[0];
  
  // Calculate confidence based on:
  // - Similarity score
  // - Number of successful applications
  // - Average resolution time
  const baseConfidence = best.similarity;
  const occurrenceBonus = Math.min(best.knowledge.metadata.occurrenceCount * 0.02, 0.1);
  
  let confidence = baseConfidence + occurrenceBonus;
  confidence = Math.min(1, Math.max(0, confidence));
  
  // Generate reason
  let reason = `Similar error found with ${(best.similarity * 100).toFixed(0)}% match`;
  if (best.knowledge.fix?.success) {
    reason += `. Fix was successful ${best.knowledge.metadata.occurrenceCount} times.`;
  }
  if (best.knowledge.fix?.resolutionTime) {
    const avgTime = Math.round(best.knowledge.fix.resolutionTime / 1000);
    reason += ` Average resolution: ${avgTime}s.`;
  }
  
  return {
    knowledge: best.knowledge,
    confidence,
    reason,
  };
}

/**
 * Skip RCA if we already have knowledge for similar error
 */
export function shouldSkipRCA(
  errorMessage: string,
  stackTrace?: string
): {
  skip: boolean;
  existingRCA?: RCAResult;
  confidence: number;
} {
  const fingerprint = generateErrorFingerprint(errorMessage, stackTrace);
  const similar = findSimilarErrorsWithFixes(fingerprint, 1);
  
  if (similar.length === 0 || similar[0].similarity < 0.9) {
    return { skip: false, confidence: 0 };
  }
  
  const best = similar[0];
  
  if (best.knowledge.rca) {
    return {
      skip: true,
      existingRCA: best.knowledge.rca,
      confidence: best.similarity,
    };
  }
  
  return { skip: false, confidence: 0 };
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

/**
 * Get memory system statistics
 */
export function getMemoryStats(): MemoryStats {
  const allKnowledge = getAllKnowledge();
  
  const withFixes = allKnowledge.filter(k => k.fix);
  const successfulFixes = withFixes.filter(k => k.fix?.success);
  
  const resolutionTimes = successfulFixes
    .map(k => k.fix?.resolutionTime)
    .filter((t): t is number => t !== undefined);
  
  const avgResolutionTime = resolutionTimes.length > 0
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : 0;
  
  return {
    totalEntries: allKnowledge.length,
    entriesWithFixes: withFixes.length,
    entriesWithSuccessfulFixes: successfulFixes.length,
    fixSuccessRate: withFixes.length > 0 
      ? (successfulFixes.length / withFixes.length) * 100 
      : 0,
    averageResolutionTime: avgResolutionTime,
  };
}

/**
 * Get fix effectiveness report
 */
export function getFixEffectivenessReport(): Array<{
  knowledgeId: string;
  errorSignature: string;
  fixDescription: string;
  successRate: number;
  occurrenceCount: number;
  avgResolutionTime: number;
}> {
  const allKnowledge = getAllKnowledge();
  
  return allKnowledge
    .filter(k => k.fix)
    .map(k => ({
      knowledgeId: k.id,
      errorSignature: k.fingerprint.errorSignature.substring(0, 100) + '...',
      fixDescription: k.fix!.description,
      successRate: k.fix!.success ? 100 : 0,  // Simplified - could track multiple attempts
      occurrenceCount: k.metadata.occurrenceCount,
      avgResolutionTime: k.fix!.resolutionTime ?? 0,
    }))
    .sort((a, b) => b.successRate - a.successRate);
}

// ============================================================================
// PLUMBING FOR VECTOR DATABASE
// ============================================================================

/**
 * Interface for external vector database (Pinecone, Weaviate, etc.)
 */
export interface VectorDatabaseAdapter {
  upsert(id: string, vector: number[], metadata: Record<string, unknown>): Promise<void>;
  query(vector: number[], topK: number): Promise<Array<{ id: string; score: number }>>;
  delete(id: string): Promise<void>;
}

let vectorAdapter: VectorDatabaseAdapter | null = null;

/**
 * Set vector database adapter for hybrid search
 */
export function setVectorAdapter(adapter: VectorDatabaseAdapter): void {
  vectorAdapter = adapter;
  currentConfig = { ...currentConfig, enableVectorEmbeddings: true };
}

/**
 * Generate simple vector embedding (placeholder for real embedding)
 * In production, this would call an embedding API (OpenAI, etc.)
 */
function generateEmbedding(text: string): number[] {
  // Simple bag-of-words embedding (for demo purposes)
  // Production should use: OpenAI text-embedding-3-small or similar
  const words = text.toLowerCase().split(/\s+/);
  const dimensions = 64;
  const vector = new Array(dimensions).fill(0);
  
  words.forEach((word, i) => {
    const index = hashString(word) % dimensions;
    vector[index] += 1;
  });
  
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    return vector.map(v => v / magnitude);
  }
  return vector;
}

// ============================================================================
// CLEANUP & MAINTENANCE
// ============================================================================

/**
 * Clean up old entries
 */
export function cleanupOldEntries(): number {
  const allKnowledge = getAllKnowledge();
  const cutoff = Date.now() - (currentConfig.retentionDays * 24 * 60 * 60 * 1000);
  
  const filtered = allKnowledge.filter(k => k.metadata.lastSeen > cutoff);
  const removed = allKnowledge.length - filtered.length;
  
  if (removed > 0) {
    saveKnowledge(filtered);
    console.log(`[VECTOR MEMORY] Cleaned up ${removed} old entries`);
  }
  
  return removed;
}

/**
 * Clear all knowledge (emergency use)
 */
export function clearAllKnowledge(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(currentConfig.storageKey);
  console.log('[VECTOR MEMORY] All knowledge cleared');
}

/**
 * Export knowledge base (for backup/migration)
 */
export function exportKnowledge(): string {
  const allKnowledge = getAllKnowledge();
  return JSON.stringify(allKnowledge, null, 2);
}

/**
 * Import knowledge base
 */
export function importKnowledge(json: string): ErrorKnowledge[] {
  try {
    const imported = JSON.parse(json) as ErrorKnowledge[];
    const existing = getAllKnowledge();
    
    // Merge, keeping newer lastSeen
    const merged = [...existing];
    imported.forEach(imp => {
      const existingIndex = merged.findIndex(e => e.id === imp.id);
      if (existingIndex >= 0) {
        if (imp.metadata.lastSeen > merged[existingIndex].metadata.lastSeen) {
          merged[existingIndex] = imp;
        }
      } else {
        merged.push(imp);
      }
    });
    
    saveKnowledge(merged);
    return merged;
  } catch (e) {
    console.error('[VECTOR MEMORY] Import failed:', e);
    throw new Error('Invalid knowledge import data');
  }
}

// ============================================================================
// DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).vectorMemory = {
    getAllKnowledge,
    storeErrorKnowledge,
    findSimilarErrorsWithFixes,
    findBestFix,
    searchKnowledge,
    getMemoryStats,
    cleanupOldEntries,
    clearAllKnowledge,
    exportKnowledge,
    importKnowledge,
    configureVectorMemory,
  };
}
