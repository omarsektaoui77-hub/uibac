// Simple in-memory rate limiting for MVP
// For production with scale, upgrade to Redis-based rate limiting

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export class RateLimiter {
  /**
   * Check if request is within rate limit
   * @param identifier - Unique identifier (IP, email, etc.)
   * @param maxRequests - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   */
  static checkLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    // Clean expired records
    if (record && now > record.resetTime) {
      rateLimitStore.delete(identifier);
    }

    const currentRecord = rateLimitStore.get(identifier);

    if (!currentRecord || now > currentRecord.resetTime) {
      // First request or window expired
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(identifier, newRecord);
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      };
    }

    if (currentRecord.count >= maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: currentRecord.resetTime
      };
    }

    // Increment count
    currentRecord.count++;
    rateLimitStore.set(identifier, currentRecord);

    return {
      allowed: true,
      remaining: maxRequests - currentRecord.count,
      resetTime: currentRecord.resetTime
    };
  }

  /**
   * Check signup rate limit (3 attempts per hour per IP)
   */
  static checkSignupLimit(ip: string): { allowed: boolean; resetTime: number } {
    const result = this.checkLimit(ip, 3, 60 * 60 * 1000); // 3 attempts per hour
    return {
      allowed: result.allowed,
      resetTime: result.resetTime
    };
  }

  /**
   * Check login rate limit (5 attempts per 15 minutes per email)
   */
  static checkLoginLimit(email: string): { allowed: boolean; resetTime: number } {
    const result = this.checkLimit(email, 5, 15 * 60 * 1000); // 5 attempts per 15 min
    return {
      allowed: result.allowed,
      resetTime: result.resetTime
    };
  }

  /**
   * Clean up expired records (call periodically)
   */
  static cleanup() {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }
}

// Cleanup expired records every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => RateLimiter.cleanup(), 5 * 60 * 1000);
}
