#!/usr/bin/env node

/**
 * Sentry Production Setup Validation Script
 * Run after deployment to verify monitoring is functional
 */

const https = require('https');
const http = require('http');

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('=== SENTRY PRODUCTION VALIDATION ===\n');

// Check environment
console.log('1. Environment Check:');
console.log('   SENTRY_DSN:', SENTRY_DSN ? '✓ Set' : '✗ Missing');
console.log('   BASE_URL:', BASE_URL);

// Test endpoints
const endpoints = [
  '/sentry-test',
  '/api/perf-test',
  '/api/sentry-test',
];

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const client = BASE_URL.startsWith('https') ? https : http;
    const url = new URL(path, BASE_URL);
    
    const req = client.get(url, (res) => {
      console.log(`   ${path}: ${res.statusCode}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`   ${path}: Error - ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`   ${path}: Timeout`);
      resolve(false);
    });
  });
}

console.log('\n2. Endpoint Tests:');
Promise.all(endpoints.map(testEndpoint)).then(() => {
  console.log('\n3. Manual Validation Required:');
  console.log('   ☐ Trigger client error via /sentry-test page');
  console.log('   ☐ Verify error appears in Sentry with release tag');
  console.log('   ☐ Check user context is attached');
  console.log('   ☐ Confirm performance trace for /api/perf-test');
  console.log('   ☐ Test alert notifications are received');
  
  console.log('\n4. Release Tracking:');
  const release = process.env.NEXT_PUBLIC_RELEASE || '1.0.0';
  console.log(`   Current Release: ${release}`);
  
  console.log('\n✅ Validation Complete');
  console.log('   Check Sentry Dashboard for captured events');
});
