// Production-Grade Resiliency & Error Handling System
// Implements retry logic, circuit breakers, and graceful degradation

import { ValidationResult } from './validation';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
  circuitBreakerTripped?: boolean;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

/**
 * Production-grade resiliency system with retry logic and circuit breakers
 */
export class ResiliencySystem {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'NETWORK_ERROR',
      'TIMEOUT',
      'OVERLOADED',
      'RATE_LIMITED'
    ]
  };

  private static readonly DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 300000 // 5 minutes
  };

  private static circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  /**
   * Execute function with retry logic and circuit breaker
   */
  static async executeWithResiliency<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {},
    circuitBreakerConfig: Partial<CircuitBreakerConfig> = {}
  ): Promise<RetryResult<T>> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    const cbConfig = { ...this.DEFAULT_CIRCUIT_BREAKER_CONFIG, ...circuitBreakerConfig };
    
    const startTime = Date.now();
    let lastError: Error | undefined;
    let attempts = 0;

    // Check circuit breaker
    const circuitBreaker = this.getCircuitBreaker(operationName, cbConfig);
    if (this.isCircuitBreakerOpen(circuitBreaker)) {
      return {
        success: false,
        error: new Error(`Circuit breaker open for ${operationName}`),
        attempts: 0,
        totalTime: Date.now() - startTime,
        circuitBreakerTripped: true
      };
    }

    // Execute with retry logic
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      attempts = attempt;
      
      try {
        console.log(`Executing ${operationName}, attempt ${attempt}/${retryConfig.maxAttempts}`);
        
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise(retryConfig.maxDelay)
        ]);

        // Success - reset circuit breaker
        this.recordSuccess(circuitBreaker);
        
        return {
          success: true,
          result,
          attempts,
          totalTime: Date.now() - startTime
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.error(`Attempt ${attempt} failed for ${operationName}:`, lastError.message);
        
        // Record failure
        this.recordFailure(circuitBreaker);
        
        // Check if error is retryable
        if (!this.isRetryableError(lastError, retryConfig.retryableErrors)) {
          console.log(`Non-retryable error for ${operationName}: ${lastError.message}`);
          break;
        }
        
        // Check if we should retry
        if (attempt === retryConfig.maxAttempts) {
          console.log(`Max attempts reached for ${operationName}`);
          break;
        }
        
        // Calculate delay and wait
        const delay = this.calculateDelay(attempt, retryConfig);
        console.log(`Waiting ${delay}ms before retry ${operationName}`);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
      totalTime: Date.now() - startTime,
      circuitBreakerTripped: this.isCircuitBreakerOpen(circuitBreaker)
    };
  }

  /**
   * Execute AI operation with validation and retry
   */
  static async executeAIOperation<T>(
    operation: () => Promise<T>,
    validator: (result: T) => ValidationResult,
    operationName: string,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    return this.executeWithResiliency(
      async () => {
        const result = await operation();
        
        // Validate the result
        const validation = validator(result);
        
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        
        if (validation.score < 70) {
          console.warn(`Low quality score (${validation.score}) for ${operationName}: ${validation.warnings.join(', ')}`);
        }
        
        return result;
      },
      operationName,
      {
        ...config,
        retryableErrors: [
          ...this.DEFAULT_RETRY_CONFIG.retryableErrors,
          'VALIDATION_FAILED',
          'LOW_QUALITY',
          'BROKEN_JSON'
        ]
      }
    );
  }

  /**
   * Execute with fallback chain
   */
  static async executeWithFallback<T>(
    operations: Array<{ name: string; fn: () => Promise<T>; validator?: (result: T) => ValidationResult }>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    let lastError: Error | undefined;
    let totalAttempts = 0;
    let totalTime = 0;

    for (const { name, fn, validator } of operations) {
      const startTime = Date.now();
      
      try {
        const result = validator 
          ? await this.executeAIOperation(fn, validator, name, config)
          : await this.executeWithResiliency(fn, name, config);

        if (result.success) {
          return {
            ...result,
            attempts: totalAttempts + result.attempts,
            totalTime: totalTime + result.totalTime
          };
        }

        lastError = result.error;
        totalAttempts += result.attempts;
        totalTime += result.totalTime;
        
        console.warn(`Fallback ${name} failed, trying next option`);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        totalAttempts++;
        totalTime += Date.now() - startTime;
        
        console.warn(`Fallback ${name} threw error:`, lastError.message);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: totalAttempts,
      totalTime
    };
  }

  /**
   * Get or create circuit breaker for operation
   */
  private static getCircuitBreaker(operationName: string, config: CircuitBreakerConfig): CircuitBreakerState {
    if (!this.circuitBreakers.has(operationName)) {
      this.circuitBreakers.set(operationName, {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0
      });
    }
    return this.circuitBreakers.get(operationName)!;
  }

  /**
   * Check if circuit breaker is open
   */
  private static isCircuitBreakerOpen(circuitBreaker: CircuitBreakerState): boolean {
    const now = Date.now();
    
    if (circuitBreaker.isOpen) {
      if (now >= circuitBreaker.nextAttemptTime) {
        // Try to close circuit breaker
        circuitBreaker.isOpen = false;
        circuitBreaker.failureCount = 0;
        console.log('Circuit breaker attempting to close');
        return false;
      }
      return true;
    }
    
    return false;
  }

  /**
   * Record success for circuit breaker
   */
  private static recordSuccess(circuitBreaker: CircuitBreakerState): void {
    if (circuitBreaker.isOpen) {
      circuitBreaker.isOpen = false;
      circuitBreaker.failureCount = 0;
      console.log('Circuit breaker closed due to success');
    }
  }

  /**
   * Record failure for circuit breaker
   */
  private static recordFailure(circuitBreaker: CircuitBreakerState, threshold: number = 5): void {
    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = Date.now();
    
    if (circuitBreaker.failureCount >= threshold) {
      circuitBreaker.isOpen = true;
      circuitBreaker.nextAttemptTime = Date.now() + 60000; // 1 minute recovery
      console.log(`Circuit breaker opened after ${circuitBreaker.failureCount} failures`);
    }
  }

  /**
   * Check if error is retryable
   */
  private static isRetryableError(error: Error, retryableErrors: string[]): boolean {
    const errorMessage = error.message.toUpperCase();
    
    // Check against known retryable errors
    for (const retryableError of retryableErrors) {
      if (errorMessage.includes(retryableError)) {
        return true;
      }
    }
    
    // Check for network-related errors
    if (errorMessage.includes('NETWORK') || 
        errorMessage.includes('CONNECTION') || 
        errorMessage.includes('TIMEOUT')) {
      return true;
    }
    
    // Check for AI model specific errors
    if (errorMessage.includes('OVERLOADED') || 
        errorMessage.includes('RATE_LIMIT') || 
        errorMessage.includes('MODEL_UNAVAILABLE')) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, config.maxDelay);
    
    if (config.jitter) {
      // Add jitter to prevent thundering herd
      const jitterRange = delay * 0.1;
      delay += Math.random() * jitterRange - jitterRange / 2;
    }
    
    return Math.max(0, Math.floor(delay));
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create timeout promise
   */
  private static createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });
  }

  /**
   * Get circuit breaker statistics
   */
  static getCircuitBreakerStats(): Record<string, CircuitBreakerState> {
    const stats: Record<string, CircuitBreakerState> = {};
    
    for (const [name, state] of this.circuitBreakers.entries()) {
      stats[name] = { ...state };
    }
    
    return stats;
  }

  /**
   * Reset circuit breaker
   */
  static resetCircuitBreaker(operationName: string): void {
    this.circuitBreakers.delete(operationName);
  }

  /**
   * Reset all circuit breakers
   */
  static resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }

  /**
   * Health check for all circuit breakers
   */
  static healthCheck(): {
    healthy: boolean;
    openCircuitBreakers: string[];
    totalOperations: number;
  } {
    const openCircuitBreakers: string[] = [];
    
    for (const [name, state] of this.circuitBreakers.entries()) {
      if (this.isCircuitBreakerOpen(state)) {
        openCircuitBreakers.push(name);
      }
    }
    
    return {
      healthy: openCircuitBreakers.length === 0,
      openCircuitBreakers,
      totalOperations: this.circuitBreakers.size
    };
  }
}

/**
 * Specialized retry configurations for different operations
 */
export const RetryConfigs = {
  // Local AI operations (more forgiving)
  LOCAL_AI: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'MODEL_UNAVAILABLE', 'OVERLOADED']
  },

  // Database operations (faster retry)
  DATABASE: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitter: false,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'CONNECTION_LOST']
  },

  // External API calls (more conservative)
  EXTERNAL_API: {
    maxAttempts: 2,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ['ETIMEDOUT', 'RATE_LIMITED', 'NETWORK_ERROR']
  },

  // File operations (quick retry)
  FILE_OPERATIONS: {
    maxAttempts: 2,
    baseDelay: 200,
    maxDelay: 2000,
    backoffMultiplier: 1.5,
    jitter: false,
    retryableErrors: ['ENOENT', 'EACCES', 'EMFILE']
  }
};

/**
 * Circuit breaker configurations for different services
 */
export const CircuitBreakerConfigs = {
  // Local AI - more tolerant
  LOCAL_AI: {
    failureThreshold: 3,
    recoveryTimeout: 30000, // 30 seconds
    monitoringPeriod: 120000 // 2 minutes
  },

  // Database - less tolerant
  DATABASE: {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 300000 // 5 minutes
  },

  // External APIs - very conservative
  EXTERNAL_API: {
    failureThreshold: 2,
    recoveryTimeout: 120000, // 2 minutes
    monitoringPeriod: 600000 // 10 minutes
  }
};

export default ResiliencySystem;
