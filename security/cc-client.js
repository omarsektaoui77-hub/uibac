// ZeroLeak Security Command Center - Client (Enterprise Mode)
// Connects security systems to the command center with multi-tenant support

const http = require("http");

const CC_HOST = process.env.CC_HOST || "localhost";
const CC_PORT = process.env.CC_PORT || 4000;
const CC_TOKEN = process.env.CC_TOKEN;
const CC_SOURCE = process.env.CC_SOURCE || "local";
const CC_ROLE = process.env.CC_ROLE || "developer";
const CC_ORG = process.env.CC_ORG || "default-org";
const CC_REPO = process.env.CC_REPO;
const CC_ENV = process.env.CC_ENV || "development";
const CC_SERVICE = process.env.CC_SERVICE || "unknown";

/**
 * Send event to command center (enterprise mode)
 */
async function sendEvent(event) {
  try {
    // Add multi-tenant metadata
    const enterpriseEvent = {
      org: CC_ORG,
      repo: CC_REPO,
      env: CC_ENV,
      service: CC_SERVICE,
      actor: process.env.USER || process.env.USERNAME || "unknown",
      ...event
    };
    
    const data = JSON.stringify(enterpriseEvent);
    
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
      "x-source": CC_SOURCE,
      "x-role": CC_ROLE
    };
    
    // Add auth token if configured
    if (CC_TOKEN) {
      headers["x-cc-token"] = CC_TOKEN;
    }
    
    const options = {
      hostname: CC_HOST,
      port: CC_PORT,
      path: "/event",
      method: "POST",
      headers
    };
    
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ ok: true });
          }
        });
      });
      
      req.on("error", (e) => {
        // Fail silently (don't block dev flow)
        console.warn("[CC] Failed to send event:", e.message);
        resolve({ ok: false });
      });
      
      req.write(data);
      req.end();
    });
  } catch (e) {
    // Fail silently (don't block dev flow)
    console.warn("[CC] Failed to send event:", e.message);
    return { ok: false };
  }
}

/**
 * Send action to command center (enterprise mode)
 */
async function sendAction(type, payload = {}) {
  try {
    const data = JSON.stringify({ type, payload });
    
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
      "x-source": CC_SOURCE,
      "x-role": CC_ROLE
    };
    
    // Add auth token if configured
    if (CC_TOKEN) {
      headers["x-cc-token"] = CC_TOKEN;
    }
    
    const options = {
      hostname: CC_HOST,
      port: CC_PORT,
      path: "/action",
      method: "POST",
      headers
    };
    
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ ok: true });
          }
        });
      });
      
      req.on("error", (e) => {
        console.warn("[CC] Failed to send action:", e.message);
        resolve({ ok: false });
      });
      
      req.write(data);
      req.end();
    });
  } catch (e) {
    console.warn("[CC] Failed to send action:", e.message);
    return { ok: false };
  }
}

/**
 * Get events from command center (with enterprise filters)
 */
async function getEvents(filters = {}) {
  try {
    const headers = {};
    
    // Add auth token if configured
    if (CC_TOKEN) {
      headers["x-cc-token"] = CC_TOKEN;
    }
    
    // Add role header
    if (CC_ROLE) {
      headers["x-role"] = CC_ROLE;
    }
    
    const queryParams = new URLSearchParams({
      limit: filters.limit || 100,
      ...filters
    });
    
    const options = {
      hostname: CC_HOST,
      port: CC_PORT,
      path: `/events?${queryParams}`,
      method: "GET",
      headers
    };
    
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve([]);
          }
        });
      });
      
      req.on("error", (e) => {
        console.warn("[CC] Failed to get events:", e.message);
        resolve([]);
      });
      
      req.end();
    });
  } catch (e) {
    console.warn("[CC] Failed to get events:", e.message);
    return [];
  }
}

/**
 * Get stats from command center (with org filter)
 */
async function getStats(org = null) {
  try {
    const headers = {};
    
    // Add auth token if configured
    if (CC_TOKEN) {
      headers["x-cc-token"] = CC_TOKEN;
    }
    
    // Add role header
    if (CC_ROLE) {
      headers["x-role"] = CC_ROLE;
    }
    
    const path = org ? `/stats?org=${org}` : "/stats";
    
    const options = {
      hostname: CC_HOST,
      port: CC_PORT,
      path: path,
      method: "GET",
      headers
    };
    
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ total: 0, byLevel: {}, byType: {}, byRepo: {}, byEnv: {} });
          }
        });
      });
      
      req.on("error", (e) => {
        console.warn("[CC] Failed to get stats:", e.message);
        resolve({ total: 0, byLevel: {}, byType: {}, byRepo: {}, byEnv: {} });
      });
      
      req.end();
    });
  } catch (e) {
    console.warn("[CC] Failed to get stats:", e.message);
    return { total: 0, byLevel: {}, byType: {}, byRepo: {}, byEnv: {} };
  }
}

module.exports = {
  sendEvent,
  sendAction,
  getEvents,
  getStats
};
