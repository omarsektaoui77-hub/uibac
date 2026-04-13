// Chaos Testing Engine
// Simulates real-world failure conditions for testing

import { logger } from '../logging/logger';

export interface ChaosConfig {
  failureRate: number; // 0.0 to 1.0
  delayRange: [number, number]; // min/max delay in ms
  offlineMode: boolean;
  slowNetwork: boolean;
  malformedData: boolean;
}

export class ChaosEngine {
  private static instance: ChaosEngine;
  private config: ChaosConfig;
  private enabled: boolean = false;

  constructor() {
    this.config = {
      failureRate: 0.2, // 20% failure rate
      delayRange: [1000, 5000], // 1-5 second delays
      offlineMode: false,
      slowNetwork: false,
      malformedData: false
    };
  }

  static getInstance(): ChaosEngine {
    if (!ChaosEngine.instance) {
      ChaosEngine.instance = new ChaosEngine();
    }
    return ChaosEngine.instance;
  }

  enable(config: Partial<ChaosConfig> = {}) {
    this.config = { ...this.config, ...config };
    this.enabled = true;
    logger.warn('Chaos mode enabled', { config: this.config });
  }

  disable() {
    this.enabled = false;
    logger.info('Chaos mode disabled');
  }

  getConfig(): ChaosConfig {
    return { ...this.config };
  }

  // Simulate API failure
  async simulateApiCall<T>(
    apiCall: () => Promise<T>,
    context?: string
  ): Promise<T> {
    if (!this.enabled) {
      return apiCall();
    }

    const shouldFail = Math.random() < this.config.failureRate;
    const shouldDelay = this.config.slowNetwork || Math.random() < 0.3;

    try {
      // Add delay if configured
      if (shouldDelay) {
        const delay = this.randomDelay();
        logger.debug(`Chaos: Adding delay ${delay}ms`, { context });
        await this.sleep(delay);
      }

      // Simulate offline mode
      if (this.config.offlineMode && Math.random() < 0.5) {
        throw new Error('Network unavailable (chaos test)');
      }

      // Execute actual call
      const result = await apiCall();

      // Simulate malformed data
      if (this.config.malformedData && Math.random() < 0.3) {
        logger.warn('Chaos: Injecting malformed data', { context });
        throw new Error('Malformed data received (chaos test)');
      }

      // Simulate failure
      if (shouldFail) {
        logger.warn('Chaos: Simulating API failure', { context });
        throw new Error('Simulated API failure (chaos test)');
      }

      return result;
    } catch (error) {
      logger.error('Chaos: API call failed', error as Error, { context });
      throw error;
    }
  }

  // Simulate data validation failure
  simulateDataValidation<T>(data: T): T | null {
    if (!this.enabled || !this.config.malformedData) {
      return data;
    }

    if (Math.random() < 0.3) {
      logger.warn('Chaos: Simulating data validation failure');
      return null;
    }

    return data;
  }

  // Simulate slow network
  async simulateSlowNetwork(): Promise<void> {
    if (!this.enabled || !this.config.slowNetwork) {
      return;
    }

    const delay = this.randomDelay();
    logger.debug(`Chaos: Simulating slow network ${delay}ms`);
    await this.sleep(delay);
  }

  // Simulate partial response
  simulatePartialResponse<T>(data: T): Partial<T> {
    if (!this.enabled || Math.random() > 0.2) {
      return data;
    }

    logger.warn('Chaos: Simulating partial response');
    
    // Remove 20-80% of properties
    const entries = Object.entries(data as any);
    const keepCount = Math.floor(entries.length * (0.2 + Math.random() * 0.6));
    const kept = entries.slice(0, keepCount);
    
    return Object.fromEntries(kept) as Partial<T>;
  }

  private randomDelay(): number {
    const [min, max] = this.config.delayRange;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get chaos statistics
  getStats() {
    return {
      enabled: this.enabled,
      config: this.config,
      uptime: process.uptime(),
    };
  }
}

// Export singleton instance
export const chaosEngine = ChaosEngine.getInstance();

// Export convenience functions
export const enableChaos = (config?: Partial<ChaosConfig>) => chaosEngine.enable(config);
export const disableChaos = () => chaosEngine.disable();
export const simulateApiCall = <T>(apiCall: () => Promise<T>, context?: string) => 
  chaosEngine.simulateApiCall(apiCall, context);
export const simulateDataValidation = <T>(data: T) => chaosEngine.simulateDataValidation(data);
export const simulateSlowNetwork = () => chaosEngine.simulateSlowNetwork();
export const simulatePartialResponse = <T>(data: T) => chaosEngine.simulatePartialResponse(data);
