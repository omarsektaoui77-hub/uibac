/**
 * Slack Notification Service
 * Real-time alerts for production incidents
 * Integrates with Sentry → Auto-Fix → GitHub PR pipeline
 */

export interface SlackAlertPayload {
  title: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  incidentId?: string;
  prUrl?: string;
  prNumber?: number;
  fixMessage?: string;
  errorType?: string;
  environment?: string;
  timestamp?: string;
}

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

/**
 * Check if Slack is configured
 */
export function isSlackConfigured(): boolean {
  return !!SLACK_WEBHOOK_URL;
}

/**
 * Send alert to Slack
 * Returns true if sent successfully, false otherwise
 */
export async function sendSlackAlert(payload: SlackAlertPayload): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.log('[SLACK] Notification skipped: SLACK_WEBHOOK_URL not configured');
    return false;
  }

  try {
    const color = payload.severity === 'CRITICAL' 
      ? 'danger' 
      : payload.severity === 'WARNING' 
        ? 'warning' 
        : 'good';

    const emoji = payload.severity === 'CRITICAL' 
      ? '🚨' 
      : payload.severity === 'WARNING' 
        ? '⚠️' 
        : 'ℹ️';

    const slackPayload = {
      text: `${emoji} *${payload.title}*`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Severity',
              value: payload.severity,
              short: true,
            },
            {
              title: 'Environment',
              value: payload.environment || 'unknown',
              short: true,
            },
            {
              title: 'Error Message',
              value: payload.message.length > 500 
                ? payload.message.substring(0, 500) + '...' 
                : payload.message,
              short: false,
            },
            ...(payload.errorType ? [
              {
                title: 'Error Type',
                value: payload.errorType,
                short: true,
              }
            ] : []),
            ...(payload.fixMessage ? [
              {
                title: '🤖 Auto-Fix Generated',
                value: payload.fixMessage,
                short: false,
              }
            ] : []),
            ...(payload.prUrl ? [
              {
                title: '🔧 Pull Request',
                value: `<${payload.prUrl}|View PR #${payload.prNumber || ''}>`,
                short: false,
              }
            ] : []),
            ...(payload.incidentId ? [
              {
                title: 'Incident ID',
                value: payload.incidentId,
                short: true,
              }
            ] : []),
          ],
          footer: 'UIBAC Incident Response System',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
    }

    console.log('[SLACK] ✅ Alert sent:', payload.title);
    return true;
  } catch (error) {
    console.error('[SLACK] ❌ Failed to send alert:', error);
    return false;
  }
}

/**
 * Send simple text message to Slack
 * For non-formatted notifications
 */
export async function sendSlackMessage(text: string): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.log('[SLACK] Message skipped: SLACK_WEBHOOK_URL not configured');
    return false;
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    console.log('[SLACK] ✅ Message sent');
    return true;
  } catch (error) {
    console.error('[SLACK] ❌ Failed to send message:', error);
    return false;
  }
}

/**
 * Send test notification to verify Slack integration
 */
export async function sendTestNotification(): Promise<boolean> {
  return sendSlackAlert({
    title: 'Test Notification',
    severity: 'INFO',
    message: 'This is a test notification from UIBAC Incident Response System.',
    environment: 'test',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify about auto-fix being skipped (manual review required)
 */
export async function notifyFixSkipped(
  incidentId: string,
  reason: string,
  severity: string,
  errorMessage?: string
): Promise<boolean> {
  return sendSlackAlert({
    title: 'Auto-Fix Skipped - Manual Review Required',
    severity: severity as any,
    message: errorMessage || 'An error occurred that requires manual investigation.',
    incidentId,
    errorType: reason,
    environment: 'production',
  });
}

/**
 * Notify about successful auto-fix PR creation
 */
export async function notifyFixCreated(
  incidentId: string,
  prUrl: string,
  prNumber: number,
  fixMessage: string,
  severity: string,
  errorMessage?: string
): Promise<boolean> {
  return sendSlackAlert({
    title: '🤖 Auto-Fix Generated',
    severity: severity as any,
    message: errorMessage || 'An error was automatically detected and a fix was generated.',
    incidentId,
    prUrl,
    prNumber,
    fixMessage,
    environment: 'production',
  });
}

// Expose for testing
if (typeof window !== 'undefined') {
  (window as any).sendSlackTest = sendTestNotification;
}
