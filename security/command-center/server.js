// ZeroLeak Security Command Center - Event Server (Enterprise Mode)
// Multi-tenant, RBAC, policy enforcement, org-wide visibility

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// SOC Integration
const { runSOC } = require("../soc/brain");

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
const DEFAULT_ORG = process.env.CC_ORG || "default-org";

// Database files
const EVENTS_DB = path.join(__dirname, "cc-events.json");
const ACTIONS_DB = path.join(__dirname, "cc-actions.json");
const AUDIT_DB = path.join(__dirname, "cc-audit.json");

// Initialize databases
if (!fs.existsSync(EVENTS_DB)) {
  fs.writeFileSync(EVENTS_DB, JSON.stringify([]));
}
if (!fs.existsSync(ACTIONS_DB)) {
  fs.writeFileSync(ACTIONS_DB, JSON.stringify([]));
}
if (!fs.existsSync(AUDIT_DB)) {
  fs.writeFileSync(AUDIT_DB, JSON.stringify([]));
}

// =========================
// ENTERPRISE MODE
// =========================

// Role hierarchy (viewer < developer < security < admin)
const ROLE_HIERARCHY = ["viewer", "developer", "security", "admin"];

// RBAC middleware
function authorize(roleRequired) {
  return (req, res, next) => {
    const role = req.headers["x-role"] || "viewer";
    
    if (ROLE_HIERARCHY.indexOf(role) < ROLE_HIERARCHY.indexOf(roleRequired)) {
      console.warn(`[RBAC] Role ${role} insufficient for ${roleRequired}`);
      return res.status(403).json({ error: "Forbidden - insufficient permissions" });
    }
    
    next();
  };
}

// Policy engine
const policies = [
  {
    name: "BLOCK_CRITICAL",
    condition: e => e.level === "CRITICAL",
    action: "BLOCK_DEPLOY"
  },
  {
    name: "REQUIRE_ROTATION_SECRET_LEAK",
    condition: e => e.type === "SECRET_LEAK",
    action: "REQUIRE_ROTATION"
  },
  {
    name: "BLOCK_HIGH_RISK_PROD",
    condition: e => e.level === "HIGH" && e.env === "production",
    action: "BLOCK_DEPLOY"
  },
  {
    name: "ALERT_ORG_ATTACK",
    condition: e => e.type === "ORG_ATTACK_PATTERN",
    action: "ALERT_ALL"
  }
];

// Enforce policies
function enforce(event) {
  const triggeredPolicies = [];
  
  policies.forEach(p => {
    if (p.condition(event)) {
      triggeredPolicies.push({ name: p.name, action: p.action });
      triggerAction(p.action, event);
    }
  });
  
  return triggeredPolicies;
}

// Trigger action
function triggerAction(action, event) {
  console.log(`[POLICY] Action triggered: ${action} for event ${event.id}`);
  
  const actions = readActions();
  actions.push({
    id: Date.now(),
    time: new Date().toISOString(),
    action,
    event: event.id,
    status: "triggered"
  });
  writeActions(actions);
}

// Cross-repo anomaly detection
function detectCrossRepoAnomaly(events) {
  const recentEvents = events.filter(e => {
    const eventTime = new Date(e.time);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return eventTime > oneHourAgo;
  });
  
  const highRiskEvents = recentEvents.filter(e => e.level === "HIGH" || e.level === "CRITICAL");
  
  // Detect coordinated attacks (5+ high-risk events in different repos within 1 hour)
  const uniqueRepos = new Set(highRiskEvents.map(e => e.repo));
  
  if (uniqueRepos.size >= 5) {
    return {
      type: "ORG_ATTACK_PATTERN",
      severity: "CRITICAL",
      description: "Coordinated attack detected across multiple repositories",
      affectedRepos: Array.from(uniqueRepos)
    };
  }
  
  // Detect systemic issues (same issue in 3+ repos)
  const issueTypes = {};
  highRiskEvents.forEach(e => {
    if (!issueTypes[e.type]) issueTypes[e.type] = new Set();
    issueTypes[e.type].add(e.repo);
  });
  
  for (const [type, repos] of Object.entries(issueTypes)) {
    if (repos.size >= 3) {
      return {
        type: "SYSTEMIC_ISSUE",
        severity: "HIGH",
        description: `Systemic ${type} detected across multiple repositories`,
        affectedRepos: Array.from(repos)
      };
    }
  }
  
  return null;
}

// Abuse prevention - payload validation
function validateEvent(event) {
  const required = ["type", "level"];
  for (const field of required) {
    if (!event[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  
  // Validate event size
  const eventSize = JSON.stringify(event).length;
  if (eventSize > 10000) { // 10KB max
    return { valid: false, error: "Event payload too large" };
  }
  
  // Validate allowed fields
  const allowedFields = [
    "org", "repo", "env", "service", "type", "level", "risk", 
    "actor", "time", "signals", "author", "anomalyScore", "anomalous", "drift"
  ];
  const eventFields = Object.keys(event);
  const unknownFields = eventFields.filter(f => !allowedFields.includes(f));
  
  if (unknownFields.length > 0) {
    return { valid: false, error: `Unknown fields: ${unknownFields.join(", ")}` };
  }
  
  return { valid: true };
}

// =========================
// PRODUCTION HARDENING
// =========================

// 1. Observability (request logging)
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url} from ${req.ip} (role: ${req.headers["x-role"] || "none"})`);
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
  if (req.path.startsWith("/events") || req.path.startsWith("/stats") || req.path.startsWith("/actions") || req.path.startsWith("/ingest")) {
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
  if (req.path === "/event" || req.path === "/ingest") {
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

function readAudit() {
  try {
    return JSON.parse(fs.readFileSync(AUDIT_DB, "utf8"));
  } catch (e) {
    console.error("[DB] Failed to read audit log:", e.message);
    return [];
  }
}

function writeAudit(audit) {
  fs.writeFileSync(AUDIT_DB, JSON.stringify(audit, null, 2));
}

// =========================
// AUDIT TRAIL
// =========================

function auditLog(action, details, actor) {
  const audit = readAudit();
  audit.push({
    id: Date.now(),
    time: new Date().toISOString(),
    action,
    details,
    actor: actor || "system",
    signature: sign({ action, details, actor })
  });
  
  // Keep only last 5000 audit entries
  if (audit.length > 5000) {
    audit.shift();
  }
  
  writeAudit(audit);
}

// =========================
// API ENDPOINTS
// =========================

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString(), mode: "enterprise" });
});

// Central ingestion gateway (enterprise mode)
app.post("/ingest", authorize("developer"), (req, res) => {
  const event = req.body;
  
  // Validate event structure
  const validation = validateEvent(event);
  if (!validation.valid) {
    console.warn(`[VALIDATION] ${validation.error}`);
    auditLog("INGEST_FAILED", { error: validation.error, event }, req.headers["x-role"]);
    return res.status(400).json({ error: validation.error });
  }
  
  // Add multi-tenant metadata if missing
  if (!event.org) event.org = DEFAULT_ORG;
  if (!event.time) event.time = new Date().toISOString();
  
  const events = readEvents();
  const e = {
    id: Date.now(),
    ...event,
    signature: sign(event)
  };
  events.push(e);
  
  // Keep only last 1000 events
  if (events.length > 1000) {
    events.shift();
  }
  
  writeEvents(events);
  
  // Enforce policies
  const triggeredPolicies = enforce(e);
  
  // Detect cross-repo anomalies
  const anomaly = detectCrossRepoAnomaly(events);
  if (anomaly) {
    console.warn(`[ANOMALY] ${anomaly.type}: ${anomaly.description}`);
    enforce({
      id: Date.now(),
      type: anomaly.type,
      level: anomaly.severity,
      time: new Date().toISOString(),
      org: event.org
    });
  }
  
  auditLog("INGEST_SUCCESS", { eventId: e.id, policies: triggeredPolicies }, req.headers["x-role"]);
  
  // Trigger SOC brain (async, non-blocking)
  runSOC(events, { silent: true, autoAct: false, adaptive: true })
    .then(result => {
      console.log(`[SOC] Processed ${result.events} events, ${result.incidents} incidents`);
    })
    .catch(err => {
      console.error(`[SOC] Error:`, err.message);
    });
  
  res.json({ ok: true, id: e.id, policies: triggeredPolicies });
});

// Legacy event endpoint (backward compatibility)
app.post("/event", (req, res) => {
  const event = req.body;
  
  // Validate event structure
  const validation = validateEvent(event);
  if (!validation.valid) {
    console.warn(`[VALIDATION] ${validation.error}`);
    auditLog("INGEST_FAILED", { error: validation.error, event }, "legacy");
    return res.status(400).json({ error: validation.error });
  }
  
  // Add multi-tenant metadata if missing
  if (!event.org) event.org = DEFAULT_ORG;
  if (!event.time) event.time = new Date().toISOString();
  
  const events = readEvents();
  const e = {
    id: Date.now(),
    ...event,
    signature: sign(event)
  };
  events.push(e);
  
  // Keep only last 1000 events
  if (events.length > 1000) {
    events.shift();
  }
  
  writeEvents(events);
  
  // Enforce policies
  const triggeredPolicies = enforce(e);
  
  auditLog("INGEST_SUCCESS", { eventId: e.id, policies: triggeredPolicies }, "legacy");
  
  res.json({ ok: true, id: e.id, policies: triggeredPolicies });
});

// List events (with enterprise filters)
app.get("/events", authorize("viewer"), (req, res) => {
  const events = readEvents();
  const { repo, level, org, env, limit } = req.query;
  
  let filtered = events;
  
  if (repo) filtered = filtered.filter(e => e.repo === repo);
  if (level) filtered = filtered.filter(e => e.level === level);
  if (org) filtered = filtered.filter(e => e.org === org);
  if (env) filtered = filtered.filter(e => e.env === env);
  
  const limitNum = parseInt(limit) || 100;
  res.json(filtered.slice(-limitNum));
});

// Quick stats (with enterprise breakdown)
app.get("/stats", authorize("viewer"), (req, res) => {
  const events = readEvents();
  const { org } = req.query;
  
  let filtered = events;
  if (org) filtered = filtered.filter(e => e.org === org);
  
  const byLevel = filtered.reduce((a, e) => {
    a[e.level] = (a[e.level] || 0) + 1;
    return a;
  }, {});
  
  const byType = filtered.reduce((a, e) => {
    a[e.type] = (a[e.type] || 0) + 1;
    return a;
  }, {});
  
  const byRepo = filtered.reduce((a, e) => {
    if (e.repo) a[e.repo] = (a[e.repo] || 0) + 1;
    return a;
  }, {});
  
  const byEnv = filtered.reduce((a, e) => {
    if (e.env) a[e.env] = (a[e.env] || 0) + 1;
    return a;
  }, {});
  
  res.json({
    total: filtered.length,
    byLevel,
    byType,
    byRepo,
    byEnv
  });
});

// Action queue
app.post("/action", authorize("security"), (req, res) => {
  const { type, payload } = req.body;
  
  const actions = readActions();
  const action = {
    id: Date.now(),
    time: new Date().toISOString(),
    type,
    payload,
    status: "pending",
    signature: sign({ type, payload })
  };
  
  actions.push(action);
  writeActions(actions);
  
  console.log("⚡ Action received:", type);
  auditLog("ACTION_RECEIVED", { type, payload }, req.headers["x-role"]);
  
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
app.get("/actions", authorize("security"), (req, res) => {
  const actions = readActions();
  const limit = parseInt(req.query.limit) || 50;
  res.json(actions.slice(-limit));
});

// Audit trail (admin only)
app.get("/audit", authorize("admin"), (req, res) => {
  const audit = readAudit();
  const limit = parseInt(req.query.limit) || 100;
  res.json(audit.slice(-limit));
});

// Policy management (admin only)
app.get("/policies", authorize("admin"), (req, res) => {
  res.json(policies.map(p => ({ name: p.name, action: p.action })));
});

// Serve static files (dashboard)
app.use(express.static(__dirname));

// Error handling
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  auditLog("ERROR", { error: err.message, path: req.path }, req.headers["x-role"]);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.CC_PORT || 4000;

app.listen(PORT, () => {
  console.log(`🛡️ Security Command Center (Enterprise Mode) running on http://localhost:${PORT}`);
  if (!AUTH_TOKEN) {
    console.warn("⚠️ WARNING: CC_TOKEN not configured - authentication disabled");
  }
  console.log(`🏢 Organization: ${DEFAULT_ORG}`);
  console.log(`🔐 Trusted sources: ${TRUSTED_SOURCES.join(", ")}`);
});
