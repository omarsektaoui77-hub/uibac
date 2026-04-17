# Sentry Alert Configuration Guide

## Incident Response System Overview

```
Sentry Error → Alert Rule → Webhook → Incident Store → Dashboard
```

---

## Severity Levels

### 🔴 CRITICAL (Immediate Response)

**Triggers:**
- Fatal errors
- App crashes (global-error boundary)
- API route failures (5xx spike)
- Unhandled exceptions

**Response Time:** Immediate (< 5 minutes)

**Actions:**
- Email notification
- Webhook trigger
- Auto-create incident
- Console alert: `🚨 CRITICAL INCIDENT`

---

### 🟠 WARNING (Monitor Closely)

**Triggers:**
- High latency (>1000ms)
- Increased error rate (not full outage)
- Performance degradation

**Response Time:** < 30 minutes

**Actions:**
- Email notification
- Webhook trigger
- Console alert: `⚠️  WARNING`

---

### 🟢 INFO (Logging Only)

**Triggers:**
- Manual captures
- Debug events
- Low-priority issues

**Response Time:** Review during business hours

**Actions:**
- Log to incident store
- No immediate notification

---

## Sentry Dashboard Configuration

### Step 1: Create Critical Errors Alert

1. Navigate to **Alerts → Create Alert Rule**
2. Select **Errors**
3. Set Conditions:
   - `event.type:error`
   - `event.level:fatal OR event.level:error`
   - Frequency: > 5 events in 1 minute
4. Set Environment: `production`
5. Set Actions:
   - Send email: `ops-team@example.com`
   - Send webhook: `http://your-domain.com/api/alerts`

---

### Step 2: Create Performance Degradation Alert

1. Navigate to **Alerts → Create Alert Rule**
2. Select **Performance**
3. Set Conditions:
   - Transaction duration > 1000ms
   - Count > 10 in 5 minutes
4. Set Actions:
   - Send email
   - Send webhook

---

### Step 3: Create Error Spike Alert

1. Navigate to **Alerts → Create Alert Rule**
2. Select **Issues**
3. Set Conditions:
   - Error rate increases by > 200%
   - Time period: 5 minutes
4. Set Actions:
   - Send email (high priority)
   - Send webhook

---

### Step 4: Configure Webhook

**Webhook URL:**
```
http://localhost:3000/api/alerts
```

**Method:** POST

**Payload Structure:**
```json
{
  "event": {
    "event_id": "...",
    "level": "error",
    "release": "1.0.0",
    "platform": "javascript"
  },
  "title": "Error: Something went wrong",
  "message": "...",
  "environment": "production",
  "project_name": "uibac",
  "url": "..."
}
```

---

## Webhook Processing

The webhook at `/api/alerts`:

1. **Receives** Sentry alert payload
2. **Maps** severity based on level and title
3. **Creates** incident in local store
4. **Triggers** auto-response for CRITICAL incidents
5. **Returns** success response to Sentry

---

## Incident Store API

```typescript
// Create incident
import { createIncident } from "@/lib/incident/incidentStore";

const incident = createIncident({
  title: "Database timeout",
  severity: "CRITICAL",
  environment: "production",
  // ... other fields
});

// Query incidents
import { getAllIncidents, getCriticalIncidents, getIncidentStats } from "@/lib/incident/incidentStore";

const all = getAllIncidents();
const critical = getCriticalIncidents();
const stats = getIncidentStats();

// Update status
import { acknowledgeIncident, resolveIncident } from "@/lib/incident/incidentStore";

acknowledgeIncident("INC-123");
resolveIncident("INC-123");
```

---

## Auto-Response Logic

```typescript
// In /app/api/alerts/route.ts

if (severity === "CRITICAL") {
  console.log("🚨 CRITICAL INCIDENT — Immediate action required");
  
  // Future integrations:
  // await notifySlack(incident);
  // await disableFeatureFlag("problematic-feature");
  // await restartService("api-service");
}
```

---

## Dashboard

**URL:** `http://localhost:3000/incidents`

**Features:**
- Real-time incident list
- Severity-based filtering
- Status management (Acknowledge, Resolve)
- Auto-refresh (5s interval)
- Statistics overview

---

## Validation Checklist

Before going live:

- [ ] All 3 alert rules created in Sentry
- [ ] Webhook URL configured correctly
- [ ] Tested alert firing (manual trigger)
- [ ] Verified incident creation
- [ ] Confirmed dashboard displays incidents
- [ ] Tested acknowledge/resolve actions
- [ ] Validated severity mapping

---

## Noise Reduction

The system automatically filters:

- `ResizeObserver loop limit exceeded`
- `Non-Error exception captured`

To add more filters, edit `beforeSend` in:
- `/app/instrumentation.ts`
- `/app/instrumentation-client.ts`

---

## Production Deployment

1. Update webhook URL to production domain:
   ```
   https://your-domain.com/api/alerts
   ```

2. Replace in-memory store with database:
   - Redis
   - PostgreSQL
   - MongoDB

3. Add notification integrations:
   - Slack webhook
   - PagerDuty
   - Discord

4. Enable auto-restart/retry logic

---

## Monitoring the Monitor

Track webhook health:

```bash
# Check webhook status
curl http://localhost:3000/api/alerts

# Response:
{
  "status": "ready",
  "endpoint": "/api/alerts",
  "features": ["severity-mapping", "incident-creation", "auto-response"]
}
```

---

## Status

After configuration:

```
🚨 INCIDENT RESPONSE SYSTEM: READY
```
