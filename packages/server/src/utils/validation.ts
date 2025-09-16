import { z } from 'zod';
import { sendError } from './response';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Common validation schemas
export const UUIDSchema = z.string().uuid('Invalid UUID format');
export const EmailSchema = z.string().email('Invalid email format');
export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const DOISchema = z.string().regex(/^10\.\S+\/\S+$/, 'Invalid DOI format');
export const PMIDSchema = z.string().regex(/^\d{1,8}$/, 'Invalid PMID format');

// Pagination schema
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// File upload validation
export const FileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimetype: z.string().min(1, 'MIME type is required'),
  size: z.number().int().min(1, 'File size must be greater than 0')
});

// Sanitize string input
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

// Sanitize object input
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeString(value) as T[keyof T];
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key as keyof T] = sanitizeObject(value) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value;
    }
  }
  
  return sanitized;
}

// Validate request body with schema
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  req: FastifyRequest,
  reply: FastifyReply
): T | null {
  try {
    const sanitizedBody = sanitizeObject(req.body as any);
    return schema.parse(sanitizedBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      sendError(reply, 'VALIDATION_ERROR', message, 422);
    } else {
      sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
    }
    return null;
  }
}

// Validate request params with schema
export function validateParams<T>(
  schema: z.ZodSchema<T>,
  req: FastifyRequest,
  reply: FastifyReply
): T | null {
  try {
    return schema.parse(req.params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      sendError(reply, 'VALIDATION_ERROR', message, 422);
    } else {
      sendError(reply, 'VALIDATION_ERROR', 'Invalid request parameters', 422);
    }
    return null;
  }
}

// Validate request query with schema
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  req: FastifyRequest,
  reply: FastifyReply
): T | null {
  try {
    return schema.parse(req.query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      sendError(reply, 'VALIDATION_ERROR', message, 422);
    } else {
      sendError(reply, 'VALIDATION_ERROR', 'Invalid query parameters', 422);
    }
    return null;
  }
}

// Rate limiting helper
export function createRateLimitKey(req: FastifyRequest, prefix: string = ''): string {
  const userId = (req as any).user?.id || 'anonymous';
  const ip = req.ip || 'unknown';
  return `${prefix}:${userId}:${ip}`;
}

// SQL injection prevention
export function sanitizeSQL(input: string): string {
  // Remove common SQL injection patterns
  return input
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;]/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments
    .replace(/\*\//g, '') // Remove block comments
    .replace(/union/gi, '') // Remove UNION
    .replace(/select/gi, '') // Remove SELECT
    .replace(/insert/gi, '') // Remove INSERT
    .replace(/update/gi, '') // Remove UPDATE
    .replace(/delete/gi, '') // Remove DELETE
    .replace(/drop/gi, '') // Remove DROP
    .replace(/create/gi, '') // Remove CREATE
    .replace(/alter/gi, '') // Remove ALTER
    .trim();
}

// XSS prevention
export function sanitizeHTML(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}