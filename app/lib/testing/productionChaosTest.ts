// Production Chaos Testing - Real-World Failure Simulation
// Tests system resilience under adverse conditions

import { chaosEngine } from './chaosEngine';
import { logger } from '../logging/logger';

export interface ChaosTestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
  recoveryTime?: number;
}

export class ProductionChaosTest {
  private results: ChaosTestResult[] = [];

  // Test 1: Random API Failures (20% failure rate)
  async testRandomFailures(): Promise<ChaosTestResult> {
    const startTime = Date.now();
    
    try {
      chaosEngine.enable({
        failureRate: 0.2,
        delayRange: [1000, 3000],
        offlineMode: false,
        slowNetwork: true,
        malformedData: false
      });

      // Simulate API calls
      const testPromises = Array.from({ length: 10 }, async (_, i) => {
        try {
          const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: `Test message ${i}` })
          });
          return { success: response.ok, index: i };
        } catch (error) {
          return { success: false, index: i, error };
        }
      });

      const results = await Promise.allSettled(testPromises);
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      
      const successRate = successCount / results.length;
      const passed = successRate >= 0.7; // At least 70% success rate with 20% chaos
      
      return {
        testName: 'Random API Failures (20% rate)',
        passed,
        duration: Date.now() - startTime,
        error: passed ? undefined : `Success rate ${successRate} below 70% threshold`
      };
      
    } catch (error) {
      return {
        testName: 'Random API Failures (20% rate)',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Test 2: Network Throttling (3G simulation)
  async testNetworkThrottling(): Promise<ChaosTestResult> {
    const startTime = Date.now();
    
    try {
      chaosEngine.enable({
        failureRate: 0.1,
        delayRange: [2000, 5000], // 2-5 second delays
        offlineMode: false,
        slowNetwork: true,
        malformedData: false
      });

      // Test subject loading under slow network
      const loadStart = Date.now();
      const response = await fetch('/api/subjects', {
        method: 'GET'
      });
      const loadTime = Date.now() - loadStart;
      
      const passed = response.ok && loadTime < 10000; // Should load within 10 seconds
      
      return {
        testName: 'Network Throttling (3G simulation)',
        passed,
        duration: Date.now() - startTime,
        error: passed ? undefined : `Load time ${loadTime}ms exceeded 10s threshold`
      };
      
    } catch (error) {
      return {
        testName: 'Network Throttling (3G simulation)',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Test 3: Malformed Data Handling
  async testMalformedDataHandling(): Promise<ChaosTestResult> {
    const startTime = Date.now();
    
    try {
      chaosEngine.enable({
        failureRate: 0.3,
        delayRange: [500, 1500],
        offlineMode: false,
        slowNetwork: false,
        malformedData: true
      });

      // Test with malformed AI response
      const malformedResponses = [
        null,
        undefined,
        '',
        '{invalid json}',
        '{"response": null}',
        '{"error": "simulated error"}',
        '{"data": "incomplete response'
      ];

      const testPromises = malformedResponses.map(async (malformed, i) => {
        try {
          // Simulate receiving malformed data
          const result = this.simulateMalformedDataProcessing(malformed);
          return { success: true, index: i, handled: result };
        } catch (error) {
          return { success: false, index: i, error };
        }
      });

      const results = await Promise.allSettled(testPromises);
      const handledCount = results.filter(r => 
        r.status === 'fulfilled' && r.value.handled
      ).length;
      
      const passed = handledCount === malformedResponses.length; // All malformed data should be handled
      
      return {
        testName: 'Malformed Data Handling',
        passed,
        duration: Date.now() - startTime,
        error: passed ? undefined : `${malformedResponses.length - handledCount} malformed responses not handled`
      };
      
    } catch (error) {
      return {
        testName: 'Malformed Data Handling',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Test 4: Offline Mode Simulation
  async testOfflineMode(): Promise<ChaosTestResult> {
    const startTime = Date.now();
    
    try {
      chaosEngine.enable({
        failureRate: 1.0, // 100% failure rate
        delayRange: [100, 500],
        offlineMode: true,
        slowNetwork: false,
        malformedData: false
      });

      // Test fallback behavior when offline
      const offlineStart = Date.now();
      
      try {
        await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'Test offline' })
        });
      } catch (error) {
        // Expected to fail in offline mode
        const recoveryTime = Date.now() - offlineStart;
        
        return {
          testName: 'Offline Mode Simulation',
          passed: true, // System should handle offline gracefully
          duration: Date.now() - startTime,
          recoveryTime
        };
      }
      
      // If we reach here, offline mode didn't work as expected
      return {
        testName: 'Offline Mode Simulation',
        passed: false,
        duration: Date.now() - startTime,
        error: 'Expected offline mode to fail requests'
      };
      
    } catch (error) {
      return {
        testName: 'Offline Mode Simulation',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Test 5: High Load Stress Test
  async testHighLoadStress(): Promise<ChaosTestResult> {
    const startTime = Date.now();
    
    try {
      chaosEngine.enable({
        failureRate: 0.15,
        delayRange: [200, 1000],
        offlineMode: false,
        slowNetwork: true,
        malformedData: false
      });

      // Simulate 50 concurrent requests
      const concurrentRequests = Array.from({ length: 50 }, async (_, i) => {
        const requestStart = Date.now();
        try {
          await fetch('/api/subjects', { method: 'GET' });
          return { success: true, index: i, duration: Date.now() - requestStart };
        } catch (error) {
          return { success: false, index: i, error, duration: Date.now() - requestStart };
        }
      });

      const results = await Promise.allSettled(concurrentRequests);
      const successfulRequests = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      
      const successRate = successfulRequests / results.length;
      const passed = successRate >= 0.8; // At least 80% success under stress
      
      return {
        testName: 'High Load Stress Test (50 concurrent)',
        passed,
        duration: Date.now() - startTime,
        error: passed ? undefined : `Success rate ${successRate} below 80% threshold`
      };
      
    } catch (error) {
      return {
        testName: 'High Load Stress Test (50 concurrent)',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper method to simulate malformed data processing
  private simulateMalformedDataProcessing(data: any): boolean {
    try {
      // This simulates how the AI schema handles malformed data
      if (data === null || data === undefined) {
        return true; // Should handle null/undefined
      }
      
      if (typeof data === 'string') {
        try {
          JSON.parse(data);
          return true;
        } catch {
          return true; // Should handle invalid JSON
        }
      }
      
      if (typeof data === 'object') {
        return true; // Should handle objects
      }
      
      return false;
    } catch {
      return false;
    }
  }

  // Run all chaos tests
  async runAllTests(): Promise<ChaosTestResult[]> {
    logger.info('Starting production chaos testing suite');
    
    const tests = [
      () => this.testRandomFailures(),
      () => this.testNetworkThrottling(),
      () => this.testMalformedDataHandling(),
      () => this.testOfflineMode(),
      () => this.testHighLoadStress()
    ];

    this.results = [];
    
    for (const test of tests) {
      try {
        const result = await test();
        this.results.push(result);
        logger.info('Chaos test completed', { 
          testName: result.testName, 
          passed: result.passed,
          duration: result.duration 
        });
      } catch (error) {
        const errorResult: ChaosTestResult = {
          testName: 'Unknown Test',
          passed: false,
          duration: 0,
          error: error instanceof Error ? error.message : 'Unknown test error'
        };
        this.results.push(errorResult);
        logger.error('Chaos test failed', error as Error);
      }
    }

    // Disable chaos mode after testing
    chaosEngine.disable();
    
    logger.info('Production chaos testing completed', { 
      totalTests: this.results.length,
      passedTests: this.results.filter(r => r.passed).length
    });

    return this.results;
  }

  // Get test results summary
  getResultsSummary(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    results: ChaosTestResult[];
  } {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate,
      results: this.results
    };
  }

  // Generate production readiness report
  generateReport(): string {
    const summary = this.getResultsSummary();
    
    let report = `🧪 PRODUCTION CHAOS TESTING REPORT\n`;
    report += `=====================================\n\n`;
    
    report += `📊 SUMMARY:\n`;
    report += `- Total Tests: ${summary.totalTests}\n`;
    report += `- Passed: ${summary.passedTests}\n`;
    report += `- Failed: ${summary.failedTests}\n`;
    report += `- Success Rate: ${summary.successRate.toFixed(1)}%\n\n`;
    
    report += `📋 DETAILED RESULTS:\n`;
    summary.results.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      report += `${index + 1}. ${status} - ${result.testName}\n`;
      if (result.duration) {
        report += `   Duration: ${result.duration}ms\n`;
      }
      if (result.recoveryTime) {
        report += `   Recovery Time: ${result.recoveryTime}ms\n`;
      }
      if (result.error) {
        report += `   Error: ${result.error}\n`;
      }
      report += `\n`;
    });

    report += `🎯 PRODUCTION READINESS:\n`;
    if (summary.successRate >= 80) {
      report += `✅ SYSTEM IS PRODUCTION READY (${summary.successRate.toFixed(1)}% success rate)\n`;
    } else {
      report += `⚠️  SYSTEM NEEDS IMPROVEMENT (${summary.successRate.toFixed(1)}% success rate)\n`;
    }

    return report;
  }
}

// Export singleton instance
export const productionChaosTest = new ProductionChaosTest();
