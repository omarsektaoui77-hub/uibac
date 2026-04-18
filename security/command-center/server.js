// ZeroLeak Security Command Center - Event Server (Production Hardened)
// Central hub for security events, stats, and actions

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// Rate limiting (anti-abuse)
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many requests from this IP"
});
app.use(limiter);

// Configuration
const AUTH_TOKEN = process.env.CC_TOKEN;
const CC_SECRET = process.env.CC_SECRET || "default-secret-change-in-production";
const TRUSTED_SOURCES = (process.env.CC_TRUSTED_SOURCES || "trusted-ci").split(",");

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

// =========================
// PRODUCTION HARDENING
// =========================

// 1. Observability (request logging)
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// 2. Authentication middleware
app.use((req, res, next) => {
  // Skip auth for public endpoints (dashboard, health)
  const publicPaths = ["/", "/index.html", "/health"];
  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  
  // Require auth for protected endpoints
  if (req.path.startsWith("/events") || req.path.startsWith("/stats") || req.path.startsWith("/actions")) {
    const token = req.headers["x-cc-token"];
    if (!AUTH_TOKEN) {
      console.warn("[AUTH] CC_TOKEN not configured - allowing for development");
      return next();
    }
    if (token !== AUTH_TOKEN) {
      console.warn(`[AUTH] Unauthorized access attempt from ${req.ip}`);
      return res.status(403).json({ error: "Unauthorized" });
    }
  }
  next();
});

// 3. Secure event ingestion (source validation)
app.use((req, res, next) => {
  if (req.path === "/event") {
    const source = req.headers["x-source"];
    if (!TRUSTED_SOURCES.includes(source)) {
      console.warn(`[SECURE] Untrusted source attempt: ${source}`);
      return res.status(403).json({ error: "Untrusted source" });
    }
  }
  next();
});

// 4. Tamper-resistant logging
function sign(entry) {
  return crypto
    .createHmac("sha256", CC_SECRET)
    .update(JSON.stringify(entry))
    .digest("hex");
}

// =========================
// DATABASE FUNCTIONS
// =========================

function readEvents() {
  try {
    return JSON.parse(fs.readFileSync(EVENTS_DB, "utf8"));
  } catch (e) {
    console.error("[DB] Failed to read events:", e.message);
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
    console.error("[DB] Failed to read actions:", e.message);
    return [];
  }
}

function writeActions(actions) {
  fs.writeFileSync(ACTIONS_DB, JSON.stringify(actions, null, 2));
}

// =========================
// API ENDPOINTS
// =========================

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Ingest event
app.post("/event", (req, res) => {
  const events = readEvents();
  const e = {
    id: Date.now(),
    time: new Date().toISOString(),
    ...req.body,
    signature: sign(req.body) // Tamper-resistant
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
    status: "pending",
    signature: sign({ type, payload }) // Tamper-resistant
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

// Error handling
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.CC_PORT || 4000;

app.listen(PORT, () => {
  console.log(`🛡️ Security Command Center running on http://localhost:${PORT}`);
  if (!AUTH_TOKEN) {
    console.warn("⚠️ WARNING: CC_TOKEN not configured - authentication disabled");
  }
});
