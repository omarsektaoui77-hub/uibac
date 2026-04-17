#!/usr/bin/env node

const BASE_URL = process.argv[2];

if (!BASE_URL) {
  console.error("❌ Missing URL\nUsage: node scripts/test-edge-cases.js https://your-app.vercel.app");
  process.exit(1);
}

const tests = [
  // Root
  { name: "Root redirect", path: "/", expected: 307 },

  // Valid routes
  { name: "Valid /en", path: "/en", expected: 200 },
  { name: "Valid /fr", path: "/fr", expected: 200 },
  { name: "Valid /ar", path: "/ar", expected: 200 },
  { name: "Valid /es", path: "/es", expected: 200 },

  // Invalid routes
  { name: "Invalid route", path: "/random", expected: 404 },
  { name: "Invalid route 2", path: "/unknown-page", expected: 404 },

  // Invalid locale combos
  { name: "Invalid locale /ar/es", path: "/ar/es", expected: 404 },
  { name: "Invalid locale /en/fr", path: "/en/fr", expected: 404 },

  // Deep invalid paths
  { name: "Deep invalid", path: "/en/random/page", expected: 404 },
  { name: "Deep invalid 2", path: "/fr/invalid/test", expected: 404 },
];

async function runTests() {
  console.log(`\n🚀 Testing: ${BASE_URL}\n`);

  let passed = 0;

  for (const test of tests) {
    try {
      const res = await fetch(BASE_URL + test.path, {
        method: "GET",
        redirect: "manual",
      });

      const status = res.status;
      const ok = status === test.expected;

      if (ok) passed++;

      console.log(
        `${ok ? "✅ PASS" : "❌ FAIL"} | ${test.name.padEnd(20)} | ${
          test.path
        } → ${status} (expected ${test.expected})`
      );
    } catch (err) {
      console.log(`❌ ERROR | ${test.name} | ${test.path} → ${err.message}`);
    }
  }

  console.log("\n📊 Summary:");
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(
    passed === tests.length
      ? "🎉 All tests passed — Production is stable"
      : "⚠️ Some tests failed — investigate before scaling"
  );
}

runTests();
