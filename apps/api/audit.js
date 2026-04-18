// ZeroLeak SOC - Audit Log System
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "../../data/audit.json");

function logAudit(action, user) {
  const logs = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : [];

  logs.push({
    time: Date.now(),
    user: user.username,
    role: user.role,
    action: action
  });

  fs.writeFileSync(FILE, JSON.stringify(logs, null, 2));
}

function getAudit() {
  if (!fs.existsSync(FILE)) return [];
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

module.exports = { logAudit, getAudit };
