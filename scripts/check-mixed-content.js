#!/usr/bin/env node
/**
 * Mixed Content & CORS Checker
 * Tests if backend URL is accessible from frontend context
 * Simulates browser behavior (OPTIONS preflight, HTTPS to HTTP)
 */

const http = require('http');
const https = require('https');

const BACKEND_URL = 'http://roundhouse.proxy.rlwy.net:39487';
const PROTOCOL = BACKEND_URL.startsWith('https') ? 'https' : 'http';
const HOSTNAME = new URL(BACKEND_URL).hostname;
const PORT = new URL(BACKEND_URL).port || (PROTOCOL === 'https' ? 443 : 80);
const PATH = new URL(BACKEND_URL).pathname || '/';

console.log('=== Mixed Content & CORS Checker ===');
console.log(`Backend URL: ${BACKEND_URL}`);
console.log(`Protocol: ${PROTOCOL}`);
console.log(`Hostname: ${HOSTNAME}`);
console.log(`Port: ${PORT}`);
console.log('');

// Test 1: Basic connectivity
console.log('Test 1: Basic Connectivity');
console.log('----------------------------------------');
testBasicConnectivity();

// Test 2: OPTIONS preflight (CORS)
setTimeout(() => {
  console.log('\nTest 2: CORS Preflight (OPTIONS)');
  console.log('----------------------------------------');
  testCORSPreflight();
}, 2000);

// Test 3: Mixed content simulation
setTimeout(() => {
  console.log('\nTest 3: Mixed Content Simulation');
  console.log('----------------------------------------');
  checkMixedContent();
}, 4000);

function testBasicConnectivity() {
  const options = {
    hostname: HOSTNAME,
    port: PORT,
    path: PATH,
    method: 'GET',
    timeout: 5000
  };

  const req = (PROTOCOL === 'https' ? https : http).request(options, (res) => {
    console.log(`✅ Status: ${res.statusCode}`);
    console.log(`✅ Headers: ${JSON.stringify(res.headers, null, 2)}`);
    
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`✅ Response received (${body.length} bytes)`);
      console.log(`✅ Backend is REACHABLE`);
    });
  });

  req.on('error', (error) => {
    console.log(`❌ Error: ${error.message}`);
    console.log(`❌ Backend is NOT REACHABLE`);
    console.log(`   This could be due to:`);
    console.log(`   - Backend is down`);
    console.log(`   - Network/firewall blocking`);
    console.log(`   - Wrong URL or port`);
  });

  req.on('timeout', () => {
    req.destroy();
    console.log(`❌ Timeout: Backend did not respond within 5 seconds`);
  });

  req.end();
}

function testCORSPreflight() {
  const options = {
    hostname: HOSTNAME,
    port: PORT,
    path: PATH,
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://your-app.vercel.app',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Content-Type'
    },
    timeout: 5000
  };

  const req = (PROTOCOL === 'https' ? https : http).request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': res.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': res.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': res.headers['access-control-allow-headers'],
      'Access-Control-Allow-Credentials': res.headers['access-control-allow-credentials']
    };
    
    console.log('CORS Headers:');
    for (const [key, value] of Object.entries(corsHeaders)) {
      console.log(`  ${key}: ${value || 'NOT SET'}`);
    }
    
    if (!corsHeaders['Access-Control-Allow-Origin']) {
      console.log('⚠️  WARNING: CORS not configured on backend');
      console.log('   This will cause CORS errors when called from Vercel (HTTPS)');
      console.log('   Solution: Configure CORS on Railway backend');
    } else if (corsHeaders['Access-Control-Allow-Origin'] !== '*') {
      console.log('⚠️  WARNING: CORS allows specific origins only');
      console.log('   Make sure your Vercel domain is allowed');
    } else {
      console.log('✅ CORS is properly configured (allows all origins)');
    }
  });

  req.on('error', (error) => {
    console.log(`❌ Error: ${error.message}`);
    console.log(`❌ CORS preflight failed`);
  });

  req.on('timeout', () => {
    req.destroy();
    console.log(`❌ Timeout: CORS preflight did not respond`);
  });

  req.end();
}

function checkMixedContent() {
  console.log('Scenario: Vercel (HTTPS) calling Railway (HTTP)');
  console.log('');
  
  if (PROTOCOL === 'http') {
    console.log('❌ MIXED CONTENT WARNING DETECTED');
    console.log('   Your backend uses HTTP, but Vercel uses HTTPS');
    console.log('   Browsers will BLOCK requests from HTTPS to HTTP');
    console.log('');
    console.log('   Browser Error:');
    console.log('   "Mixed Content: The page was loaded over HTTPS,');
    console.log('   but requested an insecure resource"');
    console.log('');
    console.log('   Solutions:');
    console.log('   1. Use HTTPS for Railway backend (recommended)');
    console.log('   2. Use Vercel rewrites to proxy requests');
    console.log('   3. Add Vercel serverless function as proxy');
  } else {
    console.log('✅ No mixed content issue (backend uses HTTPS)');
  }
  
  console.log('');
  console.log('=== Summary ===');
  console.log('If backend is HTTP: You MUST use HTTPS or implement a proxy');
  console.log('If CORS not configured: You MUST configure CORS on Railway');
  console.log('');
  console.log('Next steps:');
  console.log('1. Check if Railway provides HTTPS (usually does)');
  console.log('2. Test: curl https://roundhouse.proxy.rlwy.net:39487');
  console.log('3. If HTTPS works, update vercel.json to use HTTPS URL');
}
