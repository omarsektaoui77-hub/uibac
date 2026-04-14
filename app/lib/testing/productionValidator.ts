// Production Validation System
// Comprehensive testing for production readiness

import { logger } from '../logging/logger';
import { chaosEngine, ChaosConfig } from './chaosEngine';
import { getBuildInfo, validateDeployment } from '../deployment/buildInfo';
import { getSubjects, getCommonSubjects, getSMSubjects } from '../data/subjectsService';
import { aiDataAdapter } from '../ai/aiDataAdapter';

export interface ValidationResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  duration?: number;
}

export interface ValidationReport {
  timestamp: string;
  buildInfo: any;
  results: ValidationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    score: number; // 0-100
  };
  totalDuration?: number;
}

export class ProductionValidator {
  private static instance: ProductionValidator;
  private results: ValidationResult[] = [];

  static getInstance(): ProductionValidator {
    if (!ProductionValidator.instance) {
      ProductionValidator.instance = new ProductionValidator();
    }
    return ProductionValidator.instance;
  }

  private addResult(result: ValidationResult) {
    this.results.push(result);
    logger.info(`Validation: ${result.category} - ${result.test}`, { 
      status: result.status, 
      message: result.message 
    });
  }

  private async measureTime<T>(testName: string, fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    logger.debug(`Test completed: ${testName}`, { duration: `${duration.toFixed(2)}ms` });
    
    return { result, duration };
  }

  // 1. Deployment Integrity Tests
  async validateDeploymentIntegrity(): Promise<void> {
    const { result: buildInfo, duration } = await this.measureTime(
      'build-info',
      () => Promise.resolve(getBuildInfo())
    );

    this.addResult({
      category: 'Deployment',
      test: 'Build Information',
      status: buildInfo.commitSha !== 'unknown' ? 'pass' : 'warning',
      message: buildInfo.commitSha !== 'unknown' 
        ? `Build info available (SHA: ${buildInfo.commitSha.substring(0, 8)})`
        : 'Build info not available',
      details: buildInfo,
      duration
    });

    // Test deployment validation
    const isValid = validateDeployment(buildInfo.commitSha);
    this.addResult({
      category: 'Deployment',
      test: 'Version Validation',
      status: isValid ? 'pass' : 'fail',
      message: isValid ? 'Deployment version matches expected' : 'Version mismatch detected',
      duration
    });
  }

  // 2. Hydration & Rendering Tests
  async validateHydration(): Promise<void> {
    // Test client-side rendering
    const { result: isClient, duration } = await this.measureTime(
      'client-check',
      () => Promise.resolve(typeof window !== 'undefined')
    );

    this.addResult({
      category: 'Hydration',
      test: 'Client Environment',
      status: isClient ? 'pass' : 'warning',
      message: isClient ? 'Running in client environment' : 'Running in server environment',
      duration
    });

    // Test React hydration
    if (isClient) {
      const { result: hasReact, duration: reactDuration } = await this.measureTime(
        'react-check',
        () => Promise.resolve(typeof window !== 'undefined' && window.React)
      );

      this.addResult({
        category: 'Hydration',
        test: 'React Available',
        status: hasReact ? 'pass' : 'fail',
        message: hasReact ? 'React is available' : 'React not available',
        duration: reactDuration
      });
    }
  }

  // 3. Self-Healing System Tests
  async validateSelfHealing(): Promise<void> {
    // Enable chaos mode for testing
    chaosEngine.enable({
      failureRate: 0.3, // 30% failure rate for testing
      delayRange: [500, 2000],
      slowNetwork: true
    });

    let successCount = 0;
    let failureCount = 0;
    const testRuns = 10;

    for (let i = 0; i < testRuns; i++) {
      try {
        const { result } = await this.measureTime(
          `api-test-${i}`,
          () => getCommonSubjects()
        );
        
        if (result && result.length > 0) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        failureCount++;
      }
    }

    // Disable chaos mode
    chaosEngine.disable();

    const successRate = (successCount / testRuns) * 100;
    this.addResult({
      category: 'Self-Healing',
      test: 'Failure Recovery',
      status: successRate >= 60 ? 'pass' : successRate >= 40 ? 'warning' : 'fail',
      message: `Success rate: ${successRate.toFixed(1)}% (${successCount}/${testRuns})`,
      details: { successCount, failureCount, successRate }
    });
  }

  // 4. Data Validation Tests
  async validateDataLayer(): Promise<void> {
    // Test normal data loading
    const { result: subjects, duration } = await this.measureTime(
      'data-loading',
      () => getSubjects()
    );

    const hasData = subjects && subjects.common && subjects.SM && 
                   subjects.common.length > 0 && subjects.SM.subjects.length > 0;

    this.addResult({
      category: 'Data',
      test: 'Data Loading',
      status: hasData ? 'pass' : 'fail',
      message: hasData 
        ? `Data loaded successfully (${subjects.common.length + subjects.SM.subjects.length} subjects)`
        : 'Failed to load subject data',
      details: subjects,
      duration
    });

    // Test malformed data handling
    const malformedData = { invalid: 'data' };
    const { result: validation, duration: validationDuration } = await this.measureTime(
      'validation-test',
      () => Promise.resolve(aiDataAdapter.validateSubject(malformedData))
    );

    this.addResult({
      category: 'Data',
      test: 'Malformed Data Handling',
      status: validation === null ? 'pass' : 'fail',
      message: validation === null 
        ? 'Malformed data correctly rejected'
        : 'Malformed data was accepted (security risk)',
      duration: validationDuration
    });
  }

  // 5. Navigation & State Tests
  async validateNavigation(): Promise<void> {
    // Test language switching
    const { result: hasLocale, duration } = await this.measureTime(
      'locale-check',
      () => Promise.resolve(typeof navigator !== 'undefined' && navigator.language)
    );

    this.addResult({
      category: 'Navigation',
      test: 'Locale Support',
      status: hasLocale ? 'pass' : 'warning',
      message: hasLocale ? `Locale detected: ${navigator.language}` : 'Locale not detected',
      duration
    });

    // Test route persistence (simulated)
    const { result: hasHistory, duration: historyDuration } = await this.measureTime(
      'history-check',
      () => Promise.resolve(typeof window !== 'undefined' && window.history)
    );

    this.addResult({
      category: 'Navigation',
      test: 'History API',
      status: hasHistory ? 'pass' : 'warning',
      message: hasHistory ? 'History API available' : 'History API not available',
      duration: historyDuration
    });
  }

  // 6. Performance Tests
  async validatePerformance(): Promise<void> {
    // Test data loading performance
    const { result: _, duration: loadDuration } = await this.measureTime(
      'performance-test',
      () => getCommonSubjects()
    );

    const isFast = loadDuration < 1000; // Under 1 second
    this.addResult({
      category: 'Performance',
      test: 'Data Loading Speed',
      status: isFast ? 'pass' : loadDuration < 3000 ? 'warning' : 'fail',
      message: `Data loading took ${loadDuration.toFixed(2)}ms`,
      details: { duration: loadDuration },
      duration: loadDuration
    });

    // Test memory usage (if available)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      
      this.addResult({
        category: 'Performance',
        test: 'Memory Usage',
        status: usedMB < 50 ? 'pass' : usedMB < 100 ? 'warning' : 'fail',
        message: `Memory usage: ${usedMB.toFixed(2)}MB`,
        details: { memoryMB: usedMB }
      });
    }
  }

  // 7. Logging Tests
  async validateLogging(): Promise<void> {
    const { result: logCount, duration } = await this.measureTime(
      'logging-test',
      async () => {
        const initialCount = logger.getRecentLogs(1).length;
        
        // Test different log levels
        logger.debug('Test debug message');
        logger.info('Test info message');
        logger.warn('Test warning message');
        
        const finalCount = logger.getRecentLogs(10).length;
        return finalCount - initialCount;
      }
    );

    const loggingWorks = logCount >= 3;
    this.addResult({
      category: 'Logging',
      test: 'Log Output',
      status: loggingWorks ? 'pass' : 'fail',
      message: `Logged ${logCount} messages`,
      details: { logCount },
      duration
    });
  }

  // 8. Chaos Testing
  async validateChaosResistance(): Promise<void> {
    // Enable aggressive chaos mode
    chaosEngine.enable({
      failureRate: 0.5, // 50% failure rate
      delayRange: [1000, 3000],
      slowNetwork: true,
      offlineMode: true,
      malformedData: true
    });

    let resilienceScore = 0;
    const chaosTests = 5;

    // Test API resilience
    try {
      await chaosEngine.simulateApiCall(() => getCommonSubjects(), 'chaos-test');
      resilienceScore++;
    } catch (error) {
      // Expected to fail, but system should handle gracefully
    }

    // Test data validation resilience
    const testData = { name: 'Test Subject' };
    if (chaosEngine.simulateDataValidation(testData) !== null) {
      resilienceScore++;
    }

    // Test partial response resilience
    const partial = chaosEngine.simulatePartialResponse({ a: 1, b: 2, c: 3 });
    if (partial && Object.keys(partial).length > 0) {
      resilienceScore++;
    }

    // Test slow network resilience
    try {
      await chaosEngine.simulateSlowNetwork();
      resilienceScore++;
    } catch (error) {
      // Should not throw
    }

    // Test overall system stability
    try {
      const subjects = await getSubjects();
      if (subjects && subjects.common.length > 0) {
        resilienceScore++;
      }
    } catch (error) {
      // Fallback should work
    }

    chaosEngine.disable();

    const resiliencePercentage = (resilienceScore / chaosTests) * 100;
    this.addResult({
      category: 'Chaos',
      test: 'System Resilience',
      status: resiliencePercentage >= 60 ? 'pass' : resiliencePercentage >= 40 ? 'warning' : 'fail',
      message: `Resilience score: ${resiliencePercentage.toFixed(1)}% (${resilienceScore}/${chaosTests})`,
      details: { resilienceScore, chaosTests, resiliencePercentage }
    });
  }

  // 9. AI-Readiness Tests
  async validateAIReadiness(): Promise<void> {
    // Test AI data validation
    const validAIData = {
      name: 'AI Generated Subject',
      description: 'Generated by AI',
      difficulty: 'medium' as const,
      icon: '???',
      estimatedTime: 30
    };

    const { result: validated, duration } = await this.measureTime(
      'ai-validation',
      () => Promise.resolve(aiDataAdapter.validateSubject(validAIData))
    );

    this.addResult({
      category: 'AI',
      test: 'AI Data Validation',
      status: validated !== null ? 'pass' : 'fail',
      message: validated !== null ? 'AI data validation working' : 'AI data validation failed',
      details: { validated },
      duration
    });

    // Test fallback generation
    const { result: fallback, duration: fallbackDuration } = await this.measureTime(
      'fallback-test',
      () => Promise.resolve(aiDataAdapter.createFallbackSubject('Test'))
    );

    const hasFallback = fallback && fallback.name && fallback.icon;
    this.addResult({
      category: 'AI',
      test: 'Fallback Generation',
      status: hasFallback ? 'pass' : 'fail',
      message: hasFallback ? 'Fallback data generation working' : 'Fallback generation failed',
      details: { fallback },
      duration: fallbackDuration
    });
  }

  // Run complete validation suite
  async runFullValidation(): Promise<ValidationReport> {
    this.results = [];
    const startTime = performance.now();

    logger.info('Starting production validation suite');

    // Run all validation tests
    await this.validateDeploymentIntegrity();
    await this.validateHydration();
    await this.validateSelfHealing();
    await this.validateDataLayer();
    await this.validateNavigation();
    await this.validatePerformance();
    await this.validateLogging();
    await this.validateChaosResistance();
    await this.validateAIReadiness();

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Calculate summary
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'pass').length,
      failed: this.results.filter(r => r.status === 'fail').length,
      warnings: this.results.filter(r => r.status === 'warning').length,
      score: 0
    };

    // Calculate score (pass = 100%, warning = 50%, fail = 0%)
    const totalScore = this.results.reduce((acc, result) => {
      const points = result.status === 'pass' ? 100 : result.status === 'warning' ? 50 : 0;
      return acc + points;
    }, 0);
    summary.score = Math.round(totalScore / this.results.length);

    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      buildInfo: getBuildInfo(),
      results: this.results,
      summary,
      totalDuration
    };

    logger.info('Production validation completed', {
      score: summary.score,
      passed: summary.passed,
      failed: summary.failed,
      warnings: summary.warnings,
      duration: `${totalDuration.toFixed(2)}ms`
    });

    return report;
  }

  // Get detailed results
  getResults(): ValidationResult[] {
    return [...this.results];
  }

  // Clear results
  clearResults(): void {
    this.results = [];
  }
}

// Export singleton instance
export const productionValidator = ProductionValidator.getInstance();

// Export convenience functions
export const runProductionValidation = () => productionValidator.runFullValidation();
export const getValidationResults = () => productionValidator.getResults();
