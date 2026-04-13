// Cached Database Operations
// Wraps atomic operations with caching layer for performance

import { CacheManager, CacheKeys, CacheTags } from '@/app/lib/cache/cacheManager';
import { AtomicOperationsManager } from '@/app/lib/database/atomicOperations';
import { UserProgress } from '@/app/lib/gamification/userSchema';
import { ProgressCalculationInput } from '@/app/lib/gamification/progressCalculator';
import { AtomicUpdateResult } from '@/app/lib/database/atomicOperations';

/**
 * Cached operations manager
 * Provides cached versions of database operations
 */
export class CachedOperationsManager {
  /**
   * Get user progress with caching
   */
  static async getUserProgress(userId: string): Promise<UserProgress | null> {
    // Try cache first
    const cached = await CacheManager.get<UserProgress>(CacheKeys.userProgress(userId));
    if (cached !== null) {
      return cached;
    }

    // Get from database
    const userProgress = await AtomicOperationsManager.getUserProgress(userId);
    
    if (userProgress) {
      // Cache for 5 minutes
      await CacheManager.set(CacheKeys.userProgress(userId), userProgress, {
        ttl: 300,
        tags: [CacheTags.user, CacheTags.progress]
      });
    }

    return userProgress;
  }

  /**
   * Update progress with cache invalidation
   */
  static async updateProgressAtomic(
    userId: string,
    input: ProgressCalculationInput,
    sessionId: string,
    metadata: {
      userAgent?: string;
      ipAddress?: string;
    } = {}
  ): Promise<AtomicUpdateResult> {
    // Perform atomic update
    const result = await AtomicOperationsManager.updateProgressAtomic(
      userId,
      input,
      sessionId,
      metadata
    );

    if (result.success && result.user) {
      // Update cache with new data
      await CacheManager.set(CacheKeys.userProgress(userId), result.user, {
        ttl: 300,
        tags: [CacheTags.user, CacheTags.progress]
      });

      // Invalidate related caches
      await this.invalidateUserCaches(userId);
    }

    return result;
  }

  /**
   * Get user analytics with caching
   */
  static async getUserAnalytics(userId: string): Promise<any> {
    // Try cache first
    const cached = await CacheManager.get(CacheKeys.userAnalytics(userId));
    if (cached !== null) {
      return cached;
    }

    // Get from database
    const { ProgressAnalytics } = await import('@/app/lib/analytics/progressAnalytics');
    const analytics = await ProgressAnalytics.getUserAnalytics(userId);
    
    if (analytics) {
      // Cache for 3 minutes
      await CacheManager.set(CacheKeys.userAnalytics(userId), analytics, {
        ttl: 180,
        tags: [CacheTags.user, CacheTags.analytics]
      });
    }

    return analytics;
  }

  /**
   * Get leaderboard with caching
   */
  static async getLeaderboard(
    type: 'xp' | 'level' | 'streak' | 'accuracy',
    subjectId?: string,
    limit: number = 50
  ): Promise<Array<{
    userId: string;
    value: number;
    rank: number;
    metadata?: any;
  }>> {
    const cacheKey = CacheKeys.leaderboard(type, subjectId);
    
    // Try cache first
    const cached = await CacheManager.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Get from database
    const { ProgressAnalytics } = await import('@/app/lib/analytics/progressAnalytics');
    const leaderboard = await ProgressAnalytics.getLeaderboard(type, subjectId, limit);
    
    // Cache for 10 minutes
    await CacheManager.set(cacheKey, leaderboard || [], {
      ttl: 600,
      tags: [CacheTags.leaderboard]
    });

    return leaderboard || [];
  }

  /**
   * Get user insights with caching
   */
  static async getUserInsights(userId: string, limit: number = 10): Promise<any[]> {
    const cacheKey = CacheKeys.insights(userId);
    
    // Try cache first
    const cached = await CacheManager.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Get from database
    const { ProgressAnalytics } = await import('@/app/lib/analytics/progressAnalytics');
    const insights = await ProgressAnalytics.getUserInsights(userId, limit);
    
    // Cache for 5 minutes
    await CacheManager.set(cacheKey, insights || [], {
      ttl: 300,
      tags: [CacheTags.user, CacheTags.insights]
    });

    return insights || [];
  }

  /**
   * Warm up cache for a user
   */
  static async warmupUserCache(userId: string): Promise<void> {
    await CacheManager.warmup(userId);
    
    // Preload common data
    await Promise.all([
      this.getUserProgress(userId),
      this.getUserAnalytics(userId),
      this.getUserInsights(userId)
    ]);
  }

  /**
   * Invalidate all user-related caches
   */
  static async invalidateUserCaches(userId: string): Promise<void> {
    const tags = [CacheTags.user, CacheTags.progress, CacheTags.analytics, CacheTags.insights];
    
    for (const tag of tags) {
      await CacheManager.invalidateByTag(`${tag}:${userId}`);
    }

    // Also invalidate leaderboard as user position might have changed
    await CacheManager.invalidateByTag(CacheTags.leaderboard);
  }

  /**
   * Batch invalidate caches for multiple users
   */
  static async invalidateMultipleUserCaches(userIds: string[]): Promise<void> {
    const promises = userIds.map(userId => this.invalidateUserCaches(userId));
    await Promise.allSettled(promises);
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<any> {
    return CacheManager.getStats();
  }

  /**
   * Clear all caches
   */
  static async clearAllCaches(): Promise<void> {
    await CacheManager.clear();
  }
}

export default CachedOperationsManager;
