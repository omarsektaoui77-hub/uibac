# AI Intelligence Layer Documentation
# Cognitive SRE System v1.0

This document describes the complete AI-driven Site Reliability Engineering (SRE) system implemented in this codebase. The system provides automated error detection, root cause analysis, safe self-healing, and reliability reporting.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Error Handling Pipeline](#error-handling-pipeline)
4. [Safety Guarantees](#safety-guarantees)
5. [AI Decision Flow](#ai-decision-flow)
6. [Integration Guide](#integration-guide)
7. [Configuration](#configuration)
8. [Monitoring & Alerts](#monitoring--alerts)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR DETECTION LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Sentry     │  │   Telemetry  │  │   Chaos Engineering    │ │
│  │   Webhook    │  │   Events     │  │   Testing              │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘ │
└─────────┼─────────────────┼─────────────────────┼──────────────┘
          │                 │                     │
          └─────────────────┴─────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ROOT CAUSE ANALYSIS (RCA)                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  POST /api/sre/analyze                                    │ │
│  │  • LLM-based analysis (GPT-4o-mini / Claude)            │ │
│  │  • Pattern-based fallback                               │ │
│  │  • Structured output: symptom, trigger, root_cause       │ │
│  │  • Confidence scoring (0.0 - 1.0)                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VECTOR MEMORY LAYER                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  /lib/sre/vectorMemory.ts                                 │ │
│  │  • Error fingerprinting                                   │ │
│  │  • Similarity matching                                    │ │
│  │  • Fix knowledge base                                     │ │
│  │  • Learn from past resolutions                            │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SAFE PATCH GENERATION                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  /lib/ai/patchAgent.ts                                    │ │
│  │  • SafetyManifest validation                              │ │
│  │  • Critical file protection                               │ │
│  │  • Dangerous pattern detection                            │ │
│  │  • Confidence-based flow control                          │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CIRCUIT BREAKER (V2)                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  /lib/sre/circuitBreakerV2.ts                             │ │
│  │  • Multi-tenant support                                     │ │
│  │  • Per-tenant rate limiting                               │ │
│  │  • Consecutive failure tracking                           │ │
│  │  • Auto-reset on cooldown                                 │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌───────────────────┐      ┌───────────────────┐
        │   AUTO-CREATE PR  │      │  SLACK NOTIFICATION│
        │   (confidence     │      │  (manual review)   │
        │    >= 0.9)        │      │                    │
        └───────────────────┘      └───────────────────┘
                    │                         │
                    └────────────┬────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INCIDENT MANAGEMENT                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  /lib/sre/incidentReports.ts                            │ │
│  │  • Structured incident reports                            │ │
│  │  • Impact assessment                                      │ │
│  │  • Root cause documentation                               │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RELIABILITY REPORTING                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  /lib/sre/ReliabilityReport.ts                            │ │
│  │  • MTTR, Uptime, Error-Free Sessions                      │ │
│  │  • Auto-Resolution Rate                                     │ │
│  │  • Investor-ready PDF reports                               │ │
│  │  • Trend analysis                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. LLM-Based RCA API (`/api/sre/analyze`)

**Purpose**: Perform root cause analysis on errors using AI

**Endpoint**:
```http
POST /api/sre/analyze
Content-Type: application/json

{
  "error_message": "Cannot read property 'map' of undefined",
  "stack_trace": "at Component.render (file.ts:42)...",
  "component": "QuestionList",
  "severity": "error"
}
```

**Response**:
```json
{
  "success": true,
  "rca": {
    "symptom": "Application crashes when rendering question list",
    "trigger": "Code attempts to call .map() on undefined data prop",
    "root_cause": "Missing null check on API response before array operations in QuestionList component",
    "confidence": 0.92,
    "affected_components": ["QuestionList", "QuestionCard"],
    "suggested_fix_type": "null_check",
    "code_reference": "components/QuestionList.tsx:42"
  },
  "source": "llm-analysis",
  "timestamp": "2026-04-17T03:18:00.000Z"
}
```

**Features**:
- Supports OpenAI (GPT-4o-mini) and Anthropic (Claude)
- Pattern-based fallback when no API key
- Structured, specific responses (no vague explanations)
- Confidence scoring for decision making

---

### 2. Safe Patch Generator (`/api/sre/generate-patch`)

**Purpose**: Generate minimal, safe code patches from RCA with strict I/O format

**Endpoint**:
```http
POST /api/sre/generate-patch
Content-Type: application/json

{
  "rca": {
    "symptom": "Application crashes when rendering user list",
    "trigger": "Calling .map() on undefined users array",
    "root_cause": "Missing null check before array operations",
    "confidence": 0.92,
    "evidence": ["stack trace line 42"],
    "safe_to_fix": true,
    "suggested_fix_type": "null_check"
  },
  "source_code": "const users = getUsers();\nreturn users.map(u => <User key={u.id} {...u} />);",
  "file_path": "components/UserList.tsx"
}
```

**Response** (Strict Format):
```json
{
  "patch": "@@ -1,2 +1,2 @@\n-const users = getUsers();\n-return users.map(u => <User key={u.id} {...u} />);\n+const users = getUsers();\n+return users?.map(u => <User key={u.id} {...u} />) ?? null;",
  "change_summary": "Added optional chaining for null safety on users array",
  "risk_level": "low",
  "confidence": 0.88,
  "requires_review": false
}
```

**Safety Rules**:
- ❌ Returns empty patch if `safe_to_fix: false`
- ❌ Blocks `.env`, `auth.ts`, `payment.ts`, etc.
- ❌ Detects dangerous patterns (`eval`, SQL injection, secrets)
- ✅ `requires_review: true` if confidence < 0.9 or risk ≠ low
- ✅ Unified diff format only

---

### 3. Safe Patch Agent (`/lib/ai/patchAgent.ts`)

**Purpose**: Generate validated, safe code patches based on RCA

**Key Types**:
```typescript
interface SafetyManifest {
  typescript_valid: boolean;
  lint_clean: boolean;
  tests_pass: boolean;
  no_secrets: boolean;
  no_auth_changes: boolean;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  blocked_reasons: string[];
  auto_approved: boolean;
  requires_review: boolean;
  manual_review_required: boolean;
}

interface SafePatchResult {
  patch: PatchResult | null;
  rca: RCAResult | null;
  manifest: SafetyManifest;
  confidence: number;
  action: 'auto_pr' | 'propose_pr' | 'manual_review' | 'blocked';
  explanation: string;
}
```

**Usage**:
```typescript
import { generateSafePatch } from '@/lib/ai/patchAgent';

const result = await generateSafePatch(
  errorMessage,
  stackTrace,
  component
);

// result.action === 'auto_pr' → Auto-create PR
// result.action === 'propose_pr' → Human approval required
// result.action === 'manual_review' → Send to Slack
// result.action === 'blocked' → Rejected by SafetyManifest
```

**Safety Checks**:
- ❌ Blocks `.env`, `auth.ts`, `payment.ts`, etc.
- ❌ Detects `eval()`, SQL injection, hardcoded secrets
- ❌ Validates TypeScript syntax (mock)
- ❌ Max 50 lines per patch
- ✅ Auto-approve only at 0.9+ confidence

---

### 4. Vector Memory System (`/lib/sre/vectorMemory.ts`)

**Purpose**: Learn from past errors and fixes

**Key Functions**:
```typescript
// Store error with RCA and fix
const knowledge = storeErrorKnowledge(
  fingerprint,
  rca,
  fix,
  tenantId
);

// Find similar errors with fixes
const similar = findSimilarErrorsWithFixes(fingerprint, 5);

// Get recommended fix
const recommendation = findBestFix(
  errorMessage,
  stackTrace,
  component
);
// Returns: { knowledge, confidence, reason }

// Skip RCA if we already know this error
const shouldSkip = shouldSkipRCA(errorMessage, stackTrace);
// Returns: { skip, existingRCA, confidence }
```

**Error Fingerprinting**:
- Normalizes error messages (removes variable values)
- Hashes stack traces (ignores line numbers)
- Calculates similarity using Jaccard index

---

### 5. Multi-Tenant Circuit Breaker V2 (`/lib/sre/circuitBreakerV2.ts`)

**Purpose**: Prevent cascading failures from automated fixes

**Features**:
- Per-tenant circuit breaker states
- Per-tenant rate limiting
- Strict TypeScript types
- Backward compatible with V1

**Configuration**:
```typescript
// Register tenant-specific limits
registerTenantLimits('premium-tier', {
  maxPRPerHour: 10,
  maxConsecutiveFailures: 5,
});

// Validate fix for specific tenant
const validation = validateFixV2(fixAnalysis, 'tenant-123');

// Get tenant status
const status = getCircuitStatusV2('tenant-123');
// Returns: { state, config, healthy, canAcceptFix, rateLimitRemaining }
```

**Rules**:
- Max 3 PRs/hour per tenant (default)
- Circuit opens after 3 consecutive failures
- 30-minute cooldown when circuit opens
- 5-minute cooldown between fixes
- Blocks critical files and dangerous patterns

---

### 6. Reliability Reporting (`/lib/sre/ReliabilityReport.ts`)

**Purpose**: Generate investor-ready reliability reports

**Metrics**:
- **MTTR**: Mean Time To Recovery (seconds)
- **Uptime**: System availability percentage
- **Error-Free Session Rate**: Success rate
- **Auto-Resolution Rate**: Self-healing effectiveness

**Export Formats**:
```typescript
// Generate report
const report = generateReliabilityReport(30); // 30-day period

// Export as JSON
downloadReport(report, 'json');

// Export as Markdown (business-friendly)
downloadReport(report, 'md');

// Export as HTML (PDF-ready)
downloadReport(report, 'html');
```

**Sample Report**:
```markdown
# System Reliability Report
*Period: 2026-03-18 to 2026-04-17 (30 days)*

## 🎯 Executive Summary
System reliability at 99.95% uptime with 2m 34s average recovery time. 
73% of incidents were auto-resolved by AI systems.

## 📊 Key Metrics
| Metric | Value | Status |
|--------|-------|--------|
| System Uptime | 99.95% | ✅ Excellent |
| Mean Time To Recovery | 2m 34s | ✅ Fast |
| Error-Free Sessions | 97.3% | ✅ Excellent |
| Auto-Resolution Rate | 73.0% | ✅ High Automation |
```

---

## Error Handling Pipeline

```
1. ERROR DETECTED
   └─ Sentry webhook / Telemetry / Chaos test
   
2. SEVERITY CLASSIFICATION
   └─ CRITICAL: Auto-fix eligible
   └─ WARNING: Monitor only
   
3. VECTOR MEMORY CHECK
   └─ Have we seen this before?
   └─ Yes → Skip RCA, use existing knowledge
   └─ No → Continue to RCA
   
4. ROOT CAUSE ANALYSIS (RCA)
   └─ LLM analysis → structured result
   └─ Confidence scoring
   
5. SAFE PATCH GENERATION
   └─ Generate patch based on RCA
   └─ SafetyManifest validation
   └─ 6 safety checks
   
6. CIRCUIT BREAKER VALIDATION
   └─ Per-tenant rate limit check
   └─ Consecutive failure check
   └─ Cooldown check
   
7. DECISION
   ├─ confidence >= 0.9 + safe → AUTO-CREATE PR
   ├─ confidence >= 0.7 + safe → PROPOSE PR (human approval)
   └─ confidence < 0.7 or unsafe → SLACK NOTIFICATION
   
8. TRACK OUTCOME
   └─ Success → Store in Vector Memory
   └─ Failure → Record for circuit breaker
   
9. GENERATE REPORTS
   └─ Update reliability metrics
   └─ Log for trend analysis
```

---

## Safety Guarantees

### 1. No Destructive Operations
- ❌ Never delete data
- ❌ Never modify auth/payment logic
- ❌ Never change environment config
- ❌ Never execute arbitrary code

### 2. Confidence Thresholds
- **0.9+**: Auto-create PR
- **0.7-0.89**: Propose PR (requires human approval)
- **< 0.7**: Manual review only

### 3. Circuit Breaker Protection
- **3 consecutive failures** → Circuit opens
- **30-minute cooldown** → Auto-reset
- **Max 3 PRs/hour** → Rate limit

### 4. Critical File Protection
```typescript
const CRITICAL_FILES = [
  'package.json',
  '.env', '.env.local', '.env.production',
  'next.config.js',
  'middleware.ts',
  'auth.ts', 'auth.config.ts',
  'security.ts', 'encrypt.ts', 'password.ts',
  'payment.ts', 'billing.ts',
];
```

### 5. Dangerous Pattern Detection
```typescript
const DANGEROUS_PATTERNS = [
  /eval\s*\(/i,           // eval()
  /Function\s*\(/i,       // new Function()
  /document\.write/i,     // document.write
  /DROP\s+TABLE/i,        // SQL drop
  /api[_-]?key/i,        // API keys
  /password\s*[=:]/i,     // Passwords
];
```

---

## AI Decision Flow

```
                    ┌─────────────────┐
                    │   New Error     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Similar in Memory?│
                    └────────┬────────┘
                      Yes /│\ No
                        /  │  \
                       /   │   \
                      ▼    │    ▼
            ┌──────────┐   │  ┌──────────┐
            │ Use Known │   │  │ RCA API  │
            │ Fix       │   │  │          │
            └─────┬─────┘   │  └────┬─────┘
                  │         │       │
                  └────┬────┘       │
                       │            │
                       ▼            │
              ┌─────────────────┐     │
              │ Generate Patch  │◄──┘
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ SafetyManifest  │
              │ Validation      │
              └────────┬────────┘
                Pass /│\ Fail
                    /  │  \
                   /   │   \
                  ▼    │    ▼
         ┌─────────┐   │  ┌──────────┐
         │ Calculate │   │  │ BLOCKED  │
         │ Confidence│   │  │ → Slack  │
         └────┬────┘   │  └──────────┘
              │        │
              ▼        │
     ┌────────────────┐│
     │ Confidence?    ││
     │ >= 0.9 → Auto  ││
     │ >= 0.7 → Propose││
     │ < 0.7 → Manual ││
     └───────┬────────┘│
             │         │
             ▼         │
    ┌───────────────┐  │
    │ Create PR /   │  │
    │ Notify Slack  │◄─┘
    └───────────────┘
```

---

## Integration Guide

### 1. Setting Up Sentry Webhook

```typescript
// /app/api/alerts/route.ts
import { shouldAutoFixCognitive } from '@/lib/ai/patchAgent';
import { validateFixV2 } from '@/lib/sre/circuitBreakerV2';

export async function POST(request: Request) {
  const alert = await request.json();
  
  // Classify severity
  const severity = classifySeverity(alert);
  
  // Generate safe patch
  const analysis = await shouldAutoFixCognitive(
    severity,
    alert.message,
    alert.stacktrace,
    alert.component
  );
  
  if (analysis.shouldFix && analysis.patch) {
    // Validate against circuit breaker
    const validation = validateFixV2(analysis, tenantId);
    
    if (validation.allowed) {
      // Create PR or notify Slack based on action
      await handleFixAction(analysis, validation);
    }
  }
}
```

### 2. Adding Vector Memory to RCA

```typescript
import { shouldSkipRCA, storeErrorKnowledge } from '@/lib/sre/vectorMemory';

// Before calling expensive RCA API
const { skip, existingRCA, confidence } = shouldSkipRCA(
  errorMessage,
  stackTrace
);

if (skip && confidence > 0.85) {
  // Use existing RCA
  const rca = existingRCA;
} else {
  // Call /api/sre/analyze
  const rca = await performRCA(errorMessage, stackTrace);
}

// After fix is applied
storeErrorKnowledge(
  fingerprint,
  rca,
  { patch, file, description, appliedAt, success },
  tenantId
);
```

### 3. Multi-Tenant Setup

```typescript
// Register tenant configurations
registerTenantLimits('free-tier', {
  maxPRPerHour: 1,
  maxConsecutiveFailures: 2,
});

registerTenantLimits('pro-tier', {
  maxPRPerHour: 5,
  maxConsecutiveFailures: 4,
});

registerTenantLimits('enterprise', {
  maxPRPerHour: 10,
  maxConsecutiveFailures: 5,
});

// Use in validation
const validation = validateFixV2(fixAnalysis, tenantId);
const status = getCircuitStatusV2(tenantId);
```

### 4. Generating Reliability Reports

```typescript
import { generateReliabilityReport, downloadReport } from '@/lib/sre/ReliabilityReport';

// Cron job or manual trigger
export async function generateMonthlyReport() {
  const report = generateReliabilityReport(30);
  
  // Save to file system or upload to S3
  const html = exportReportAsHTML(report);
  await uploadToS3(`reports/reliability-${report.report_id}.html`, html);
  
  // Or trigger download in browser
  downloadReport(report, 'html');
}
```

---

## Configuration

### Environment Variables

```bash
# LLM API Keys (one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# For auto-PR creation
GITHUB_TOKEN=ghp_...

# For Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Optional: Vector DB
PINECONE_API_KEY=...
PINECONE_INDEX=sre-memory
```

### Circuit Breaker Tuning

```typescript
// /lib/sre/circuitBreakerV2.ts
registerTenantLimits('default', {
  maxPRPerHour: 3,           // Reduce for safety
  maxConsecutiveFailures: 3,  // Circuit opens after 3
  customBlockedFiles: ['critical.ts'],  // Additional blocks
});
```

### Vector Memory Configuration

```typescript
// /lib/sre/vectorMemory.ts
configureVectorMemory({
  maxEntries: 2000,           // Keep more history
  similarityThreshold: 0.8,    // More lenient matching
  retentionDays: 180,          // Longer retention
});
```

---

## Monitoring & Alerts

### Circuit Breaker Status

```typescript
// Check all tenants
const allStatuses = getAllTenantStates();
console.table(allStatuses.map(s => ({
  tenant: s.tenantId,
  prCount: s.prCount,
  healthy: !s.isOpen,
  failures: s.consecutiveFailures,
})));
```

### Vector Memory Stats

```typescript
const stats = getMemoryStats();
console.log(`
Total Entries: ${stats.totalEntries}
With Fixes: ${stats.entriesWithFixes}
Success Rate: ${stats.fixSuccessRate.toFixed(1)}%
Avg Resolution: ${(stats.averageResolutionTime / 1000).toFixed(0)}s
`);
```

### Reliability Metrics

```typescript
// Dashboard widget
const metrics = computeReliabilityMetrics(
  incidents,
  events,
  30  // days
);

// Alert on degradation
if (metrics.uptime_percentage < 99.5) {
  await sendAlert('Uptime below SLA');
}

if (metrics.mttr_seconds > 300) {
  await sendAlert('MTTR above threshold');
}
```

---

## Debugging

### Browser Console

```javascript
// Circuit Breaker
circuitBreakerV2.getStatus('tenant-123');
circuitBreakerV2.reset('tenant-123');
circuitBreakerV2.getAllStatuses();

// Vector Memory
vectorMemory.getMemoryStats();
vectorMemory.findBestFix('error message');
vectorMemory.searchKnowledge('null pointer', { hasFix: true });

// Reliability
const report = generateReliabilityReport(30);
console.log(report.executive_summary);
```

---

## Summary

The Cognitive SRE System provides:

| Feature | Status | File |
|---------|--------|------|
| LLM RCA | ✅ Complete | `/api/sre/analyze/route.ts` |
| Safe Patch Generator | ✅ Complete | `/api/sre/generate-patch/route.ts` |
| Safe Patch Agent | ✅ Complete | `/lib/ai/patchAgent.ts` |
| Vector Memory | ✅ Complete | `/lib/sre/vectorMemory.ts` |
| Circuit Breaker V2 | ✅ Complete | `/lib/sre/circuitBreakerV2.ts` |
| Reliability Reports | ✅ Complete | `/lib/sre/ReliabilityReport.ts` |
| Anomaly Detection | ✅ Complete | `/lib/sre/anomalyDetector.ts` |
| Real-time Intelligence | ✅ Complete | `/lib/sre/realtimeIntelligence.ts` |
| AI Intelligence Dashboard | ✅ Complete | `/app/ai-intelligence/page.tsx` |

---

## Next Steps

1. **Deploy RCA API**: Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
2. **Configure Tenants**: Define tenant limits for your users
3. **Set Up Slack**: Configure `SLACK_WEBHOOK_URL` for notifications
4. **Test Pipeline**: Use chaos engineering to validate the system
5. **Monitor Metrics**: Track MTTR, uptime, and auto-resolution rates

---

*Generated: April 2026*  
*Version: 1.0.0*  
*System: Cognitive SRE*
