// ZeroLeak Self-Healing Production - Verification Module
// Verifies that fixes worked before marking as successful

const fetch = global.fetch || require("node-fetch");

/**
 * Verify URL returns expected status
 */
async function verify(url, expectedStatus = 200) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual"
    });

    return res.status === expectedStatus;
  } catch (e) {
    console.error("❌ Verification failed:", e.message);
    return false;
  }
}

/**
 * Verify route is accessible
 */
async function verifyRoute(url, path) {
  return await verify(`${url}${path}`);
}

/**
 * Verify redirect is working
 */
async function verifyRedirect(url, expectedRedirect) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual"
    });

    const location = res.headers.get("location");
    return location === expectedRedirect;
  } catch (e) {
    console.error("❌ Redirect verification failed:", e.message);
    return false;
  }
}

/**
 * Verify file is sanitized (no placeholder secrets)
 */
async function verifySanitized(filePath) {
  const fs = require("fs");
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const placeholders = ["PLACEHOLDER", "TODO", "FIXME", "YOUR_KEY"];
    const hasPlaceholder = placeholders.some(p => content.includes(p));
    return !hasPlaceholder;
  } catch (e) {
    console.error("❌ Sanitization verification failed:", e.message);
    return false;
  }
}

/**
 * Generic verification based on incident type
 */
async function executeVerification(incident, url) {
  switch (incident.type) {
    case "ROUTE_TEST":
      if (incident.meta?.path) {
        return await verifyRoute(url, incident.meta.path);
      }
      return await verify(url);
    case "BROKEN_REDIRECT":
      if (incident.meta?.expected) {
        return await verifyRedirect(url, incident.meta.expected);
      }
      return false;
    case "PLACEHOLDER_SECRET":
      if (incident.meta?.file) {
        return await verifySanitized(incident.meta.file);
      }
      return false;
    case "BAD_CONFIG":
      // Config changes verified by route test
      return await verify(url);
    default:
      console.warn(`⚠️ No verification handler for type: ${incident.type}`);
      return false;
  }
}

module.exports = {
  verify,
  verifyRoute,
  verifyRedirect,
  verifySanitized,
  executeVerification
};
