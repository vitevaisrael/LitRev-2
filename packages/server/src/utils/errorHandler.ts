import type { FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { sendError } from './response';
import { auditLog } from './audit';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class ValidationError extends Error implements AppError {
  statusCode = 422;
  code = 'VALIDATION_ERROR';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements AppError {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  isOperational = true;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  isOperational = true;

  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  code = 'NOT_FOUND';
  isOperational = true;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  code = 'CONFLICT';
  isOperational = true;

  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error implements AppError {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
  isOperational = true;

  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends Error implements AppError {
  statusCode = 502;
  code = 'EXTERNAL_SERVICE_ERROR';
  isOperational = true;

  constructor(message: string = 'External service error') {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

export class DatabaseError extends Error implements AppError {
  statusCode = 500;
  code = 'DATABASE_ERROR';
  isOperational = true;

  constructor(message: string = 'Database error') {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Error handler for Fastify
export async function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = (request as any).id || 'unknown';
  const userId = (request as any).user?.id || 'anonymous';
  const ip = request.ip || 'unknown';
  const userAgent = request.headers['user-agent'] || 'unknown';

  // Log error details
  console.error('Error occurred:', {
    requestId,
    userId,
    ip,
    userAgent,
    url: request.url,
    method: request.method,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });

  // Handle different error types
  if (error instanceof ZodError) {
    const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    await auditLog('system', userId, 'validation_error', {
      requestId,
      ip,
      userAgent,
      url: request.url,
      errors: error.errors
    });
    return sendError(reply, 'VALIDATION_ERROR', message, 422, requestId);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    await auditLog('system', userId, 'database_error', {
      requestId,
      ip,
      userAgent,
      url: request.url,
      code: error.code,
      message: error.message
    });

    switch (error.code) {
      case 'P2002':
        return sendError(reply, 'CONFLICT', 'Resource already exists', 409, requestId);
      case 'P2025':
        return sendError(reply, 'NOT_FOUND', 'Resource not found', 404, requestId);
      case 'P2003':
        return sendError(reply, 'CONFLICT', 'Foreign key constraint failed', 409, requestId);
      default:
        return sendError(reply, 'DATABASE_ERROR', 'Database operation failed', 500, requestId);
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    await auditLog('system', userId, 'database_validation_error', {
      requestId,
      ip,
      userAgent,
      url: request.url,
      message: error.message
    });
    return sendError(reply, 'VALIDATION_ERROR', 'Invalid data provided', 422, requestId);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    await auditLog('system', userId, 'database_connection_error', {
      requestId,
      ip,
      userAgent,
      url: request.url,
      message: error.message
    });
    return sendError(reply, 'DATABASE_ERROR', 'Database connection failed', 500, requestId);
  }

  // Handle custom app errors
  if ('isOperational' in error && error.isOperational) {
    const appError = error as AppError;
    await auditLog('system', userId, 'app_error', {
      requestId,
      ip,
      userAgent,
      url: request.url,
      code: appError.code,
      message: appError.message
    });
    return sendError(reply, appError.code || 'APP_ERROR', appError.message, appError.statusCode || 500, requestId);
  }

  // Handle authentication errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    await auditLog('system', userId, 'auth_error', {
      requestId,
      ip,
      userAgent,
      url: request.url,
      error: error.name
    });
    return sendError(reply, 'AUTHENTICATION_ERROR', 'Invalid or expired token', 401, requestId);
  }

  // Handle rate limiting errors
  if (error.message.includes('rate limit')) {
    await auditLog('system', userId, 'rate_limit_exceeded', {
      requestId,
      ip,
      userAgent,
      url: request.url
    });
    return sendError(reply, 'RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 429, requestId);
  }

  // Handle external service errors
  if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
    await auditLog('system', userId, 'external_service_error', {
      requestId,
      ip,
      userAgent,
      url: request.url,
      message: error.message
    });
    return sendError(reply, 'EXTERNAL_SERVICE_ERROR', 'External service unavailable', 502, requestId);
  }

  // Log unexpected errors
  await auditLog('system', userId, 'unexpected_error', {
    requestId,
    ip,
    userAgent,
    url: request.url,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });

  // Return generic error for unexpected cases
  return sendError(reply, 'INTERNAL_ERROR', 'An unexpected error occurred', 500, requestId);
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: FastifyRequest, reply: FastifyReply) => {
    return Promise.resolve(fn(req, reply)).catch((error) => {
      return errorHandler(error, req, reply);
    });
  };
}

// Try-catch wrapper for async functions
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    console.error('Safe async error:', error);
    return fallback;
  }
}
