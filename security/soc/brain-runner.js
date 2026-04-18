// ZeroLeak AI SOC Mode - Brain Runner
// Command-line interface for SOC analysis

const { runSOC, runSOCWithIngestion } = require("./brain");
const fs = require("fs");

// Main async function
async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const silent = args.includes("--silent");
  const autoAct = args.includes("--auto-act");
  const ingest = args.includes("--ingest");

  // Get event file from argument
  const eventFile = args.find(a => !a.startsWith("--"));

  if (ingest) {
    // Run SOC with ingestion from command center
    const ccHost = process.env.CC_HOST || "localhost";
    const ccPort = process.env.CC_PORT || 4000;
    const ccToken = process.env.CC_TOKEN;
    const ccRole = process.env.CC_ROLE || "security";
    
    console.log("📡 Ingesting events from command center...");
    console.log(`   Host: ${ccHost}:${ccPort}`);
    console.log(`   Role: ${ccRole}`);
    console.log();
    
    const result = await runSOCWithIngestion({
      silent,
      autoAct,
      ccHost,
      ccPort,
      ccToken,
      ccRole
    });
    
    if (!silent) {
      console.log(`\n📊 Results:`);
      console.log(`   Events: ${result.events}`);
      console.log(`   Incidents: ${result.incidents}`);
    }
    
    // Exit with error code if critical incidents found
    const hasCritical = result.results.some(r => r.classification.severity === "CRITICAL");
    if (hasCritical && autoAct) {
      process.exit(1);
    }
    
  } else if (eventFile) {
    // Run SOC with event file
    try {
      const events = JSON.parse(fs.readFileSync(eventFile, "utf8"));
      
      const result = await runSOC(events, { silent, autoAct });
      
      if (!silent) {
        console.log(`\n📊 Results:`);
        console.log(`   Events: ${result.events}`);
        console.log(`   Incidents: ${result.incidents}`);
      }
      
      // Exit with error code if critical incidents found
      const hasCritical = result.results.some(r => r.classification.severity === "CRITICAL");
      if (hasCritical && autoAct) {
        process.exit(1);
      }
    } catch (e) {
      console.error("❌ Failed to read event file:", e.message);
      process.exit(1);
    }
    
  } else {
    // Run SOC with sample events
    const sampleEvents = [
      {
        id: 1,
        org: "uibac",
        repo: "frontend-app",
        env: "production",
        type: "SECRET_LEAK",
        level: "HIGH",
        risk: 8,
        actor: "omar",
        time: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        org: "uibac",
        repo: "frontend-app",
        env: "production",
        type: "SECRET_LEAK",
        level: "HIGH",
        risk: 8,
        actor: "omar",
        time: new Date(Date.now() - 8 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        org: "uibac",
        repo: "frontend-app",
        env: "production",
        type: "SECRET_LEAK",
        level: "HIGH",
        risk: 8,
        actor: "omar",
        time: new Date(Date.now() - 6 * 60 * 1000).toISOString()
      }
    ];
    
    const result = await runSOC(sampleEvents, { silent, autoAct });
    
    if (!silent) {
      console.log(`\n📊 Results:`);
      console.log(`   Events: ${result.events}`);
      console.log(`   Incidents: ${result.incidents}`);
    }
    
    // Exit with error code if critical incidents found
    const hasCritical = result.results.some(r => r.classification.severity === "CRITICAL");
    if (hasCritical && autoAct) {
      process.exit(1);
    }
  }
}

// Run main function
main().catch(e => {
  console.error("❌ SOC analysis failed:", e.message);
  process.exit(1);
});

// Export for use in other scripts
module.exports = { runSOC, runSOCWithIngestion };
