// Production Logging System
// Structured logging for debugging and monitoring

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = LogLevel[entry.level];
    const message = entry.message;
    
    let formatted = `[${timestamp}] ${level}: ${message}`;
    
    if (entry.context) {
      formatted += ` | Context: ${JSON.stringify(entry.context)}`;
    }
    
    if (entry.userId) {
      formatted += ` | User: ${entry.userId}`;
    }
    
    if (entry.error) {
      formatted += ` | Error: ${entry.error.message}`;
    }
    
    return formatted;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      sessionId: this.sessionId,
      error,
    };

    // Add to memory logs
    this.logs.push(entry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output based on level
    const formatted = this.formatMessage(entry);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }

    // In production, you might want to send to external service
    if (process.env.NODE_ENV === 'production' && level >= LogLevel.WARN) {
      this.sendToExternalService(entry);
    }
  }

  private async sendToExternalService(entry: LogEntry) {
    try {
      // Example: Send to logging service
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // });
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  // Performance logging
  startTimer(label: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.debug(`Timer: ${label}`, { duration: `${duration.toFixed(2)}ms` });
    };
  }

  // User action logging
  logUserAction(action: string, userId?: string, context?: Record<string, any>) {
    this.info(`User Action: ${action}`, { ...context, userId });
  }

  // Route change logging
  logRouteChange(from: string, to: string, userId?: string) {
    this.info('Route Change', { from, to, userId });
  }

  // API request logging
  logApiRequest(method: string, url: string, status?: number, duration?: number, error?: Error) {
    const context: Record<string, any> = { method, url };
    if (status) context.status = status;
    if (duration) context.duration = `${duration}ms`;
    
    if (error || (status && status >= 400)) {
      this.error(`API Request Failed: ${method} ${url}`, error, context);
    } else {
      this.info(`API Request: ${method} ${url}`, context);
    }
  }

  // Get recent logs
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Get logs by level
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Get session info
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      totalLogs: this.logs.length,
      errorCount: this.logs.filter(log => log.level === LogLevel.ERROR).length,
      warnCount: this.logs.filter(log => log.level === LogLevel.WARN).length,
    };
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logDebug = (message: string, context?: Record<string, any>) => logger.debug(message, context);
export const logInfo = (message: string, context?: Record<string, any>) => logger.info(message, context);
export const logWarn = (message: string, context?: Record<string, any>) => logger.warn(message, context);
export const logError = (message: string, error?: Error, context?: Record<string, any>) => logger.error(message, error, context);
export const startTimer = (label: string) => logger.startTimer(label);
export const logUserAction = (action: string, userId?: string, context?: Record<string, any>) => logger.logUserAction(action, userId, context);
export const logRouteChange = (from: string, to: string, userId?: string) => logger.logRouteChange(from, to, userId);
export const logApiRequest = (method: string, url: string, status?: number, duration?: number, error?: Error) => logger.logApiRequest(method, url, status, duration, error);
