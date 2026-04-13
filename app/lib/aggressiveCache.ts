// Aggressive Caching System for Zero-Cost AI Operations

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
}

export interface CacheStats {
  size: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: string;
}

/**
 * Aggressive cache with permanent storage and smart eviction
 */
export class AggressiveCache<T> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private stats = { hits: 0, misses: 0 };
  private cleanupInterval: NodeJS.Timeout;

  constructor(private maxSize: number = 10000, private defaultTTL: number = 24 * 60 * 60 * 1000) { // 24 hours default
    // Cleanup every hour
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Set cache item with permanent TTL option
   */
  set(key: string, data: T, ttl?: number, permanent: boolean = false): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: permanent ? Number.MAX_SAFE_INTEGER : (ttl || this.defaultTTL),
      hits: 0,
      lastAccessed: Date.now()
    });
  }

  /**
   * Get cache item with automatic hit tracking
   */
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    item.hits++;
    item.lastAccessed = Date.now();
    this.stats.hits++;
    
    return item.data;
  }

  /**
   * Check if key exists (without updating access stats)
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check expiration
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    // Estimate memory usage
    const memoryUsage = this.estimateMemoryUsage();
    
    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      memoryUsage
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get items sorted by usage
   */
  getItemsByUsage(): Array<{ key: string; hits: number; lastAccessed: number }> {
    return Array.from(this.cache.entries())
      .map(([key, item]) => ({
        key,
        hits: item.hits,
        lastAccessed: item.lastAccessed
      }))
      .sort((a, b) => b.hits - a.hits);
  }

  /**
   * Evict least used items
   */
  private evictLeastUsed(): void {
    const items = Array.from(this.cache.entries())
      .map(([key, item]) => ({ key, score: this.calculateScore(item) }))
      .sort((a, b) => a.score - b.score);

    // Remove bottom 10%
    const toRemove = Math.max(1, Math.floor(items.length * 0.1));
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(items[i].key);
    }
  }

  /**
   * Calculate eviction score (lower = more likely to evict)
   */
  private calculateScore(item: CacheItem<T>): number {
    const now = Date.now();
    const age = now - item.timestamp;
    const timeSinceAccess = now - item.lastAccessed;
    
    // Score = hits / (age * timeSinceAccess)
    // Higher score = more valuable
    return item.hits / (age * timeSinceAccess + 1);
  }

  /**
   * Cleanup expired items
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => this.cache.delete(key));
    
    if (toDelete.length > 0) {
      console.log(`Cache cleanup: removed ${toDelete.length} expired items`);
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): string {
    let totalSize = 0;
    
    for (const [key, item] of this.cache.entries()) {
      // Rough estimation
      totalSize += key.length * 2; // UTF-16
      totalSize += JSON.stringify(item.data).length * 2;
      totalSize += 64; // Metadata overhead
    }
    
    if (totalSize < 1024) {
      return `${totalSize} B`;
    } else if (totalSize < 1024 * 1024) {
      return `${Math.round(totalSize / 1024)} KB`;
    } else {
      return `${Math.round(totalSize / (1024 * 1024))} MB`;
    }
  }

  /**
   * Destroy cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

/**
 * Specialized caches for different data types
 */
export class ZeroCostCacheManager {
  private pdfTextCache = new AggressiveCache<string>(1000, 7 * 24 * 60 * 60 * 1000); // 7 days
  private analysisCache = new AggressiveCache<any>(500, 30 * 24 * 60 * 60 * 1000); // 30 days
  private questionCache = new AggressiveCache<any[]>(200, 30 * 24 * 60 * 60 * 1000); // 30 days
  private conceptCache = new AggressiveCache<string[]>(100, Number.MAX_SAFE_INTEGER); // Permanent

  /**
   * Cache PDF text (expensive to extract)
   */
  cachePDFText(fileId: string, text: string): void {
    this.pdfTextCache.set(fileId, text, 7 * 24 * 60 * 60 * 1000, true); // Permanent
  }

  getPDFText(fileId: string): string | null {
    return this.pdfTextCache.get(fileId);
  }

  /**
   * Cache analysis results
   */
  cacheAnalysis(fileId: string, analysis: any): void {
    this.analysisCache.set(fileId, analysis, 30 * 24 * 60 * 60 * 1000, true); // Permanent
  }

  getAnalysis(fileId: string): any | null {
    return this.analysisCache.get(fileId);
  }

  /**
   * Cache generated questions
   */
  cacheQuestions(key: string, questions: any[]): void {
    this.questionCache.set(key, questions, 30 * 24 * 60 * 60 * 1000, true); // Permanent
  }

  getQuestions(key: string): any[] | null {
    return this.questionCache.get(key);
  }

  /**
   * Cache extracted concepts
   */
  cacheConcepts(key: string, concepts: string[]): void {
    this.conceptCache.set(key, concepts, Number.MAX_SAFE_INTEGER, true); // Permanent
  }

  getConcepts(key: string): string[] | null {
    return this.conceptCache.get(key);
  }

  /**
   * Check if file has been processed
   */
  isFileProcessed(fileId: string): boolean {
    return this.analysisCache.has(fileId) || this.pdfTextCache.has(fileId);
  }

  /**
   * Get comprehensive cache statistics
   */
  getAllStats(): Record<string, CacheStats> {
    return {
      pdfText: this.pdfTextCache.getStats(),
      analysis: this.analysisCache.getStats(),
      questions: this.questionCache.getStats(),
      concepts: this.conceptCache.getStats()
    };
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.pdfTextCache.clear();
    this.analysisCache.clear();
    this.questionCache.clear();
    this.conceptCache.clear();
  }

  /**
   * Preload critical data
   */
  async preloadCriticalData(): Promise<void> {
    // This would load frequently accessed data into cache
    console.log('Preloading critical cache data...');
  }

  /**
   * Export cache for backup
   */
  exportCache(): Record<string, any> {
    return {
      pdfText: this.exportCacheMap(this.pdfTextCache),
      analysis: this.exportCacheMap(this.analysisCache),
      questions: this.exportCacheMap(this.questionCache),
      concepts: this.exportCacheMap(this.conceptCache)
    };
  }

  /**
   * Import cache from backup
   */
  importCache(data: Record<string, any>): void {
    this.importCacheMap(this.pdfTextCache, data.pdfText || {});
    this.importCacheMap(this.analysisCache, data.analysis || {});
    this.importCacheMap(this.questionCache, data.questions || {});
    this.importCacheMap(this.conceptCache, data.concepts || {});
  }

  private exportCacheMap(cache: AggressiveCache<any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key of cache.keys()) {
      const item = cache.get(key);
      if (item) {
        result[key] = item;
      }
    }
    return result;
  }

  private importCacheMap(cache: AggressiveCache<any>, data: Record<string, any>): void {
    for (const [key, value] of Object.entries(data)) {
      cache.set(key, value, Number.MAX_SAFE_INTEGER, true);
    }
  }

  /**
   * Destroy all cache instances
   */
  destroy(): void {
    this.pdfTextCache.destroy();
    this.analysisCache.destroy();
    this.questionCache.destroy();
    this.conceptCache.destroy();
  }
}

// Export singleton
export const cacheManager = new ZeroCostCacheManager();
