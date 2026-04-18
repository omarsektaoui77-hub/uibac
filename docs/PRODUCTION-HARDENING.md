# 🛡️ Production Hardening - Security Command Center

## Overview

This document outlines the production hardening measures implemented for the ZeroLeak Security Command Center.

## 🔐 Authentication

### Environment Variables

```bash
CC_TOKEN=your-secret-token-here
CC_SECRET=your-hmac-secret-here
CC_TRUSTED_SOURCES=trusted-ci,local
```

### Configuration

- **CC_TOKEN**: Required for accessing protected endpoints (`/events`, `/stats`, `/actions`)
- **CC_SECRET**: Used for HMAC signatures to ensure log integrity
- **CC_TRUSTED_SOURCES**: Comma-separated list of allowed sources for event ingestion

### Access Control

- Public endpoints: `/`, `/index.html`, `/health`
- Protected endpoints: `/events`, `/stats`, `/actions`
- Auth header: `x-cc-token: YOUR_TOKEN`

### Example Usage

```bash
# Without auth (development)
curl http://localhost:4000/stats

# With auth (production)
curl -H "x-cc-token: YOUR_TOKEN" http://localhost:4000/stats
```

## 🚫 Rate Limiting

### Configuration

- Window: 1 minute
- Max requests: 100 per IP
- Message: "Too many requests from this IP"

### Purpose

- Prevents spam attacks
- Prevents flooding of the system
- Protects against DoS attempts

## 🔒 Secure Event Ingestion

### Source Validation

Only trusted sources can send events:

```bash
# Required header
x-source: trusted-ci
```

### Trusted Sources

- `trusted-ci`: CI/CD pipeline
- `local`: Local development
- Custom sources can be added via `CC_TRUSTED_SOURCES`

### Example

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-source: trusted-ci" \
  -H "x-cc-token: YOUR_TOKEN" \
  -d '{"type":"SCAN","risk":5,"level":"MEDIUM"}' \
  http://localhost:4000/event
```

## 📦 Tamper-Resistant Logging

### HMAC Signatures

All events and actions are signed using HMAC-SHA256:

```javascript
signature = crypto.createHmac("sha256", CC_SECRET)
  .update(JSON.stringify(entry))
  .digest("hex")
```

### Verification

To verify log integrity:

```javascript
const crypto = require("crypto");

function verify(entry, secret) {
  const computed = crypto.createHmac("sha256", secret)
    .update(JSON.stringify(entry))
    .digest("hex");
  return computed === entry.signature;
}
```

### Purpose

- Logs cannot be modified silently
- Detects tampering attempts
- Ensures audit trail integrity

## 🧱 Network Hardening

### Port Configuration

```bash
CC_PORT=4000
```

### Recommendations

- Use only required ports
- Restrict outbound traffic
- No wildcard domains
- Same principle as runtime guard

## 📊 Observability

### Request Logging

All requests are logged with:

```javascript
[REQ] GET /events from 127.0.0.1
```

### Error Logging

Errors are logged with context:

```javascript
[DB] Failed to read events: ...
[AUTH] Unauthorized access attempt from 192.168.1.1
[SECURE] Untrusted source attempt: malicious-source
```

### Health Check

```bash
curl http://localhost:4000/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2024-04-18T02:00:00.000Z"
}
```

## 🔐 Secrets Handling

### Best Practices

✅ **DO:**
- Store tokens in environment variables
- Mask tokens in logs
- Rotate tokens regularly
- Use different tokens per environment

❌ **DON'T:**
- Hardcode tokens in code
- Expose webhooks in logs
- Reuse tokens across environments
- Commit tokens to git

### Example Environment File

```bash
# .env.production
CC_TOKEN=prod-token-unique-12345
CC_SECRET=prod-hmac-secret-unique-67890
CC_TRUSTED_SOURCES=trusted-ci,prod-service
CC_PORT=4000
```

## 🌐 Deployment

### Development

```bash
# Start without auth (development mode)
node security/command-center/server.js
```

### Production

```bash
# Start with auth (production mode)
CC_TOKEN=your-token CC_SECRET=your-secret node security/command-center/server.js
```

### Vercel Deployment

```bash
# Set environment variables in Vercel dashboard
CC_TOKEN=your-vercel-token
CC_SECRET=your-vercel-secret
CC_TRUSTED_SOURCES=trusted-ci,vercel
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 4000
CMD ["node", "security/command-center/server.js"]
```

## 🚨 Alert Reliability

### Multiple Channels

Don't rely on a single alert channel. Use:

- Slack (primary)
- Email (fallback)
- PagerDuty (critical)

### Fallback Strategy

```javascript
try {
  await sendSlackAlert(message);
} catch (e) {
  console.error("Slack failed, trying email");
  await sendEmailAlert(message);
}
```

## 🔁 Backup & Recovery

### Database Backup

```bash
# Backup events
cp security/command-center/cc-events.json backups/cc-events-$(date +%Y%m%d).json

# Backup actions
cp security/command-center/cc-actions.json backups/cc-actions-$(date +%Y%m%d).json
```

### Retention Policy

- Keep last 7 days of backups
- Rotate daily
- Test restore monthly

### Restore Procedure

```bash
# Restore from backup
cp backups/cc-events-20240418.json security/command-center/cc-events.json
cp backups/cc-actions-20240418.json security/command-center/cc-actions.json
```

## 🧠 Policy Enforcement

### HIGH/CRITICAL Events

- Must block CI
- No override without audit log
- All actions recorded

### Example CI Workflow

```yaml
- name: Security Command Center
  run: node security/self-heal.js
  env:
    CC_TOKEN: ${{ secrets.CC_TOKEN }}
    CC_SOURCE: trusted-ci
```

## ⚠️ Security Considerations

### Current Limitations

- JSON file database (consider SQLite or Postgres for production)
- No user authentication (token-based only)
- No encryption at rest (use encrypted storage)

### Future Improvements

- Replace JSON with SQLite or external DB
- Add user authentication with roles
- Implement encryption at rest
- Add audit log export
- Implement real-time alerts

## 🧪 Testing

### Authentication Test

```bash
# Should fail
curl -H "x-cc-token: wrong-token" http://localhost:4000/stats

# Should succeed
curl -H "x-cc-token: correct-token" http://localhost:4000/stats
```

### Rate Limit Test

```bash
# Should succeed
for i in {1..100}; do curl http://localhost:4000/health; done

# Should fail
curl http://localhost:4000/health
```

### Source Validation Test

```bash
# Should fail
curl -X POST -H "x-source: malicious" http://localhost:4000/event

# Should succeed
curl -X POST -H "x-source: trusted-ci" http://localhost:4000/event
```

## 📋 Checklist

Before deploying to production:

- [ ] Set `CC_TOKEN` to a strong, unique value
- [ ] Set `CC_SECRET` to a strong, unique value
- [ ] Configure `CC_TRUSTED_SOURCES` appropriately
- [ ] Enable authentication in production
- [ ] Set up rate limiting
- [ ] Configure backup schedule
- [ ] Set up monitoring and alerts
- [ ] Test authentication
- [ ] Test rate limiting
- [ ] Test source validation
- [ ] Verify log integrity
- [ ] Configure environment-specific tokens
- [ ] Document incident response procedures

## 🔗 Related Documentation

- [Zero Trust Mode](./ZERO-TRUST-MODE.md)
- [Slack Autofix Setup](./STEP9-SLACK-AUTOFIX-SETUP.md)
