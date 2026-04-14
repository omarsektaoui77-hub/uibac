 

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(title, status, details = "") {
  console.log(
    `${status === "ok" ? "  " : "  "}${title}${
      details ? "  " + details : ""
    }`
  );
}

// 1. Check build artifacts
function checkBuild() {
  const nextDir = path.join(ROOT, ".next");
  if (fs.existsSync(nextDir)) {
    log("Next.js build folder exists", "ok");
  } else {
    log("Missing .next build folder", "fail");
  }
}

// 2. Check for client/server misuse
function scanForUseClient() {
  const files = walk(ROOT, ".tsx");

  let issues = 0;

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf-8");

    // Check if file uses client-side features
    const hasClientFeatures = content.includes("useState") || 
                           content.includes("useEffect") || 
                           content.includes("onClick") ||
                           content.includes("motion.") ||
                           content.includes("framer-motion");

    // Check if it has 'use client' directive
    const hasUseClient = content.includes("'use client'") || content.includes('"use client"');

    if (hasClientFeatures && !hasUseClient) {
      log("Missing 'use client'", "fail", file);
      issues++;
    }
  });

  if (!issues) log("Client/Server boundary check", "ok");
  else log(`Found ${issues} files with missing 'use client'`, "fail");
}

// 3. Check static data integrity
function checkBranchData() {
  const file = path.join(ROOT, "app", "lib", "branchData.ts");

  if (!fs.existsSync(file)) {
    log("branchData.ts missing", "fail");
    return;
  }

  const content = fs.readFileSync(file, "utf-8");

  const subjectCount = (content.match(/name:/g) || []).length;

  if (subjectCount >= 5) {
    log("Subjects detected", "ok", `${subjectCount} subjects`);
  } else {
    log("Subjects seem incomplete", "fail");
  }
}

// 4. Check routing structure
function checkRoutes() {
  const appDir = path.join(ROOT, "app");

  if (!fs.existsSync(appDir)) {
    log("App router missing", "fail");
    return;
  }

  const pages = walk(appDir, "page.tsx");

  log("Routes detected", "ok", `${pages.length} pages`);
}

// 5. Check caching flags
function checkCaching() {
  const files = walk(ROOT, ".tsx");

  let found = false;

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf-8");
    if (content.includes("force-dynamic")) {
      found = true;
    }
  });

  if (found) {
    log("Dynamic rendering enabled somewhere", "ok");
  } else {
    log("No dynamic rendering flags found", "fail");
  }
}

// 6. Check for hydration issues
function checkHydration() {
  const files = walk(ROOT, ".tsx");
  let issues = 0;

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf-8");
    
    // Check for potential hydration issues
    if (content.includes("typeof window") && !content.includes("useEffect")) {
      log("Potential hydration issue", "fail", file);
      issues++;
    }
  });

  if (!issues) log("Hydration safety check", "ok");
}

// 7. Check package.json scripts
function checkPackageScripts() {
  const packageFile = path.join(ROOT, "package.json");
  
  if (!fs.existsSync(packageFile)) {
    log("package.json missing", "fail");
    return;
  }

  const content = JSON.parse(fs.readFileSync(packageFile, "utf-8"));
  const scripts = content.scripts || {};

  if (scripts.build && scripts.dev) {
    log("Basic scripts present", "ok");
  } else {
    log("Missing basic scripts", "fail");
  }
}

// 8. Check for environment variables
function checkEnvVars() {
  const envFile = path.join(ROOT, ".env.example");
  
  if (fs.existsSync(envFile)) {
    log("Environment template exists", "ok");
  } else {
    log("Missing .env.example", "fail");
  }
}

// Helper: walk files
function walk(dir, ext) {
  let results = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }

  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // Skip node_modules and .next
      if (!file.includes("node_modules") && !file.includes(".next") && !file.startsWith(".")) {
        results = results.concat(walk(filePath, ext));
      }
    } else if (file.endsWith(ext)) {
      results.push(filePath);
    }
  });

  return results;
}

// Run all checks
console.log("\n  Running BacFlow/BacQuest Diagnostics...\n");

checkBuild();
scanForUseClient();
checkBranchData();
checkRoutes();
checkCaching();
checkHydration();
checkPackageScripts();
checkEnvVars();

console.log("\n  Diagnosis complete.\n");
