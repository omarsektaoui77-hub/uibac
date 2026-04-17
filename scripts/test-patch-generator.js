/**
 * Test Script: Safe Auto-Fix Patch Generator
 * 
 * Run: node scripts/test-patch-generator.js
 * 
 * This script tests the patch generator with sample inputs
 * following the strict system specification.
 */

const TEST_CASES = [
  {
    name: 'Null Check Fix',
    input: {
      rca: {
        symptom: "Application crashes when rendering user list",
        trigger: "Calling .map() on undefined users array",
        root_cause: "Missing null check before array operations on API response",
        confidence: 0.92,
        evidence: ["TypeError: Cannot read property 'map' of undefined"],
        safe_to_fix: true,
        suggested_fix_type: 'null_check'
      },
      source_code: `function UserList() {
  const users = getUsers();
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}`,
      file_path: 'components/UserList.tsx'
    },
    expected: {
      shouldHavePatch: true,
      maxRiskLevel: 'low',
      minConfidence: 0.7
    }
  },
  {
    name: 'Blocked File (auth.ts)',
    input: {
      rca: {
        symptom: "Auth token validation fails",
        trigger: "Token parsing error",
        root_cause: "Missing try-catch in token validation",
        confidence: 0.85,
        evidence: [],
        safe_to_fix: true,
        suggested_fix_type: 'error_boundary'
      },
      source_code: `function validateToken(token) {
  return jwt.verify(token, SECRET);
}`,
      file_path: 'lib/auth.ts'
    },
    expected: {
      shouldHavePatch: false,
      requiresReview: true
    }
  },
  {
    name: 'Unsafe to Fix (safe_to_fix: false)',
    input: {
      rca: {
        symptom: "Data corruption in payment processing",
        trigger: "Race condition in concurrent updates",
        root_cause: "Complex transaction logic requires manual review",
        confidence: 0.6,
        evidence: [],
        safe_to_fix: false,
        suggested_fix_type: 'manual_review'
      },
      source_code: `async function processPayment(orderId) {
  // Complex logic here
}`,
      file_path: 'lib/payment.ts'
    },
    expected: {
      shouldHavePatch: false,
      requiresReview: true,
      confidence: 0.0
    }
  },
  {
    name: 'Async Handling Fix',
    input: {
      rca: {
        symptom: "Unhandled promise rejection in data fetch",
        trigger: "Network error not caught",
        root_cause: "Missing try-catch around fetch call",
        confidence: 0.88,
        evidence: ["UnhandledPromiseRejectionWarning"],
        safe_to_fix: true,
        suggested_fix_type: 'async_handling'
      },
      source_code: `async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}`,
      file_path: 'lib/data.ts'
    },
    expected: {
      shouldHavePatch: true,
      maxRiskLevel: 'medium'
    }
  }
];

/**
 * Test runner
 */
async function runTests() {
  console.log('🧪 Safe Auto-Fix Patch Generator Tests\n');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const testCase of TEST_CASES) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('-'.repeat(40));
    
    try {
      // Call the API
      const response = await fetch('http://localhost:3000/api/sre/generate-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.input)
      });
      
      const result = await response.json();
      
      // Validate output format
      const validOutput = validateOutput(result);
      
      // Check expectations
      const checks = [];
      
      if (testCase.expected.shouldHavePatch !== undefined) {
        const hasPatch = result.patch && result.patch.length > 0;
        checks.push({
          name: 'Has patch',
          passed: hasPatch === testCase.expected.shouldHavePatch,
          expected: testCase.expected.shouldHavePatch,
          actual: hasPatch
        });
      }
      
      if (testCase.expected.maxRiskLevel) {
        const riskLevels = ['low', 'medium', 'high'];
        const actualLevel = riskLevels.indexOf(result.risk_level);
        const maxLevel = riskLevels.indexOf(testCase.expected.maxRiskLevel);
        checks.push({
          name: 'Risk level',
          passed: actualLevel <= maxLevel,
          expected: `<= ${testCase.expected.maxRiskLevel}`,
          actual: result.risk_level
        });
      }
      
      if (testCase.expected.requiresReview !== undefined) {
        checks.push({
          name: 'Requires review',
          passed: result.requires_review === testCase.expected.requiresReview,
          expected: testCase.expected.requiresReview,
          actual: result.requires_review
        });
      }
      
      if (testCase.expected.minConfidence !== undefined) {
        checks.push({
          name: 'Min confidence',
          passed: result.confidence >= testCase.expected.minConfidence,
          expected: `>= ${testCase.expected.minConfidence}`,
          actual: result.confidence.toFixed(2)
        });
      }
      
      if (testCase.expected.confidence !== undefined) {
        checks.push({
          name: 'Exact confidence',
          passed: result.confidence === testCase.expected.confidence,
          expected: testCase.expected.confidence,
          actual: result.confidence
        });
      }
      
      // Print results
      console.log(`Valid Output Format: ${validOutput ? '✅' : '❌'}`);
      console.log(`Patch Generated: ${result.patch ? '✅' : '❌'} (${result.patch?.length || 0} chars)`);
      console.log(`Change Summary: ${result.change_summary.substring(0, 60)}...`);
      console.log(`Risk Level: ${result.risk_level}`);
      console.log(`Confidence: ${result.confidence.toFixed(2)}`);
      console.log(`Requires Review: ${result.requires_review}`);
      
      console.log('\nChecks:');
      let allPassed = true;
      for (const check of checks) {
        const status = check.passed ? '✅' : '❌';
        console.log(`  ${status} ${check.name}: ${check.actual} (expected: ${check.expected})`);
        if (!check.passed) allPassed = false;
      }
      
      results.push({
        name: testCase.name,
        passed: allPassed && validOutput,
        result
      });
      
    } catch (error) {
      console.error(`❌ Test failed with error:`, error.message);
      results.push({
        name: testCase.name,
        passed: false,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}`);
    });
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

/**
 * Validate output matches strict specification
 */
function validateOutput(output) {
  const requiredFields = ['patch', 'change_summary', 'risk_level', 'confidence', 'requires_review'];
  
  for (const field of requiredFields) {
    if (!(field in output)) {
      console.log(`  ❌ Missing field: ${field}`);
      return false;
    }
  }
  
  // Validate types
  if (typeof output.patch !== 'string') {
    console.log('  ❌ patch must be a string');
    return false;
  }
  
  if (typeof output.change_summary !== 'string') {
    console.log('  ❌ change_summary must be a string');
    return false;
  }
  
  if (!['low', 'medium', 'high'].includes(output.risk_level)) {
    console.log('  ❌ risk_level must be low, medium, or high');
    return false;
  }
  
  if (typeof output.confidence !== 'number' || output.confidence < 0 || output.confidence > 1) {
    console.log('  ❌ confidence must be a number between 0 and 1');
    return false;
  }
  
  if (typeof output.requires_review !== 'boolean') {
    console.log('  ❌ requires_review must be a boolean');
    return false;
  }
  
  return true;
}

// Run tests
runTests().catch(console.error);
