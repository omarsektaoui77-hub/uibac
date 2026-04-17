#!/usr/bin/env node

/**
 * CI-Integrated Chaos Testing Runner
 * Validates system resilience in preview environments
 * 
 * SAFETY: No destructive operations, no production impact
 * Runs against: Vercel preview deployments or local dev
 * 
 * Exit codes:
 *   0 = All tests passed
 *   1 = One or more tests failed
 */

const http = require('http');
const https = require('https');

// Configuration from environment
const BASE_URL = process.env.BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
const CI_MODE = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

console.log('🔥 CHAOS TESTING RUNNER');
console.log('=======================\n');
console.log(`Target: ${BASE_URL}`);
console.log(`Mode: ${CI_MODE ? 'CI' : 'Local'}\n`);

// Ensure URL has protocol
const normalizeUrl = (url) => {
  if (!url.startsWith('http')) {
    return `https://${url}`;
  }
  return url;
};

const TARGET_URL = normalizeUrl(BASE_URL);

/**
 * HTTP client for testing
 */
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const parsedUrl = new URL(url);

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (url.startsWith('https') ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: 10000, // 10 second timeout
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ json: () => Promise.resolve(json), status: res.statusCode, text: () => Promise.resolve(data) });
        } catch {
          resolve({ text: () => Promise.resolve(data), status: res.statusCode, json: () => Promise.resolve(null) });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Test runner helper
 */
async function runTest(name, testFn) {
  results.total++;
  const startTime = Date.now();

  try {
    console.log(`\n📋 Test: ${name}`);
    await testFn();
    const duration = Date.now() - startTime;
    results.passed++;
    results.tests.push({ name, status: 'PASS', duration });
    console.log(`   ✅ PASS (${duration}ms)`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    results.failed++;
    results.tests.push({ name, status: 'FAIL', duration, error: error.message });
    console.log(`   ❌ FAIL: ${error.message} (${duration}ms)`);
    return false;
  }
}

/**
 * Assert helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============================================
// CHAOS TEST SCENARIOS
// ============================================

/**
 * Test 1: API Health Check
 * Verify basic connectivity
 */
async function testApiHealth() {
  const response = await fetch(`${TARGET_URL}/api/alerts`);
  assert(response.status === 200, `Expected 200, got ${response.status}`);
  
  const data = await response.json();
  assert(data.status === 'ready', 'API not ready');
  assert(data.features?.includes('circuit-breaker'), 'Circuit breaker not enabled');
}

/**
 * Test 2: Unknown Error Handling
 * Verify circuit breaker blocks unknown patterns
 */
async function testUnknownErrorHandling() {
  const response = await fetch(`${TARGET_URL}/api/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'fatal',
      title: 'Completely unknown cosmic error',
      message: 'This error pattern is not recognized by the system',
      environment: 'preview',
      event: {
        event_id: `chaos-test-${Date.now()}`,
        release: 'chaos-test',
      },
    }),
  });

  assert(response.status === 200, `Expected 200, got ${response.status}`);
  
  const data = await response.json();
  assert(data.success === true, 'Incident creation failed');
  assert(data.incident?.severity === 'CRITICAL', 'Should be CRITICAL');
  assert(data.autoFix?.applied === false, 'Should NOT auto-fix unknown error');
  assert(data.autoFix?.reason?.includes('pattern') || data.autoFix?.reason?.includes('manual'), 
    'Should indicate manual review needed');
}

/**
 * Test 3: Broken Auto-Fix Protection
 * Verify known error with safety constraints
 */
async function testBrokenAutoFixProtection() {
  // Test with known pattern but check circuit breaker safety
  const response = await fetch(`${TARGET_URL}/api/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'fatal',
      title: 'Cannot read property of undefined',
      message: 'Cannot read property "data" of undefined',
      environment: 'preview',
      event: {
        event_id: `chaos-test-${Date.now()}`,
        release: 'chaos-test',
      },
    }),
  });

  assert(response.status === 200, `Expected 200, got ${response.status}`);
  
  const data = await response.json();
  assert(data.success === true, 'Incident creation failed');
  
  // In preview/CI mode, auto-fix likely won't have GitHub configured
  // But the circuit breaker should evaluate it
  assert(data.autoFix !== undefined, 'Auto-fix result should be present');
  
  // Verify circuit breaker status is accessible
  const healthResponse = await fetch(`${TARGET_URL}/api/alerts`);
  const health = await healthResponse.json();
  assert(health.circuitBreaker !== undefined, 'Circuit breaker status not available');
  assert(typeof health.circuitBreaker.healthy === 'boolean', 'Circuit breaker health not boolean');
}

/**
 * Test 4: Crash Telemetry Validation
 * Verify telemetry system is operational
 */
async function testCrashTelemetryValidation() {
  // Check telemetry debug page is accessible
  const response = await fetch(`${TARGET_URL}/telemetry-debug`);
  assert(response.status === 200, `Telemetry debug page not accessible: ${response.status}`);
  
  // Verify telemetry API exists
  const telemetryResponse = await fetch(`${TARGET_URL}/api/telemetry`, {
    method: 'GET',
  });
  
  // Should return 200 even if empty
  assert(telemetryResponse.status === 200, `Telemetry API not responding: ${telemetryResponse.status}`);
}

/**
 * Test 5: Rate Limiting Check
 * Verify circuit breaker rate limiting exists
 */
async function testRateLimitingCheck() {
  const response = await fetch(`${TARGET_URL}/api/alerts`);
  const data = await response.json();
  
  assert(data.circuitBreaker !== undefined, 'Circuit breaker config not exposed');
  assert(data.circuitBreaker.maxPRPerHour !== undefined, 'Rate limit not configured');
  assert(data.circuitBreaker.maxPRPerHour > 0, 'Invalid rate limit');
  assert(data.circuitBreaker.maxPRPerHour <= 10, 'Rate limit too high for safety');
}

/**
 * Test 6: Incident Dashboard Accessibility
 * Verify incident management UI is operational
 */
async function testIncidentDashboard() {
  const response = await fetch(`${TARGET_URL}/incidents`);
  assert(response.status === 200, `Incidents page not accessible: ${response.status}`);
}

/**
 * Test 7: Circuit Breaker State Validation
 * Verify circuit breaker is healthy and not stuck
 */
async function testCircuitBreakerState() {
  const response = await fetch(`${TARGET_URL}/api/alerts`);
  const data = await response.json();
  
  assert(data.circuitBreaker !== undefined, 'Circuit breaker status not available');
  assert(data.circuitBreaker.isOpen !== undefined, 'Circuit open state not available');
  
  if (data.circuitBreaker.isOpen) {
    console.log('   ⚠️  WARNING: Circuit breaker is OPEN (may need reset)');
  }
  
  // Verify we can read all required fields
  assert(typeof data.circuitBreaker.prCount === 'number', 'PR count not available');
  assert(typeof data.circuitBreaker.consecutiveFailures === 'number', 'Failure count not available');
  assert(typeof data.circuitBreaker.minConfidence === 'number', 'Min confidence not configured');
}

/**
 * Test 8: Slack Integration Check (Non-Destructive)
 * Verify Slack config without sending messages
 */
async function testSlackIntegrationCheck() {
  const response = await fetch(`${TARGET_URL}/api/alerts`);
  const data = await response.json();
  
  assert(data.integrations !== undefined, 'Integrations status not exposed');
  assert(data.integrations.slack !== undefined, 'Slack integration status not available');
  
  // In CI/preview, Slack is likely not configured - that's OK
  // We just verify the status check works
  console.log(`   ℹ️  Slack configured: ${data.integrations.slack.configured}`);
}

/**
 * Test 9: GitHub Integration Check (Non-Destructive)
 * Verify GitHub config without creating PRs
 */
async function testGitHubIntegrationCheck() {
  const response = await fetch(`${TARGET_URL}/api/alerts`);
  const data = await response.json();
  
  assert(data.integrations !== undefined, 'Integrations status not exposed');
  assert(data.integrations.github !== undefined, 'GitHub integration status not available');
  
  // In CI/preview, GitHub is likely not configured - that's OK
  // We just verify the status check works
  console.log(`   ℹ️  GitHub configured: ${data.integrations.github.configured}`);
}

/**
 * Test 10: Telemetry Lifecycle Validation
 * Verify telemetry event lifecycle is tracked
 */
async function testTelemetryLifecycleValidation() {
  // First, trigger an event
  await fetch(`${TARGET_URL}/api/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'warning',
      title: 'Chaos test telemetry event',
      message: 'Testing telemetry pipeline',
      environment: 'preview',
    }),
  });
  
  // Verify telemetry debug page still works
  const response = await fetch(`${TARGET_URL}/telemetry-debug`);
  assert(response.status === 200, 'Telemetry debug not accessible after event');
}

// ============================================
// MAIN EXECUTION
// ============================================

async function runAllTests() {
  console.log('Executing chaos test scenarios...\n');
  
  // Run all tests
  await runTest('API Health Check', testApiHealth);
  await runTest('Unknown Error Handling', testUnknownErrorHandling);
  await runTest('Broken Auto-Fix Protection', testBrokenAutoFixProtection);
  await runTest('Crash Telemetry Validation', testCrashTelemetryValidation);
  await runTest('Rate Limiting Check', testRateLimitingCheck);
  await runTest('Incident Dashboard Accessibility', testIncidentDashboard);
  await runTest('Circuit Breaker State Validation', testCircuitBreakerState);
  await runTest('Slack Integration Check', testSlackIntegrationCheck);
  await runTest('GitHub Integration Check', testGitHubIntegrationCheck);
  await runTest('Telemetry Lifecycle Validation', testTelemetryLifecycleValidation);

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('CHAOS TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total:  ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log('='.repeat(50));

  // Exit with appropriate code
  if (results.failed > 0) {
    console.log('\n❌ CHAOS TESTS FAILED');
    console.log('Merge blocked - system not resilient enough.\n');
    process.exit(1);
  } else {
    console.log('\n✅ ALL CHAOS TESTS PASSED');
    console.log('System resilience validated - merge allowed.\n');
    process.exit(0);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n💥 UNCAUGHT EXCEPTION:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('\n💥 UNHANDLED REJECTION:', error);
  process.exit(1);
});

// Run tests
runAllTests().catch((error) => {
  console.error('\n💥 CHAOS RUNNER FAILED:', error.message);
  process.exit(1);
});
