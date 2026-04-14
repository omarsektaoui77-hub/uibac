// Cache Manager for Performance Optimization
// Multi-tier caching with Redis fallback to in-memory

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  priority?: 'low' | 'medium' | 'high';
  compress?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  priority: string;
  compressed?: boolean;
  hits: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  entriesByTag: Record<string, number>;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Cache Manager with Redis and in-memory fallback
 */
export class CacheManager {
  private static memoryCache = new Map<string, CacheEntry<any>>();
  private static redisAvailable = false;
  private static maxMemoryEntries = 1000;
  private static defaultTTL = 300; // 5 minutes
  
  // Statistics
  private static stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };

  /**
   * Initialize cache manager
   */
  static async initialize(): Promise<void> {
    try {
      // Try to connect to Redis
      if (process.env.REDIS_URL) {
        const Redis = await import('redis');
        const redis = Redis.createClient({
          url: process.env.REDIS_URL,
          socket: {
            connectTimeout: 5000
          }
        });

        await redis.connect();
        this.redisAvailable = true;
        console.log('Redis cache connected');
      }
    } catch (error) {
      console.warn('Redis not available, using in-memory cache:', error);
      this.redisAvailable = false;
    }

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      // Try Redis first
      if (this.redisAvailable) {
        const redisValue = await this.getFromRedis<T>(key);
        if (redisValue !== null) {
          this.stats.hits++;
          return redisValue;
        }
      }

      // Fallback to memory cache
      const memoryValue = this.getFromMemory<T>(key);
      if (memoryValue !== null) {
        this.stats.hits++;
        
        // Sync to Redis if available
        if (this.redisAvailable) {
          await this.setToRedis(key, memoryValue);
        }
        
        return memoryValue;
      }

      this.stats.misses++;
      return null;

    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    } finally {
      // Log slow cache operations
      const duration = Date.now() - startTime;
      if (duration > 100) {
        console.warn(`Slow cache operation: ${key} took ${duration}ms`);
      }
    }
  }

  /**
   * Set value in cache
   */
  static async set<T>(
    key: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    const startTime = Date.now();
    const ttl = options.ttl || this.defaultTTL;

    try {
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        tags: options.tags || [],
        priority: options.priority || 'medium',
        compressed: options.compress || false,
        hits: 0,
        lastAccessed: Date.now()
      };

      // Set in Redis if available
      if (this.redisAvailable) {
        await this.setToRedis(key, entry);
      }

      // Always set in memory cache
      this.setToMemory(key, entry);

      this.stats.sets++;

    } catch (error) {
      console.error('Cache set error:', error);
    } finally {
      const duration = Date.now() - startTime;
      if (duration > 100) {
        console.warn(`Slow cache set: ${key} took ${duration}ms`);
      }
    }
  }

  /**
   * Delete value from cache
   */
  static async delete(key: string): Promise<void> {
    try {
      // Delete from Redis
      if (this.redisAvailable) {
        await this.deleteFromRedis(key);
      }

      // Delete from memory
      this.memoryCache.delete(key);
      this.stats.deletes++;

    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  static async invalidateByTag(tag: string): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      // Find entries with matching tags in memory
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.tags.includes(tag)) {
          keysToDelete.push(key);
        }
      }

      // Delete from memory
      for (const key of keysToDelete) {
        this.memoryCache.delete(key);
      }

      // Delete from Redis if available
      if (this.redisAvailable) {
        await this.invalidateByTagInRedis(tag);
      }

      console.log(`Invalidated ${keysToDelete.length} cache entries for tag: ${tag}`);

    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Clear all cache
   */
  static async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear Redis if available
      if (this.redisAvailable) {
        await this.clearRedis();
      }

      console.log('Cache cleared');

    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): CacheStats {
    const now = Date.now();
    const entries = Array.from(this.memoryCache.values());
    
    let oldestEntry = now;
    let newestEntry = 0;
    let memoryUsage = 0;
    const entriesByTag: Record<string, number> = {};

    for (const entry of entries) {
      oldestEntry = Math.min(oldestEntry, entry.timestamp);
      newestEntry = Math.max(newestEntry, entry.timestamp);
      
      // Estimate memory usage
      memoryUsage += JSON.stringify(entry.data).length;
      
      // Count by tags
      for (const tag of entry.tags) {
        entriesByTag[tag] = (entriesByTag[tag] || 0) + 1;
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      totalEntries: this.memoryCache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate,
      memoryUsage,
      entriesByTag,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Warm up cache with common data
   */
  static async warmup(userId: string): Promise<void> {
    try {
      // Cache user profile
      const { AtomicOperationsManager } = await import('@/app/lib/database/atomicOperations');
      const userProgress = await AtomicOperationsManager.getUserProgress(userId);
      
      if (userProgress) {
        await this.set(`user:${userId}`, userProgress, { ttl: 600, tags: ['user'] });
      }

      // Cache user analytics
      const { ProgressAnalytics } = await import('@/app/lib/analytics/progressAnalytics');
      const analytics = await ProgressAnalytics.getUserAnalytics(userId);
      
      if (analytics) {
        await this.set(`analytics:${userId}`, analytics, { ttl: 300, tags: ['analytics'] });
      }

      console.log(`Cache warmed up for user: ${userId}`);

    } catch (error) {
      console.error('Cache warmup error:', error);
    }
  }

  // Private methods for memory cache
  private static getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.memoryCache.delete(key);
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  private static setToMemory<T>(key: string, entry: CacheEntry<T>): void {
    // Check memory limit
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      this.evictLeastUsed();
    }

    this.memoryCache.set(key, entry);
  }

  private static evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastUsedTime = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < leastUsedTime) {
        leastUsedTime = entry.lastAccessed;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.memoryCache.delete(leastUsedKey);
    }
  }

  // Private methods for Redis (placeholder implementations)
  private static async getFromRedis<T>(key: string): Promise<T | null> {
    // Redis implementation would go here
    return null;
  }

  private static async setToRedis<T>(key: string, value: T): Promise<void> {
    // Redis implementation would go here
  }

  private static async deleteFromRedis(key: string): Promise<void> {
    // Redis implementation would go here
  }

  private static async invalidateByTagInRedis(tag: string): Promise<void> {
    // Redis implementation would go here
  }

  private static async clearRedis(): Promise<void> {
    // Redis implementation would go here
  }

  /**
   * Cleanup expired entries
   */
  private static cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.memoryCache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Start cleanup interval
   */
  private static startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Cleanup every minute
  }
}

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  keyGenerator: (...args: Parameters<T>) => string,
  options: CacheOptions = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>): Promise<ReturnType<T>> {
      const key = keyGenerator(...args);
      
      // Try to get from cache
      const cached = await CacheManager.get<ReturnType<T>>(key);
      if (cached !== null) {
        return cached;
      }

      // Execute function and cache result
      const result = await method.apply(this, args);
      await CacheManager.set(key, result, options);
      
      return result;
    };

    return descriptor;
  };
}

/**
 * Cache helper functions
 */
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userProfile: (userId: string) => `user_profile:${userId}`,
  userAnalytics: (userId: string) => `analytics:${userId}`,
  userProgress: (userId: string) => `progress:${userId}`,
  leaderboard: (type: string, subjectId?: string) => `leaderboard:${type}${subjectId ? `:${subjectId}` : ''}`,
  insights: (userId: string) => `insights:${userId}`,
  rankProgress: (userId: string) => `rank_progress:${userId}`,
  streakData: (userId: string) => `streak:${userId}`
};

export const CacheTags = {
  user: 'user',
  analytics: 'analytics',
  leaderboard: 'leaderboard',
  insights: 'insights',
  progress: 'progress',
  rank: 'rank',
  streak: 'streak'
};

export default CacheManager;
