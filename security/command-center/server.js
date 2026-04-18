// ZeroLeak Security Command Center - Event Server
// Central hub for security events, stats, and actions

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// Database files
const EVENTS_DB = path.join(__dirname, "cc-events.json");
const ACTIONS_DB = path.join(__dirname, "cc-actions.json");

// Initialize databases
if (!fs.existsSync(EVENTS_DB)) {
  fs.writeFileSync(EVENTS_DB, JSON.stringify([]));
}
if (!fs.existsSync(ACTIONS_DB)) {
  fs.writeFileSync(ACTIONS_DB, JSON.stringify([]));
}

function readEvents() {
  try {
    return JSON.parse(fs.readFileSync(EVENTS_DB, "utf8"));
  } catch (e) {
    return [];
  }
}

function writeEvents(events) {
  fs.writeFileSync(EVENTS_DB, JSON.stringify(events, null, 2));
}

function readActions() {
  try {
    return JSON.parse(fs.readFileSync(ACTIONS_DB, "utf8"));
  } catch (e) {
    return [];
  }
}

function writeActions(actions) {
  fs.writeFileSync(ACTIONS_DB, JSON.stringify(actions, null, 2));
}

// Ingest event
app.post("/event", (req, res) => {
  const events = readEvents();
  const e = {
    id: Date.now(),
    time: new Date().toISOString(),
    ...req.body
  };
  events.push(e);
  
  // Keep only last 1000 events
  if (events.length > 1000) {
    events.shift();
  }
  
  writeEvents(events);
  res.json({ ok: true, id: e.id });
});

// List events
app.get("/events", (req, res) => {
  const events = readEvents();
  const limit = parseInt(req.query.limit) || 100;
  res.json(events.slice(-limit));
});

// Quick stats
app.get("/stats", (req, res) => {
  const events = readEvents();
  const byLevel = events.reduce((a, e) => {
    a[e.level] = (a[e.level] || 0) + 1;
    return a;
  }, {});
  
  const byType = events.reduce((a, e) => {
    a[e.type] = (a[e.type] || 0) + 1;
    return a;
  }, {});
  
  res.json({
    total: events.length,
    byLevel,
    byType
  });
});

// Action queue
app.post("/action", (req, res) => {
  const { type, payload } = req.body;
  
  const actions = readActions();
  const action = {
    id: Date.now(),
    time: new Date().toISOString(),
    type,
    payload,
    status: "pending"
  };
  
  actions.push(action);
  writeActions(actions);
  
  console.log("⚡ Action received:", type);
  
  // Simple safe actions
  if (type === "REQUIRE_ROTATION") {
    console.log(`🚨 Rotate secret: ${payload.secret}`);
  }
  
  if (type === "FREEZE_BRANCH") {
    console.log(`🔒 Freeze branch: ${payload.branch}`);
  }
  
  res.json({ ok: true, id: action.id });
});

// List actions
app.get("/actions", (req, res) => {
  const actions = readActions();
  const limit = parseInt(req.query.limit) || 50;
  res.json(actions.slice(-limit));
});

// Serve static files (dashboard)
app.use(express.static(__dirname));

const PORT = process.env.CC_PORT || 4000;

app.listen(PORT, () => {
  console.log(`🛡️ Security Command Center running on http://localhost:${PORT}`);
});
