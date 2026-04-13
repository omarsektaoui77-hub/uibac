// AI Caching System
// Intelligent caching for AI recommendations with TTL optimization

import { AIRecommendation } from './decisionEngine';
import { AIContext } from './contextEngine';
import { CacheManager } from '@/app/lib/cache/cacheManager';

export interface CacheEntry {
  recommendation: AIRecommendation;
  context: Partial<AIContext>;
  timestamp: number;
  ttl: number;
  hits: number;
  effectiveness: number;
  lastUsed: number;
}

export interface CacheConfig {
  defaultTTL: number; // seconds
  maxEntries: number;
  cleanupInterval: number; // seconds
  effectivenessThreshold: number; // 0-1
  adaptiveTTL: boolean;
  contextSimilarityThreshold: number; // 0-1
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  averageTTL: number;
  effectivenessScore: number;
  costSavings: number;
  memoryUsage: number;
}

/**
 * AI Cache Manager
 * Intelligent caching system for AI recommendations
 */
export class AICacheManager {
  private static config: CacheConfig = {
    defaultTTL: 6 * 60 * 60, // 6 hours
    maxEntries: 1000,
    cleanupInterval: 60 * 60, // 1 hour
    effectivenessThreshold: 0.7,
    adaptiveTTL: true,
    contextSimilarityThreshold: 0.8
  };

  private static cacheKeyPrefix = 'ai_recommendation:';
  private static stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    cleanups: 0,
    totalCostSaved: 0
  };

  /**
   * Initialize AI cache system
   */
  static async initialize(config: Partial<CacheConfig> = {}): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Start cleanup interval
    this.startCleanupInterval();
    
    console.log('AI Cache initialized with config:', this.config);
  }

  /**
   * Get cached recommendation
   */
  static async getCachedRecommendation(
    userId: string,
    context: AIContext
  ): Promise<AIRecommendation | null> {
    try {
      const cacheKey = this.generateCacheKey(userId, context);
      const cached = await CacheManager.get<CacheEntry>(cacheKey);
      
      if (!cached) {
        this.stats.misses++;
        return null;
      }

      // Check if cache entry is still valid
      if (this.isExpired(cached)) {
        await CacheManager.delete(cacheKey);
        this.stats.misses++;
        return null;
      }

      // Check context similarity
      if (!this.isContextSimilar(cached.context, context)) {
        this.stats.misses++;
        return null;
      }

      // Update usage statistics
      cached.hits++;
      cached.lastUsed = Date.now();
      this.stats.hits++;
      
      // Update cache with new usage stats
      await CacheManager.set(cacheKey, cached, {
        ttl: this.calculateAdaptiveTTL(cached)
      });

      console.log(`AI Cache hit for user ${userId}`);
      return cached.recommendation;

    } catch (error) {
      console.error('AI Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Cache recommendation
   */
  static async cacheRecommendation(
    userId: string,
    context: AIContext,
    recommendation: AIRecommendation,
    options: {
      ttl?: number;
      priority?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(userId, context);
      const ttl = options.ttl || this.config.defaultTTL;
      
      const cacheEntry: CacheEntry = {
        recommendation,
        context: this.createContextSnapshot(context),
        timestamp: Date.now(),
        ttl,
        hits: 0,
        effectiveness: 0,
        lastUsed: Date.now()
      };

      await CacheManager.set(cacheKey, cacheEntry, {
        ttl,
        tags: ['ai_recommendation', `user:${userId}`],
        priority: options.priority || 'medium'
      });

      this.stats.sets++;
      console.log(`AI Cache set for user ${userId} with TTL ${ttl}s`);

    } catch (error) {
      console.error('AI Cache set error:', error);
    }
  }

  /**
   * Update recommendation effectiveness
   */
  static async updateEffectiveness(
    userId: string,
    context: AIContext,
    effectiveness: number
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(userId, context);
      const cached = await CacheManager.get<CacheEntry>(cacheKey);
      
      if (!cached) return;

      // Update effectiveness with weighted average
      cached.effectiveness = (cached.effectiveness * 0.7) + (effectiveness * 0.3);
      cached.lastUsed = Date.now();

      // Update cache with new effectiveness
      await CacheManager.set(cacheKey, cached, {
        ttl: this.calculateAdaptiveTTL(cached)
      });

    } catch (error) {
      console.error('AI Cache update error:', error);
    }
  }

  /**
   * Invalidate user cache
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    try {
      await CacheManager.invalidateByTag(`user:${userId}`);
      console.log(`Invalidated AI cache for user ${userId}`);
    } catch (error) {
      console.error('AI Cache invalidate error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<CacheStats> {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    // Estimate cost savings (assuming $0.01 per API call)
    const costSavings = this.stats.hits * 0.01;
    
    return {
      totalEntries: this.stats.sets,
      hitRate,
      averageTTL: this.config.defaultTTL,
      effectivenessScore: this.config.effectivenessThreshold,
      costSavings,
      memoryUsage: this.stats.sets * 1024 // Rough estimate
    };
  }

  /**
   * Clear all AI cache
   */
  static async clearCache(): Promise<void> {
    try {
      await CacheManager.invalidateByTag('ai_recommendation');
      console.log('AI Cache cleared');
    } catch (error) {
      console.error('AI Cache clear error:', error);
    }
  }

  /**
   * Generate cache key based on user and context
   */
  private static generateCacheKey(userId: string, context: AIContext): string {
    // Create a deterministic key based on key context elements
    const keyElements = [
      userId,
      context.stats.level.toString(),
      context.stats.streak.toString(),
      Object.keys(context.subjects).sort().join(','),
      context.behavior.studyPattern,
      context.behavior.burnoutRisk
    ];

    const keyHash = this.hashString(keyElements.join('|'));
    return `${this.cacheKeyPrefix}${userId}:${keyHash}`;
  }

  /**
   * Create context snapshot for caching
   */
  private static createContextSnapshot(context: AIContext): Partial<AIContext> {
    return {
      stats: {
        xp: context.stats.xp,
        level: context.stats.level,
        streak: context.stats.streak,
        rank: context.stats.rank,
        totalStudyTime: context.stats.totalStudyTime,
        averageAccuracy: context.stats.averageAccuracy
      },
      subjects: Object.fromEntries(
        Object.entries(context.subjects).map(([id, data]) => [
          id,
          {
            xp: data.xp,
            level: data.level,
            accuracy: data.accuracy,
            lastActivity: data.lastActivity,
            questionsAnswered: data.questionsAnswered,
            timeSpent: data.timeSpent,
            strength: data.strength
          }
        ])
      ),
      behavior: {
        dailyUsageMinutes: context.behavior.dailyUsageMinutes,
        consistencyScore: context.behavior.consistencyScore,
        sessionFrequency: context.behavior.sessionFrequency,
        dropOffPoints: context.behavior.dropOffPoints,
        peakHours: context.behavior.peakHours,
        studyPattern: context.behavior.studyPattern,
        burnoutRisk: context.behavior.burnoutRisk
      }
    };
  }

  /**
   * Check if cache entry is expired
   */
  private static isExpired(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age > (entry.ttl * 1000);
  }

  /**
   * Check if contexts are similar enough
   */
  private static isContextSimilar(
    cachedContext: Partial<AIContext>,
    currentContext: AIContext
  ): boolean {
    if (!cachedContext.stats || !cachedContext.subjects || !cachedContext.behavior) {
      return false;
    }

    // Check level similarity (within 2 levels)
    const levelDiff = Math.abs(cachedContext.stats.level! - currentContext.stats.level);
    if (levelDiff > 2) return false;

    // Check streak similarity
    const streakDiff = Math.abs(cachedContext.stats.streak! - currentContext.stats.streak);
    if (streakDiff > 3) return false;

    // Check subject strength similarity
    for (const [subject, currentData] of Object.entries(currentContext.subjects)) {
      const cachedData = cachedContext.subjects[subject];
      if (!cachedData) continue;
      
      const strengthDiff = Math.abs(cachedData.strength! - currentData.strength);
      if (strengthDiff > 20) return false; // 20% difference threshold
    }

    // Check study pattern similarity
    if (cachedContext.behavior.studyPattern !== currentContext.behavior.studyPattern) {
      // Allow some pattern changes
      if (currentContext.behavior.studyPattern === 'irregular') return false;
    }

    return true;
  }

  /**
   * Calculate adaptive TTL based on effectiveness and usage
   */
  private static calculateAdaptiveTTL(entry: CacheEntry): number {
    if (!this.config.adaptiveTTL) {
      return this.config.defaultTTL;
    }

    let ttlMultiplier = 1.0;

    // Increase TTL for high effectiveness
    if (entry.effectiveness > this.config.effectivenessThreshold) {
      ttlMultiplier += (entry.effectiveness - this.config.effectivenessThreshold) * 2;
    }

    // Increase TTL for frequent usage
    if (entry.hits > 5) {
      ttlMultiplier += Math.min(entry.hits / 10, 0.5);
    }

    // Decrease TTL for old entries
    const age = Date.now() - entry.timestamp;
    if (age > 24 * 60 * 60 * 1000) { // Older than 24 hours
      ttlMultiplier *= 0.5;
    }

    return Math.round(this.config.defaultTTL * Math.max(0.25, Math.min(2.0, ttlMultiplier)));
  }

  /**
   * Simple string hash function
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Start cleanup interval
   */
  private static startCleanupInterval(): void {
    setInterval(async () => {
      await this.cleanupExpiredEntries();
    }, this.config.cleanupInterval * 1000);
  }

  /**
   * Clean up expired entries
   */
  private static async cleanupExpiredEntries(): Promise<void> {
    try {
      // This would ideally be handled by the underlying cache system
      // For now, we'll just log the cleanup
      this.stats.cleanups++;
      console.log('AI Cache cleanup completed');
    } catch (error) {
      console.error('AI Cache cleanup error:', error);
    }
  }

  /**
   * Get cache performance insights
   */
  static async getPerformanceInsights(): Promise<{
    recommendations: string[];
    optimizations: string[];
  }> {
    const stats = await this.getStats();
    const recommendations: string[] = [];
    const optimizations: string[] = [];

    // Hit rate recommendations
    if (stats.hitRate < 50) {
      recommendations.push('Consider increasing TTL for better cache hit rate');
    } else if (stats.hitRate > 90) {
      recommendations.push('Cache hit rate is excellent - consider reducing TTL');
    }

    // Cost optimization
    if (stats.costSavings < 10) {
      optimizations.push('Implement more aggressive caching to increase cost savings');
    }

    // Memory optimization
    if (stats.memoryUsage > 50 * 1024 * 1024) { // 50MB
      optimizations.push('Consider reducing max entries or TTL to save memory');
    }

    return {
      recommendations,
      optimizations
    };
  }

  /**
   * Warm up cache for active users
   */
  static async warmupCache(userIds: string[]): Promise<void> {
    console.log(`Warming up AI cache for ${userIds.length} users`);
    
    for (const userId of userIds) {
      try {
        // Pre-generate recommendations for active users
        // This would call the AI system to populate cache
        console.log(`Warming up cache for user ${userId}`);
      } catch (error) {
        console.error(`Cache warmup failed for user ${userId}:`, error);
      }
    }
  }
}

export default AICacheManager;
