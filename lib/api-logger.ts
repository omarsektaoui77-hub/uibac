import { NextRequest } from 'next/server';

interface LogContext {
  route: string;
  method: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  status?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export class APILogger {
  static logRequest(request: NextRequest, context: Partial<LogContext> = {}) {
    const logData: LogContext = {
      route: request.nextUrl.pathname,
      method: request.method,
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown',
      userAgent: request.headers.get('user-agent')?.substring(0, 100) || 'unknown',
      ...context
    };

    console.log(`[API_REQUEST] ${logData.method} ${logData.route}`, JSON.stringify(logData));
    
    // Send to Sentry if available
    if (typeof window === 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Note: Sentry server-side logging would be added here
      // Currently using console.log for simplicity
    }
  }

  static logSuccess(request: NextRequest, context: Partial<LogContext> = {}) {
    const logData: LogContext = {
      route: request.nextUrl.pathname,
      method: request.method,
      status: 200,
      ...context
    };

    console.log(`[API_SUCCESS] ${logData.method} ${logData.route}`, JSON.stringify(logData));
  }

  static logError(error: Error | unknown, request: NextRequest, context: Partial<LogContext> = {}) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const logData: LogContext = {
      route: request.nextUrl.pathname,
      method: request.method,
      error: errorMessage,
      status: 500,
      ...context
    };

    console.error(`[API_ERROR] ${logData.method} ${logData.route}`, JSON.stringify(logData));
  }

  static logAuth(event: 'signup' | 'login' | 'logout', success: boolean, email?: string, context: Partial<LogContext> = {}) {
    const logData = {
      event,
      success,
      email: email ? this.hashEmail(email) : 'unknown',
      timestamp: new Date().toISOString(),
      ...context
    };

    console.log(`[AUTH_EVENT] ${event.toUpperCase()}`, JSON.stringify(logData));
  }

  private static hashEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.substring(0, 3)}***@${domain}`;
  }
}
