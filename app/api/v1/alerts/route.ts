import { NextRequest, NextResponse } from "next/server";
import { createIncident, IncidentSeverity } from "@/core/analytics/incident/incidentStore";
import { shouldAutoFix, generatePatch } from "@/core/ai/patchAgent";
import { isGitHubConfigured, createAutoFixPR } from "@/infra/github/createPR";
import {
  sendSlackAlert,
  notifyFixCreated,
  notifyFixSkipped,
  isSlackConfigured,
} from "@/infra/slack/notify";
import {
  validateFix,
  recordFixSuccess,
  recordFixFailure,
  incrementPRCounter,
  getCircuitStatus,
} from "@/core/sre/circuitBreaker";
import {
  initTraceContext,
  traceFixGenerated,
  tracePRCreated,
  traceManualReview,
  traceCircuitBreakerBlocked,
  storeTraceContext,
  getTraceDescriptionForPR,
  generateCorrelationId,
} from "@/core/sre/traceability";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("[ALERT RECEIVED]", {
      timestamp: new Date().toISOString(),
      level: body.level || "unknown",
      title: body.title,
      environment: body.environment,
    });

    // Determine severity from Sentry payload
    const severity = mapSentryLevelToSeverity(body.level, body.title);

    // Create incident
    const incident = createIncident({
      sentryEventId: body.event?.event_id,
      sentryProject: body.project_name,
      title: body.title || "Unknown Alert",
      message: body.message || body.description,
      severity,
      environment: body.environment || "unknown",
      release: body.event?.release,
      culprit: body.culprit,
      url: body.url,
      timestamp: new Date().toISOString(),
      metadata: {
        platform: body.event?.platform,
        runtime: body.event?.runtime,
        userCount: body.event?.user_count,
      },
    });

    // Initialize traceability context for closed-loop debugging
    const traceContext = initTraceContext(
      incident.message || incident.title,
      incident.sentryEventId,
      severity,
      incident.environment
    );

    // Store correlation ID for tracking
    const correlationId = generateCorrelationId();
    console.log("[TRACEABILITY] Correlation ID:", correlationId);
    console.log("[TRACEABILITY] Error ID:", traceContext.errorId);
    console.log("[TRACEABILITY] Fix ID:", traceContext.fixId);

    // Send initial Slack notification for all incidents
    if (isSlackConfigured()) {
      await sendSlackAlert({
        title: incident.title,
        severity,
        message: incident.message || 'No message provided',
        incidentId: incident.id,
        environment: incident.environment,
        timestamp: incident.timestamp,
        errorType: traceContext.errorType,
      });
    }

    // Auto-response logic
    let autoFixResult: {
      applied: boolean;
      prUrl?: string;
      prNumber?: number;
      reason?: string;
      fixMessage?: string;
    } = {
      applied: false,
    };

    if (severity === "CRITICAL") {
      console.log("🚨 CRITICAL INCIDENT — Immediate action required");
      console.log("   Incident ID:", incident.id);
      console.log("   Trigger:", incident.title);

      // Trigger Auto-Fix Agent for CRITICAL incidents
      const fixAnalysis = shouldAutoFix(
        severity,
        incident.message,
        body.event?.stacktrace?.join("\n")
      );

      // 🛡️ CIRCUIT BREAKER: Validate fix before attempting
      const validation = validateFix(fixAnalysis);

      console.log("🛡️  CIRCUIT BREAKER CHECK:", {
        allowed: validation.allowed,
        riskLevel: validation.riskLevel,
        confidence: validation.confidence?.toFixed(2),
        checks: validation.checks,
      });

      // Update trace context with analysis result
      const updatedContext = validation.allowed
        ? traceFixGenerated(
            traceContext,
            validation.confidence || 0,
            fixAnalysis.patch?.patch?.split('\n').length || 0
          )
        : traceCircuitBreakerBlocked(traceContext, validation);

      if (
        fixAnalysis.shouldFix &&
        fixAnalysis.patch &&
        isGitHubConfigured() &&
        validation.allowed
      ) {
        console.log("🤖 AUTO-FIX AGENT: Circuit breaker passed. Generating PR...");

        // Get trace description for PR body
        const traceDescription = getTraceDescriptionForPR(updatedContext);

        const prResult = await createAutoFixPR({
          filePath: fixAnalysis.patch.file,
          newContent: generatePatchedFileContent(fixAnalysis.patch, traceDescription),
          patchMessage: fixAnalysis.patch.message,
          incidentTitle: incident.title,
          incidentMessage: incident.message,
          incidentUrl: incident.url,
        });

        if (prResult.success) {
          console.log("✅ AUTO-FIX PR CREATED:", prResult.prUrl);
          recordFixSuccess();
          incrementPRCounter();

          // Update trace context with PR info
          const finalContext = tracePRCreated(
            updatedContext,
            prResult.prUrl!,
            prResult.prNumber!
          );
          storeTraceContext(finalContext);

          // Track telemetry for full traceability
          if (typeof window !== 'undefined') {
            const { trackEvent } = require('@/infra/telemetry/trackEvent');
            trackEvent('AUTO_FIX_COMPLETED', {
              correlationId,
              errorId: finalContext.errorId,
              fixId: finalContext.fixId,
              prNumber: finalContext.prNumber,
              prUrl: finalContext.prUrl,
              errorType: finalContext.errorType,
              duration: Date.now() - new Date(finalContext.detectedAt).getTime(),
            });
          }

          autoFixResult = {
            applied: true,
            prUrl: prResult.prUrl,
            prNumber: prResult.prNumber,
            reason: "Auto-fix successfully applied",
            fixMessage: fixAnalysis.patch.message,
          };

          // Send Slack notification about successful auto-fix (with trace info)
          if (isSlackConfigured()) {
            await notifyFixCreated(
              incident.id,
              prResult.prUrl!,
              prResult.prNumber!,
              `${fixAnalysis.patch.message}\n\n*Trace:* \`${finalContext.errorId}\` → \`${finalContext.fixId}\``,
              severity,
              incident.message
            );
          }
        } else {
          console.log("❌ AUTO-FIX FAILED:", prResult.error);
          recordFixFailure();

          autoFixResult = {
            applied: false,
            reason: `PR creation failed: ${prResult.error}`,
          };

          // Send Slack notification about failed auto-fix
          if (isSlackConfigured()) {
            await notifyFixSkipped(
              incident.id,
              `GitHub PR creation failed: ${prResult.error}`,
              severity,
              incident.message
            );
          }
        }
      } else if (!validation.allowed) {
        // Circuit breaker blocked the fix
        console.log("🛡️  CIRCUIT BREAKER BLOCKED:", validation.reason);
        recordFixFailure();

        // Store trace context
        storeTraceContext(updatedContext);

        autoFixResult = {
          applied: false,
          reason: `Circuit breaker: ${validation.reason}`,
          fixMessage: `Trace: ${updatedContext.errorId}`,
        };

        if (isSlackConfigured()) {
          await notifyFixSkipped(
            incident.id,
            `Safety check failed: ${validation.reason}\n\n*Error ID:* \`${updatedContext.errorId}\``,
            severity,
            incident.message
          );
        }
      } else {
        console.log(
          fixAnalysis.patch
            ? `🤖 AUTO-FIX SKIPPED: ${fixAnalysis.reason}`
            : `🤖 AUTO-FIX: No pattern match - ${fixAnalysis.reason}`
        );

        // Track manual review for unknown patterns
        const manualContext = traceManualReview(
          traceContext,
          fixAnalysis.reason || 'Unknown error pattern'
        );
        storeTraceContext(manualContext);

        autoFixResult = {
          applied: false,
          reason: fixAnalysis.reason,
          fixMessage: `Trace: ${manualContext.errorId}`,
        };

        // Send Slack notification that fix was skipped
        if (isSlackConfigured()) {
          await notifyFixSkipped(
            incident.id,
            `${fixAnalysis.reason || 'Unknown error pattern'}\n\n*Error ID:* \`${manualContext.errorId}\``,
            severity,
            incident.message
          );
        }
      }
    } else if (severity === "WARNING") {
      console.log("⚠️  WARNING — Monitor closely");
    }

    return NextResponse.json({
      success: true,
      incident: {
        id: incident.id,
        severity: incident.severity,
        title: incident.title,
      },
      autoFix: autoFixResult,
    });
  } catch (error) {
    console.error("[ALERT WEBHOOK ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to process alert" },
      { status: 500 }
    );
  }
}

function mapSentryLevelToSeverity(level: string, title: string): IncidentSeverity {
  const normalizedLevel = level?.toLowerCase() || "info";

  // CRITICAL: Fatal errors, crashes, 5xx spikes
  if (
    normalizedLevel === "fatal" ||
    title?.toLowerCase().includes("crash") ||
    title?.toLowerCase().includes("500") ||
    title?.toLowerCase().includes("unhandled")
  ) {
    return "CRITICAL";
  }

  // WARNING: Errors, high latency, degraded performance
  if (
    normalizedLevel === "error" ||
    title?.toLowerCase().includes("latency") ||
    title?.toLowerCase().includes("slow") ||
    title?.toLowerCase().includes("degraded")
  ) {
    return "WARNING";
  }

  // INFO: Everything else
  return "INFO";
}

// GET endpoint to check webhook status
export async function GET() {
  // Get circuit breaker status for monitoring
  const circuitStatus = getCircuitStatus();

  return NextResponse.json({
    status: "ready",
    endpoint: "/api/alerts",
    supportedMethods: ["POST"],
    features: [
      "severity-mapping",
      "incident-creation",
      "auto-response",
      "auto-fix-agent",
      "github-pr-creation",
      "slack-notifications",
      "circuit-breaker",
    ],
    circuitBreaker: {
      healthy: circuitStatus.healthy,
      prCount: circuitStatus.state.prCount,
      maxPRPerHour: circuitStatus.config.MAX_PR_PER_HOUR,
      isOpen: circuitStatus.state.isOpen,
      consecutiveFailures: circuitStatus.state.consecutiveFailures,
      minConfidence: circuitStatus.config.MIN_CONFIDENCE,
      maxPatchLines: circuitStatus.config.MAX_PATCH_LINES,
    },
    integrations: {
      github: {
        configured: isGitHubConfigured(),
        envVars: ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"],
      },
      slack: {
        configured: isSlackConfigured(),
        envVar: "SLACK_WEBHOOK_URL",
      },
    },
    autoFix: {
      enabled: true,
      patterns: [
        "undefined/null access",
        "fetch/network errors",
        "type errors (not a function)",
        "array safety",
        "JSON parse errors",
        "reference errors",
      ],
    },
  });
}

/**
 * Generate patched file content based on patch result
 * In production, this would properly apply the diff
 */
function generatePatchedFileContent(patch: any, traceDescription?: string): string {
  const timestamp = new Date().toISOString();
  const traceSection = traceDescription
    ? `//\n// ## Traceability Context\n//\n${traceDescription.split('\n').join('\n// ')}`
    : '';

  return `// Auto-generated fix for: ${patch.message}
// Generated at: ${timestamp}
//
// Original patch suggestion:
/*
${patch.patch}
*/
${traceSection}

export {};
`;
}
