import { ZodSchema, ZodError } from 'zod';
import { FastifyRequest, FastifyReply } from 'fastify';
import { sendError } from './response';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(reply, 'VALIDATION_ERROR', error.errors.map(e => e.message).join(', '), 422);
      }
      throw error;
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(reply, 'VALIDATION_ERROR', error.errors.map(e => e.message).join(', '), 422);
      }
      throw error;
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(reply, 'VALIDATION_ERROR', error.errors.map(e => e.message).join(', '), 422);
      }
      throw error;
    }
  };
}
