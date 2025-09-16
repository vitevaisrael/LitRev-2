import { env } from '../config/env';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  metadata?: Record<string, any>;
  requestId?: string;
  userId?: string;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    // Set log level based on environment
    switch (env.NODE_ENV) {
      case 'production':
        this.logLevel = LogLevel.INFO;
        break;
      case 'test':
        this.logLevel = LogLevel.WARN;
        break;
      default:
        this.logLevel = LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context, metadata, requestId, userId } = entry;
    
    const levelStr = LogLevel[level];
    const contextStr = context ? `[${context}]` : '';
    const requestStr = requestId ? `[${requestId}]` : '';
    const userStr = userId ? `[${userId}]` : '';
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    
    return `${timestamp} ${levelStr}${contextStr}${requestStr}${userStr}: ${message}${metadataStr}`;
  }

  private log(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>, requestId?: string, userId?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      metadata,
      requestId,
      userId
    };

    const formattedMessage = this.formatMessage(entry);

    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
    }
  }

  error(message: string, context?: string, metadata?: Record<string, any>, requestId?: string, userId?: string): void {
    this.log(LogLevel.ERROR, message, context, metadata, requestId, userId);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>, requestId?: string, userId?: string): void {
    this.log(LogLevel.WARN, message, context, metadata, requestId, userId);
  }

  info(message: string, context?: string, metadata?: Record<string, any>, requestId?: string, userId?: string): void {
    this.log(LogLevel.INFO, message, context, metadata, requestId, userId);
  }

  debug(message: string, context?: string, metadata?: Record<string, any>, requestId?: string, userId?: string): void {
    this.log(LogLevel.DEBUG, message, context, metadata, requestId, userId);
  }

  // Structured logging for specific events
  authEvent(event: string, userId?: string, metadata?: Record<string, any>, requestId?: string): void {
    this.info(`Auth event: ${event}`, 'AUTH', { event, ...metadata }, requestId, userId);
  }

  apiEvent(event: string, method: string, url: string, statusCode: number, duration: number, requestId?: string, userId?: string): void {
    this.info(`API ${event}`, 'API', {
      event,
      method,
      url,
      statusCode,
      duration
    }, requestId, userId);
  }

  databaseEvent(event: string, query?: string, duration?: number, metadata?: Record<string, any>): void {
    this.debug(`Database ${event}`, 'DB', {
      event,
      query: query?.substring(0, 100), // Truncate long queries
      duration,
      ...metadata
    });
  }

  securityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, any>, requestId?: string, userId?: string): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    this.log(level, `Security event: ${event}`, 'SECURITY', {
      event,
      severity,
      ...metadata
    }, requestId, userId);
  }

  performanceEvent(event: string, duration: number, metadata?: Record<string, any>, requestId?: string): void {
    this.info(`Performance: ${event}`, 'PERF', {
      event,
      duration,
      ...metadata
    }, requestId);
  }

  // Error logging with stack trace
  errorWithStack(error: Error, context?: string, metadata?: Record<string, any>, requestId?: string, userId?: string): void {
    this.error(error.message, context, {
      ...metadata,
      stack: error.stack,
      name: error.name
    }, requestId, userId);
  }

  // Request logging helper
  logRequest(req: any, res: any, duration: number): void {
    const { method, url } = req;
    const { statusCode } = res;
    const requestId = req.id;
    const userId = req.user?.id;

    this.apiEvent('request', method, url, statusCode, duration, requestId, userId);
  }

  // Set log level dynamically
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  // Get current log level
  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

// Global logger instance
export const logger = new Logger();

// Request logger middleware
export function createRequestLogger() {
  return (req: any, res: any, next: () => void) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.logRequest(req, res, duration);
    });
    
    next();
  };
}

// Error logger middleware
export function createErrorLogger() {
  return (error: Error, req: any, res: any, next: (error?: Error) => void) => {
    logger.errorWithStack(error, 'REQUEST_ERROR', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode
    }, req.id, req.user?.id);
    
    next(error);
  };
}
