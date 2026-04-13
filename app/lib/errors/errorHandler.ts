// Comprehensive Error Handling System
// Manages all types of errors with proper logging and user feedback

export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  FORBIDDEN = 'FORBIDDEN',
  PREMIUM_REQUIRED = 'PREMIUM_REQUIRED',

  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  VALUE_OUT_OF_RANGE = 'VALUE_OUT_OF_RANGE',

  // Database errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  CONFLICT = 'CONFLICT',

  // Rate limiting errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Anti-cheat errors
  ANTI_CHEAT_BLOCKED = 'ANTI_CHEAT_BLOCKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  XP_LIMIT_EXCEEDED = 'XP_LIMIT_EXCEEDED',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  RETRYABLE_ERROR = 'RETRYABLE_ERROR',

  // Business logic errors
  INSUFFICIENT_XP = 'INSUFFICIENT_XP',
  LEVEL_TOO_LOW = 'LEVEL_TOO_LOW',
  SUBJECT_LOCKED = 'SUBJECT_LOCKED',
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  endpoint?: string;
  method?: string;
  requestBody?: any;
  timestamp?: string;
  stackTrace?: string;
  additionalData?: Record<string, any>;
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: any;
  severity: ErrorSeverity;
  retryable: boolean;
  context?: ErrorContext;
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly context?: ErrorContext;
  public readonly details?: any;

  constructor(
    code: ErrorCode,
    message: string,
    options: {
      severity?: ErrorSeverity;
      retryable?: boolean;
      context?: ErrorContext;
      details?: any;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.retryable = options.retryable || false;
    this.context = options.context;
    this.details = options.details;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Error Handler Class
 * Centralized error processing and logging
 */
export class ErrorHandler {
  private static readonly errorLogPath = process.env.ERROR_LOG_PATH || 'errors.log';
  
  /**
   * Handle and format API errors
   */
  static handleApiError(error: unknown, context?: Partial<ErrorContext>): ApiError {
    // If it's already an AppError, return it
    if (error instanceof AppError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
        severity: error.severity,
        retryable: error.retryable,
        context: { ...error.context, ...context }
      };
    }

    // Handle known error types
    if (error instanceof Error) {
      return this.handleKnownError(error, context);
    }

    // Handle unknown errors
    return this.handleUnknownError(error, context);
  }

  /**
   * Handle known error types
   */
  private static handleKnownError(error: Error, context?: Partial<ErrorContext>): ApiError {
    const message = error.message.toLowerCase();

    // Firebase Auth errors
    if (message.includes('auth/user-not-found')) {
      return new AppError(
        ErrorCode.USER_NOT_FOUND,
        'User account not found',
        { severity: ErrorSeverity.MEDIUM, retryable: false, context }
      );
    }

    if (message.includes('auth/invalid-id-token')) {
      return new AppError(
        ErrorCode.INVALID_TOKEN,
        'Invalid authentication token',
        { severity: ErrorSeverity.HIGH, retryable: false, context }
      );
    }

    if (message.includes('auth/id-token-expired')) {
      return new AppError(
        ErrorCode.EXPIRED_TOKEN,
        'Authentication token expired',
        { severity: ErrorSeverity.HIGH, retryable: false, context }
      );
    }

    // Firebase Firestore errors
    if (message.includes('firestore/permission-denied')) {
      return new AppError(
        ErrorCode.FORBIDDEN,
        'Permission denied',
        { severity: ErrorSeverity.HIGH, retryable: false, context }
      );
    }

    if (message.includes('firestore/unavailable')) {
      return new AppError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Database service unavailable',
        { severity: ErrorSeverity.HIGH, retryable: true, context }
      );
    }

    if (message.includes('firestore/deadline-exceeded')) {
      return new AppError(
        ErrorCode.TIMEOUT,
        'Request timeout',
        { severity: ErrorSeverity.MEDIUM, retryable: true, context }
      );
    }

    if (message.includes('firestore/resource-exhausted')) {
      return new AppError(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Too many requests',
        { severity: ErrorSeverity.MEDIUM, retryable: true, context }
      );
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return new AppError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Network connectivity issue',
        { severity: ErrorSeverity.HIGH, retryable: true, context }
      );
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return new AppError(
        ErrorCode.INVALID_INPUT,
        'Invalid input provided',
        { severity: ErrorSeverity.MEDIUM, retryable: false, context }
      );
    }

    // Default to internal error
    return new AppError(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred',
      { 
        severity: ErrorSeverity.HIGH, 
        retryable: false, 
        context: { 
          ...context, 
          stackTrace: error.stack 
        } 
      }
    );
  }

  /**
   * Handle unknown errors
   */
  private static handleUnknownError(error: unknown, context?: Partial<ErrorContext>): ApiError {
    const errorString = String(error);
    
    return new AppError(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred',
      { 
        severity: ErrorSeverity.CRITICAL, 
        retryable: false, 
        context: { 
          ...context, 
          additionalData: { 
            originalError: errorString,
            type: typeof error
          } 
        } 
      }
    );
  }

  /**
   * Log error for monitoring
   */
  static async logError(apiError: ApiError): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: this.getLogLevel(apiError.severity),
        code: apiError.code,
        message: apiError.message,
        details: apiError.details,
        context: apiError.context,
        stackTrace: apiError.context?.stackTrace
      };

      // Log to console (development)
      if (process.env.NODE_ENV === 'development') {
        console.error('[ERROR]', JSON.stringify(logEntry, null, 2));
      }

      // Log to external service (production)
      if (process.env.NODE_ENV === 'production') {
        await this.logToExternalService(logEntry);
      }

      // Log to file (if configured)
      if (process.env.ERROR_LOG_FILE) {
        await this.logToFile(logEntry);
      }

    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  /**
   * Get log level based on error severity
   */
  private static getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'info';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.CRITICAL:
        return 'critical';
      default:
        return 'error';
    }
  }

  /**
   * Log to external monitoring service
   */
  private static async logToExternalService(logEntry: any): Promise<void> {
    // Integration with services like Sentry, DataDog, etc.
    if (process.env.SENTRY_DSN) {
      // Example: Sentry integration
      try {
        const Sentry = await import('@sentry/node');
        Sentry.captureException(new Error(logEntry.message), {
          tags: { code: logEntry.code },
          extra: logEntry
        });
      } catch (sentryError) {
        console.error('Sentry logging failed:', sentryError);
      }
    }
  }

  /**
   * Log to file
   */
  private static async logToFile(logEntry: any): Promise<void> {
    // File logging implementation
    // This would use a file system library in a real implementation
    console.log('[FILE_LOG]', JSON.stringify(logEntry));
  }

  /**
   * Create HTTP response from error
   */
  static createErrorResponse(apiError: ApiError): Response {
    const statusCode = this.getStatusCode(apiError.code);
    
    const responseBody = {
      error: true,
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
      retryable: apiError.retryable,
      timestamp: new Date().toISOString()
    };

    // Include additional context in development
    if (process.env.NODE_ENV === 'development' && apiError.context) {
      responseBody.context = apiError.context;
    }

    return new Response(JSON.stringify(responseBody), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }

  /**
   * Get HTTP status code from error code
   */
  private static getStatusCode(code: ErrorCode): number {
    switch (code) {
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.INVALID_TOKEN:
      case ErrorCode.EXPIRED_TOKEN:
        return 401;

      case ErrorCode.FORBIDDEN:
      case ErrorCode.PREMIUM_REQUIRED:
        return 403;

      case ErrorCode.USER_NOT_FOUND:
        return 404;

      case ErrorCode.INVALID_INPUT:
      case ErrorCode.MISSING_REQUIRED_FIELD:
      case ErrorCode.INVALID_FORMAT:
      case ErrorCode.VALUE_OUT_OF_RANGE:
        return 400;

      case ErrorCode.RATE_LIMIT_EXCEEDED:
      case ErrorCode.TOO_MANY_REQUESTS:
        return 429;

      case ErrorCode.INSUFFICIENT_XP:
      case ErrorCode.LEVEL_TOO_LOW:
      case ErrorCode.SUBJECT_LOCKED:
      case ErrorCode.FEATURE_NOT_AVAILABLE:
        return 422;

      case ErrorCode.ANTI_CHEAT_BLOCKED:
      case ErrorCode.SUSPICIOUS_ACTIVITY:
        return 403;

      case ErrorCode.SERVICE_UNAVAILABLE:
      case ErrorCode.TIMEOUT:
        return 503;

      case ErrorCode.DATABASE_ERROR:
      case ErrorCode.TRANSACTION_FAILED:
      case ErrorCode.CONFLICT:
        return 500;

      case ErrorCode.INTERNAL_ERROR:
      default:
        return 500;
    }
  }

  /**
   * Handle edge cases and validation
   */
  static validateXPAmount(xp: number): void {
    if (!Number.isInteger(xp)) {
      throw new AppError(
        ErrorCode.INVALID_FORMAT,
        'XP must be an integer',
        { severity: ErrorSeverity.MEDIUM, retryable: false }
      );
    }

    if (xp < 0) {
      throw new AppError(
        ErrorCode.VALUE_OUT_OF_RANGE,
        'XP cannot be negative',
        { severity: ErrorSeverity.MEDIUM, retryable: false }
      );
    }

    if (xp > 10000) {
      throw new AppError(
        ErrorCode.XP_LIMIT_EXCEEDED,
        'XP amount exceeds maximum allowed',
        { severity: ErrorSeverity.HIGH, retryable: false }
      );
    }
  }

  /**
   * Validate user level
   */
  static validateUserLevel(level: number): void {
    if (!Number.isInteger(level)) {
      throw new AppError(
        ErrorCode.INVALID_FORMAT,
        'Level must be an integer',
        { severity: ErrorSeverity.MEDIUM, retryable: false }
      );
    }

    if (level < 1) {
      throw new AppError(
        ErrorCode.VALUE_OUT_OF_RANGE,
        'Level cannot be less than 1',
        { severity: ErrorSeverity.MEDIUM, retryable: false }
      );
    }

    if (level > 100) {
      throw new AppError(
        ErrorCode.VALUE_OUT_OF_RANGE,
        'Level cannot exceed 100',
        { severity: ErrorSeverity.MEDIUM, retryable: false }
      );
    }
  }

  /**
   * Validate session ID
   */
  static validateSessionId(sessionId: string): void {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppError(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'Session ID is required',
        { severity: ErrorSeverity.MEDIUM, retryable: false }
      );
    }

    if (sessionId.length < 1 || sessionId.length > 100) {
      throw new AppError(
        ErrorCode.VALUE_OUT_OF_RANGE,
        'Session ID must be between 1 and 100 characters',
        { severity: ErrorSeverity.MEDIUM, retryable: false }
      );
    }
  }

  /**
   * Handle offline sync conflicts
   */
  static handleSyncConflict(localData: any, serverData: any): any {
    // Simple conflict resolution: prefer server data with local timestamps
    const resolved = { ...serverData };
    
    if (localData.lastModified && serverData.lastModified) {
      if (new Date(localData.lastModified) > new Date(serverData.lastModified)) {
        // Local data is newer, merge it
        Object.assign(resolved, localData, {
          lastModified: new Date().toISOString(),
          syncConflict: true
        });
      }
    }

    return resolved;
  }

  /**
   * Handle XP overflow protection
   */
  static protectXPOverflow(currentXP: number, additionalXP: number): number {
    const maxXP = Number.MAX_SAFE_INTEGER - 1000000; // Safe buffer
    
    if (currentXP > maxXP) {
      throw new AppError(
        ErrorCode.VALUE_OUT_OF_RANGE,
        'XP overflow detected',
        { severity: ErrorSeverity.HIGH, retryable: false }
      );
    }

    const newXP = currentXP + additionalXP;
    
    if (newXP > maxXP) {
      throw new AppError(
        ErrorCode.VALUE_OUT_OF_RANGE,
        'XP would overflow maximum limit',
        { severity: ErrorSeverity.HIGH, retryable: false }
      );
    }

    return newXP;
  }

  /**
   * Create error context from request
   */
  static createContextFromRequest(request: Request, userId?: string): ErrorContext {
    return {
      userId,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown',
      endpoint: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Error handling middleware wrapper
 */
export function withErrorHandler(
  handler: (request: Request, context?: any) => Promise<Response>
) {
  return async (request: Request, context?: any): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      const apiError = ErrorHandler.handleApiError(error, {
        endpoint: request.url,
        method: request.method
      });

      // Log the error
      await ErrorHandler.logError(apiError);

      // Return error response
      return ErrorHandler.createErrorResponse(apiError);
    }
  };
}

export default ErrorHandler;
