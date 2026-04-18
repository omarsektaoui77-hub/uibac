const express = require("express");
const fs = require("fs");
const path = require("path");

const { runMultiAgent } = require(path.join(__dirname, "../../security/multi-agent/brain"));
const { runMarketplace } = require(path.join(__dirname, "../../security/marketplace/brain"));
const { copilotBrain } = require(path.join(__dirname, "../../security/copilot/brain"));
const { generateToken, authMiddleware } = require(path.join(__dirname, "./auth"));
const { users } = require(path.join(__dirname, "./users"));
const { requireRole, requireAnyRole } = require(path.join(__dirname, "./rbac"));
const { logAudit, getAudit } = require(path.join(__dirname, "./audit"));
const { broadcast } = require(path.join(__dirname, "./ws"));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../dashboard")));

const EVENTS_FILE = path.join(__dirname, "../../data/events.json");
const MEMORY_FILE = path.join(__dirname, "../../data/memory.json");

let decisionsLog = [];
let autonomyEnabled = true;

function loadEvents() {
  try {
    if (!fs.existsSync(EVENTS_FILE)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8"));
  } catch (e) {
    console.error("Error loading events:", e);
    return [];
  }
}

function saveEvents(events) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

function loadMemory() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
  } catch (e) {
    console.error("Error loading memory:", e);
    return [];
  }
}

function saveMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// � login endpoint
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username && u.password === password);

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const token = generateToken({ username, role: user.role });

  logAudit("LOGIN", { username, role: user.role });

  res.json({ token, role: user.role });
});

// �🔥 ingest endpoint
app.post("/ingest", authMiddleware, async (req, res) => {
  const events = loadEvents();
  events.push(req.body);
  saveEvents(events);

  // 🧠 multi-agent
  const multi = await runMultiAgent(events, { silent: true });

  // 🏆 marketplace
  const market = await runMarketplace(events, { silent: true });

  // 🤖 co-pilot
  const copilot = await copilotBrain(events, { silent: true });

  // Log decision
  const decision = {
    time: Date.now(),
    multi,
    market,
    copilot
  };

  decisionsLog.push(decision);

  // WebSocket broadcast
  broadcast({ type: "EVENT", payload: req.body });
  broadcast({ type: "DECISION", payload: decision });

  logAudit("INGEST_EVENT", req.user);

  res.json({
    status: "processed",
    decision
  });
});

// 📡 events endpoint
app.get("/events", authMiddleware, (req, res) => {
  const events = loadEvents();
  res.json(events);
});

// 🤖 decisions endpoint
app.get("/decisions", authMiddleware, (req, res) => {
  res.json(decisionsLog);
});

// 📊 status
app.get("/status", authMiddleware, (req, res) => {
  const events = loadEvents();
  res.json({ 
    eventsCount: events.length,
    autonomyEnabled
  });
});

// 🧠 health
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy",
    autonomyEnabled,
    timestamp: new Date().toISOString()
  });
});

// 📜 audit endpoint
app.get("/audit", authMiddleware, requireRole("ADMIN"), (req, res) => {
  res.json(getAudit());
});

// ✋ control endpoints
app.post("/control/kill", authMiddleware, requireRole("ADMIN"), (req, res) => {
  autonomyEnabled = false;
  logAudit("KILL_SWITCH", req.user);
  res.json({ status: "autonomy disabled" });
});

app.post("/control/enable", authMiddleware, requireRole("ADMIN"), (req, res) => {
  autonomyEnabled = true;
  logAudit("ENABLE_AUTONOMY", req.user);
  res.json({ status: "autonomy enabled" });
});

const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";
app.listen(port, host, () =>
  console.log(`🚀 AI SOC running on http://${host}:${port}`)
);
