// ZeroLeak Security Command Center - Client (Production Hardened)
// Connects security systems to the command center

const http = require("http");

const CC_HOST = process.env.CC_HOST || "localhost";
const CC_PORT = process.env.CC_PORT || 4000;
const CC_TOKEN = process.env.CC_TOKEN;
const CC_SOURCE = process.env.CC_SOURCE || "local";

/**
 * Send event to command center
 */
async function sendEvent(event) {
  try {
    const data = JSON.stringify(event);
    
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
      "x-source": CC_SOURCE
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
 * Send action to command center
 */
async function sendAction(type, payload = {}) {
  try {
    const data = JSON.stringify({ type, payload });
    
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
      "x-source": CC_SOURCE
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
 * Get events from command center
 */
async function getEvents(limit = 100) {
  try {
    const headers = {};
    
    // Add auth token if configured
    if (CC_TOKEN) {
      headers["x-cc-token"] = CC_TOKEN;
    }
    
    const options = {
      hostname: CC_HOST,
      port: CC_PORT,
      path: `/events?limit=${limit}`,
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
 * Get stats from command center
 */
async function getStats() {
  try {
    const headers = {};
    
    // Add auth token if configured
    if (CC_TOKEN) {
      headers["x-cc-token"] = CC_TOKEN;
    }
    
    const options = {
      hostname: CC_HOST,
      port: CC_PORT,
      path: "/stats",
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
            resolve({ total: 0, byLevel: {}, byType: {} });
          }
        });
      });
      
      req.on("error", (e) => {
        console.warn("[CC] Failed to get stats:", e.message);
        resolve({ total: 0, byLevel: {}, byType: {} });
      });
      
      req.end();
    });
  } catch (e) {
    console.warn("[CC] Failed to get stats:", e.message);
    return { total: 0, byLevel: {}, byType: {} };
  }
}

module.exports = {
  sendEvent,
  sendAction,
  getEvents,
  getStats
};
