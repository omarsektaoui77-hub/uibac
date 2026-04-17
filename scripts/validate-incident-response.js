#!/usr/bin/env node

/**
 * Incident Response System Validation Script
 * Run after deployment to verify alerting is functional
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('🚨 INCIDENT RESPONSE VALIDATION\n');
console.log(`Base URL: ${BASE_URL}\n`);

const tests = [];

// Test 1: Webhook Status
async function testWebhookStatus() {
  console.log('Test 1: Webhook Status Check');
  try {
    const response = await fetch(`${BASE_URL}/api/alerts`);
    const data = await response.json();
    
    if (data.status === 'ready') {
      console.log('  ✅ Webhook endpoint is ready');
      console.log(`  Features: ${data.features?.join(', ')}`);
      return true;
    } else {
      console.log('  ❌ Webhook not ready');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Failed to reach webhook:', error.message);
    return false;
  }
}

// Test 2: Simulate Sentry Alert (CRITICAL)
async function testCriticalAlert() {
  console.log('\nTest 2: CRITICAL Alert Simulation');
  try {
    const payload = {
      level: 'fatal',
      title: 'App crash test',
      event: {
        event_id: 'test-123',
        release: '1.0.0',
        platform: 'javascript',
      },
      environment: 'production',
      project_name: 'uibac',
    };

    const response = await fetch(`${BASE_URL}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (data.success && data.incident?.severity === 'CRITICAL') {
      console.log('  ✅ CRITICAL incident created:', data.incident.id);
      return true;
    } else {
      console.log('  ❌ CRITICAL incident not created correctly');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
    return false;
  }
}

// Test 3: Simulate Sentry Alert (WARNING)
async function testWarningAlert() {
  console.log('\nTest 3: WARNING Alert Simulation');
  try {
    const payload = {
      level: 'error',
      title: 'High latency detected',
      event: {
        event_id: 'test-456',
        release: '1.0.0',
      },
      environment: 'production',
      project_name: 'uibac',
    };

    const response = await fetch(`${BASE_URL}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (data.success && data.incident?.severity === 'WARNING') {
      console.log('  ✅ WARNING incident created:', data.incident.id);
      return true;
    } else {
      console.log('  ❌ WARNING incident not created correctly');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
    return false;
  }
}

// Test 4: Dashboard Accessibility
async function testDashboard() {
  console.log('\nTest 4: Dashboard Accessibility');
  try {
    const response = await fetch(`${BASE_URL}/incidents`);
    
    if (response.status === 200) {
      console.log('  ✅ Dashboard accessible');
      console.log('  URL: http://localhost:3000/incidents');
      return true;
    } else {
      console.log('  ❌ Dashboard not accessible');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
    return false;
  }
}

// Helper function for fetch
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : http;
    const parsedUrl = new URL(url);
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ json: () => Promise.resolve(json), status: res.statusCode });
        } catch {
          resolve({ text: () => Promise.resolve(data), status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Run all tests
async function runTests() {
  const results = {
    webhook: await testWebhookStatus(),
    critical: await testCriticalAlert(),
    warning: await testWarningAlert(),
    dashboard: await testDashboard(),
  };

  console.log('\n' + '='.repeat(50));
  console.log('VALIDATION SUMMARY\n');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  console.log(`Tests Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('\n🚨 STATUS: INCIDENT RESPONSE READY');
    console.log('\nNext steps:');
    console.log('1. Configure Sentry webhook: http://localhost:3000/api/alerts');
    console.log('2. Create alert rules in Sentry Dashboard');
    console.log('3. Test with real Sentry alerts');
    console.log('4. Open dashboard: http://localhost:3000/incidents');
  } else {
    console.log('\n❌ STATUS: ALERTING MISCONFIGURED');
    console.log('\nFailed tests:');
    Object.entries(results)
      .filter(([_, passed]) => !passed)
      .forEach(([name]) => console.log(`  - ${name}`));
  }

  process.exit(passed === total ? 0 : 1);
}

runTests().catch(console.error);
