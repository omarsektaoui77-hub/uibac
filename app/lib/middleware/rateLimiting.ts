// Rate Limiting Middleware
// Prevents abuse and ensures fair usage

import { NextRequest } from 'next/server';
import { headers } from 'next/headers';

export interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

/**
 * In-memory rate limiting store for development
 * In production, use Redis or similar
 */
class InMemoryRateLimitStore {
  private store = new Map<string, { count: number; resetTime: Date; window: number }>();

  async increment(key: string, limit: number, window: number): Promise<RateLimitResult> {
    const now = new Date();
    const existing = this.store.get(key);

    if (!existing || now > existing.resetTime) {
      // New window
      const resetTime = new Date(now.getTime() + window * 1000);
      this.store.set(key, { count: 1, resetTime, window });
      
      return {
        success: true,
        limit,
        remaining: limit - 1,
        resetTime
      };
    }

    // Existing window
    const newCount = existing.count + 1;
    const success = newCount <= limit;
    
    this.store.set(key, { ...existing, count: newCount });

    return {
      success,
      limit,
      remaining: Math.max(0, limit - newCount),
      resetTime: existing.resetTime,
      retryAfter: success ? undefined : Math.ceil((existing.resetTime.getTime() - now.getTime()) / 1000)
    };
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = new Date();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const rateLimitStore = new InMemoryRateLimitStore();

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => rateLimitStore.cleanup(), 5 * 60 * 1000);
}

/**
 * Rate limiting middleware
 */
export class RateLimitMiddleware {
  /**
   * Check rate limit for a given key
   */
  static async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    return rateLimitStore.increment(key, config.requests, config.window);
  }

  /**
   * Generate rate limit key from request
   */
  static generateKey(request: NextRequest, prefix: string = 'rl'): string {
    // Try to get user ID from auth header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        return `${prefix}:user:${payload.uid}`;
      } catch {
        // Invalid token, fall back to IP
      }
    }

    // Fall back to IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
    return `${prefix}:ip:${ip}`;
  }

  /**
   * Apply rate limiting to API route
   */
  static async applyRateLimit(
    request: NextRequest,
    config: RateLimitConfig,
    keyPrefix: string = 'api'
  ): Promise<{ success: boolean; response?: Response }> {
    const key = this.generateKey(request, keyPrefix);
    const result = await this.checkRateLimit(key, config);

    if (!result.success) {
      const response = new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime.toISOString(),
          retryAfter: result.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.getTime().toString(),
            'Retry-After': result.retryAfter?.toString() || '60'
          }
        }
      );

      return { success: false, response };
    }

    return { success: true };
  }

  /**
   * Rate limiting configurations for different endpoints
   */
  static readonly CONFIGS = {
    // Progress updates - most restrictive
    progress: {
      requests: 100,
      window: 3600 // 100 requests per hour
    },

    // User profile updates
    profile: {
      requests: 50,
      window: 3600 // 50 requests per hour
    },

    // Analytics queries
    analytics: {
      requests: 200,
      window: 3600 // 200 requests per hour
    },

    // Leaderboard queries
    leaderboard: {
      requests: 300,
      window: 3600 // 300 requests per hour
    },

    // General API
    general: {
      requests: 1000,
      window: 3600 // 1000 requests per hour
    },

    // Admin endpoints - very restrictive
    admin: {
      requests: 50,
      window: 3600 // 50 requests per hour
    }
  };

  /**
   * Get config for endpoint based on user tier
   */
  static getConfigForUser(
    endpoint: keyof typeof RateLimitMiddleware.CONFIGS,
    isPremium: boolean = false,
    isBasic: boolean = false
  ): RateLimitConfig {
    const baseConfig = this.CONFIGS[endpoint] || this.CONFIGS.general;
    
    const multiplier = isPremium ? 5 : isBasic ? 2 : 1;
    
    return {
      ...baseConfig,
      requests: baseConfig.requests * multiplier
    };
  }
}

/**
 * Higher-order function to apply rate limiting to API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  keyPrefix: string = 'api'
) {
  return function (handler: (request: NextRequest) => Promise<Response>) {
    return async (request: NextRequest): Promise<Response> => {
      const rateLimitResult = await RateLimitMiddleware.applyRateLimit(request, config, keyPrefix);
      
      if (!rateLimitResult.success && rateLimitResult.response) {
        return rateLimitResult.response;
      }

      return handler(request);
    };
  };
}

/**
 * Rate limiting with user tier consideration
 */
export function withTieredRateLimit(
  endpoint: keyof typeof RateLimitMiddleware.CONFIGS,
  keyPrefix: string = 'api'
) {
  return function (handler: (request: NextRequest, user?: any) => Promise<Response>) {
    return async (request: NextRequest): Promise<Response> => {
      // Extract user info for tier determination
      let isPremium = false;
      let isBasic = false;
      
      try {
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const payload = JSON.parse(atob(token.split('.')[1]));
          
          // Check custom claims for subscription tier
          isPremium = payload.customClaims?.subscription?.tier === 'premium';
          isBasic = payload.customClaims?.subscription?.tier === 'basic';
        }
      } catch {
        // Invalid token, use free tier limits
      }

      const config = RateLimitMiddleware.getConfigForUser(endpoint, isPremium, isBasic);
      const rateLimitResult = await RateLimitMiddleware.applyRateLimit(request, config, keyPrefix);
      
      if (!rateLimitResult.success && rateLimitResult.response) {
        return rateLimitResult.response;
      }

      return handler(request);
    };
  };
}

/**
 * Rate limiting for specific actions (e.g., XP earning)
 */
export function withActionRateLimit(
  action: string,
  config: RateLimitConfig
) {
  return function (handler: (request: NextRequest) => Promise<Response>) {
    return async (request: NextRequest): Promise<Response> => {
      const keyPrefix = `action:${action}`;
      const rateLimitResult = await RateLimitMiddleware.applyRateLimit(request, config, keyPrefix);
      
      if (!rateLimitResult.success && rateLimitResult.response) {
        return rateLimitResult.response;
      }

      return handler(request);
    };
  };
}

export default RateLimitMiddleware;
