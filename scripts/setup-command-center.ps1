# =========================
# 🛡️ SECURITY COMMAND CENTER SETUP
# =========================

Write-Host "🚀 Initializing Security Command Center..."

# 1. Create structure
$dirs = @(
  "security",
  "security/command-center"
)

foreach ($d in $dirs) {
  if (!(Test-Path $d)) {
    New-Item -ItemType Directory -Path $d | Out-Null
  }
}

# 2. Init npm if needed
if (!(Test-Path "package.json")) {
  npm init -y | Out-Null
}

# 3. Install deps
npm install express --save

# =========================
# 4. Command Center Server
# =========================
@"
const express = require("express");
const fs = require("fs");
const app = express();

app.use(express.json());

const DB = "security/cc-events.json";
if (!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify([]));

function read() { return JSON.parse(fs.readFileSync(DB)); }
function write(d) { fs.writeFileSync(DB, JSON.stringify(d, null, 2)); }

app.post("/event", (req, res) => {
  const events = read();
  const e = {
    id: Date.now(),
    time: new Date().toISOString(),
    ...req.body
  };
  events.push(e);
  write(events);
  res.json({ ok: true });
});

app.get("/events", (req, res) => res.json(read()));

app.get("/stats", (req, res) => {
  const events = read();
  const byLevel = events.reduce((a, e) => {
    a[e.level] = (a[e.level] || 0) + 1;
    return a;
  }, {});
  res.json({ total: events.length, byLevel });
});

app.use(express.static(__dirname));

app.listen(4000, () => {
  console.log("🛡️ Command Center → http://localhost:4000");
});
"@ | Set-Content "security/command-center/server.js"

# =========================
# 5. Client
# =========================
@"
const http = require("http");

async function sendEvent(event) {
  try {
    const data = JSON.stringify(event);
    const options = {
      hostname: "localhost",
      port: 4000,
      path: "/event",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
    };
    
    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          try { resolve(JSON.parse(body)); } catch { resolve({ ok: true }); }
        });
      });
      req.on("error", () => resolve({ ok: false }));
      req.write(data);
      req.end();
    });
  } catch (e) {}
}

module.exports = { sendEvent };
"@ | Set-Content "security/cc-client.js"

# =========================
# 6. Brain
# =========================
@"
const { execSync } = require("child_process");
const { sendEvent } = require("./cc-client");

const diff = execSync("git diff --cached", { encoding: "utf8" });

const risk = (diff.match(/process\.env/g) || []).length * 3 +
             (diff.match(/fetch\(/g) || []).length * 3;

let level = "LOW";
if (risk >= 8) level = "HIGH";
else if (risk >= 4) level = "MEDIUM";

console.log("🧠 Risk:", risk, level);

sendEvent({
  type: "SCAN",
  risk,
  level
});

if (level === "HIGH") {
  console.error("🚫 Blocked by security brain");
  process.exit(1);
}
"@ | Set-Content "security/brain.js"

# =========================
# 7. Self-heal
# =========================
@"
const fs = require("fs");

function sanitize(file) {
  let c = fs.readFileSync(file, "utf8");
  c = c.replace(/https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/g, "REMOVED");
  fs.writeFileSync(file, c);
}

module.exports = { sanitize };
"@ | Set-Content "security/self-heal.js"

# =========================
# 8. Dashboard
# =========================
@"
<!DOCTYPE html>
<html>
<body style="background:#0b0f14;color:white;font-family:sans-serif">
<h2>🛡️ Command Center</h2>
<div id="data"></div>
<script>
async function load(){
 const d = await fetch('/events').then(r=>r.json());
 document.getElementById('data').innerHTML =
  d.slice(-20).reverse().map(e =>
   '<div>['+e.level+'] '+e.type+' ('+e.risk+')</div>'
  ).join('');
}
setInterval(load,2000);load();
</script>
</body>
</html>
"@ | Set-Content "security/command-center/index.html"

# =========================
# 9. Git hook
# =========================
$hookPath = ".git/hooks/pre-commit"

@"
#!/bin/sh
node security/brain.js
"@ | Set-Content $hookPath

# =========================
# 10. Scripts
# =========================
$json = Get-Content package.json | ConvertFrom-Json
$json.scripts.startcc = "node security/command-center/server.js"
$json | ConvertTo-Json -Depth 10 | Set-Content package.json

Write-Host ""
Write-Host "✅ DONE"
Write-Host "Run: npm run startcc"
Write-Host "Open: http://localhost:4000"
