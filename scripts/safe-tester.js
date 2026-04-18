const fetch = global.fetch || require("node-fetch");

const BASE = process.argv[2];
if (!BASE) {
  console.error("❌ Usage: node safe-tester.js <BASE_URL>");
  process.exit(1);
}

// =========================
// SOC EVENT EMITTER
// =========================
const sendToSOC = async (event) => {
  try {
    await fetch("http://localhost:4000/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cc-token": process.env.CC_TOKEN || "dev-token",
        "x-role": "developer",
        "x-source": "tester"
      },
      body: JSON.stringify(event)
    });
  } catch (e) {
    // Silently fail - don't block tests on SOC errors
  }
};

// =========================
// CONFIG (safe defaults)
// =========================
const DELAY_MS = 300;          // rate limit
const MAX_CONCURRENCY = 2;     // low concurrency
const MAX_ERRORS = 5;          // auto-stop threshold
const MAX_ANOMALY_RATE = 0.3;  // 30% failure = stop

let stats = {
  total: 0,
  success: 0,
  errors: 0,
  anomalies: 0,
};

let stop = false;

// =========================
// TEST CASES
// =========================
const tests = [
  { path: "/", expect: 307, name: "Root redirect" },
  { path: "/en", expect: 200, name: "Valid locale EN" },
  { path: "/fr", expect: 200, name: "Valid locale FR" },
  { path: "/xx", expect: 404, name: "Invalid locale" },
  { path: "/en/invalid", expect: 404, name: "Invalid route" },
  { path: "/fr/deep/bad/path", expect: 404, name: "Deep invalid" },
];

// =========================
// HELPERS
// =========================
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function logResult(test, status, ok) {
  const icon = ok ? "✅" : "⚠️";
  console.log(`${icon} [${status}] ${test.name} → ${test.path}`);
}

function checkAnomaly(status, expected) {
  if (status !== expected) {
    stats.anomalies++;
    return true;
  }
  return false;
}

function shouldStop() {
  if (stats.errors >= MAX_ERRORS) return true;
  if (stats.total > 5) {
    const rate = stats.anomalies / stats.total;
    if (rate > MAX_ANOMALY_RATE) return true;
  }
  return false;
}

// =========================
// CORE TEST RUNNER
// =========================
async function runTest(test) {
  if (stop) return;

  await sleep(DELAY_MS);

  try {
    const res = await fetch(BASE + test.path, {
      method: "GET",
      redirect: "manual",
    });

    stats.total++;

    const anomaly = checkAnomaly(res.status, test.expect);

    if (res.status >= 200 && res.status < 400) {
      stats.success++;
    } else {
      stats.errors++;
    }

    logResult(test, res.status, !anomaly);

    // Emit SOC event
    await sendToSOC({
      org: "uibac",
      repo: "frontend",
      env: "production",
      type: "ROUTE_TEST",
      level: anomaly ? "HIGH" : "LOW",
      risk: anomaly ? 7 : 1,
      meta: {
        path: test.path,
        expected: test.expect,
        actual: res.status
      }
    });

    if (shouldStop()) {
      console.error("🛑 AUTO-STOP: anomaly threshold reached");
      stop = true;
    }

  } catch (err) {
    stats.errors++;
    stats.total++;
    console.error(`❌ ERROR ${test.name}:`, err.message);

    if (shouldStop()) {
      console.error("🛑 AUTO-STOP: too many errors");
      stop = true;
    }
  }
}

// =========================
// EXECUTION CONTROL
// =========================
async function run() {
  console.log("🚀 Safe Production Test Started");
  console.log("🔗 Target:", BASE);
  console.log("");

  const queue = [...tests];

  const workers = Array.from({ length: MAX_CONCURRENCY }, async () => {
    while (queue.length && !stop) {
      const test = queue.shift();
      await runTest(test);
    }
  });

  await Promise.all(workers);

  // =========================
  // FINAL REPORT
  // =========================
  console.log("\n📊 FINAL REPORT");
  console.log("Total:", stats.total);
  console.log("Success:", stats.success);
  console.log("Errors:", stats.errors);
  console.log("Anomalies:", stats.anomalies);

  const anomalyRate = stats.total ? (stats.anomalies / stats.total) : 0;
  console.log("Anomaly Rate:", (anomalyRate * 100).toFixed(1) + "%");

  if (stop) {
    console.log("⚠️ Test stopped early due to anomalies");
  } else {
    console.log("✅ Test completed safely");
  }
}

run();
