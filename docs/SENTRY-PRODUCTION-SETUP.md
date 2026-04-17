# Sentry Production-Grade Monitoring Setup

## 1. Environment Configuration

Add to `.env.local`:

```env
# Required
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# Release Tracking
NEXT_PUBLIC_RELEASE=1.0.0

# Environment
NEXT_PUBLIC_APP_ENV=local
```

### Dynamic Release Versioning (Recommended)

For production deployments, use git commit hash:

```bash
# In your deployment script or CI/CD
export NEXT_PUBLIC_RELEASE=$(git rev-parse --short HEAD)

# Or use the helper script
export NEXT_PUBLIC_RELEASE=$(node scripts/get-release.js)
```

## 2. Sentry Dashboard Alert Configuration

### Alert Rule 1: Error Spike Detection

1. Navigate to **Alerts → Create Alert Rule**
2. Select **Errors**
3. Set condition: `event count > 10 in 1 minute`
4. Action: Send email / Slack / webhook
5. Filter: `release:latest` or specific environment

### Alert Rule 2: New Issue Detection

1. Navigate to **Alerts → Create Alert Rule**
2. Select **Issues**
3. Set condition: `A new issue is created`
4. Action: Immediate email / Slack notification

### Alert Rule 3: User Impact Threshold

1. Set condition: `Users affected > 5 in 5 minutes`
2. Action: PagerDuty / high-priority notification

## 3. Production Build Validation

```bash
# Clean build
npm run build

# Start production server
npm start

# Test endpoints
curl http://localhost:3000/api/sentry-test
curl http://localhost:3000/api/perf-test
```

### Verify in Sentry Dashboard:

- [ ] Errors have release version attached
- [ ] Stack traces are readable (source maps working)
- [ ] User context is visible
- [ ] Performance traces show latency

## 4. User Impact Tracking

In your auth flow, call:

```typescript
import { setSentryUser } from '@/lib/sentry/userContext';

// After login
setSentryUser({
  id: user.id,
  email: user.email,
  username: user.username,
  role: user.role,
});

// On logout
import { clearSentryUser } from '@/lib/sentry/userContext';
clearSentryUser();
```

## 5. Session Replay

Already configured in `instrumentation-client.ts`:

- 10% of sessions recorded
- 100% of error sessions recorded

View replays in Sentry Dashboard → Replays

## 6. Noise Filtering

The following errors are automatically filtered:

- `ResizeObserver loop limit exceeded`
- `Non-Error exception captured`

To add more filters, edit `beforeSend` in:
- `/app/instrumentation.ts` (server)
- `/app/instrumentation-client.ts` (client)

## 7. Custom Fingerprinting (Optional)

For better error grouping:

```typescript
Sentry.captureException(error, {
  fingerprint: ["database-timeout", error.message],
  tags: {
    component: "UserProfile",
  },
});
```

## 8. End-to-End Validation Checklist

Run all tests and verify in Sentry:

| Test | Action | Expected Result |
|------|--------|-----------------|
| Client Error | Click "Trigger Client Error" | Error with release tag |
| Manual Capture | Click "Capture With Metadata" | Error with custom tags |
| Server Error | `GET /api/sentry-test` | Server-side error captured |
| Performance | `GET /api/perf-test` | 1.2s trace visible |
| Render Crash | `GET /crash-test` | Global error captured |
| User Context | Set user in auth flow | User visible in issue |
| Alert Spike | Trigger 10+ errors rapidly | Alert notification sent |

## 9. Incident Response Workflow

When alert fires:

1. Check Sentry Dashboard for affected users
2. Identify release version in event tags
3. Review session replay if available
4. Rollback to previous release if needed
5. Mark issue as resolved after fix deploys

## 10. Maintenance

- Review error trends weekly
- Update noise filters as needed
- Monitor sampling rates (adjust if costs increase)
- Keep release versions consistent with deployments
