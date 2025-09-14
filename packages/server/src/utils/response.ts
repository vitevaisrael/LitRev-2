import { FastifyReply } from 'fastify';

export interface ApiResponse<T = any> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200) {
  return reply.status(statusCode).send({
    ok: true,
    data
  } as ApiResponse<T>);
}

export function sendError(reply: FastifyReply, code: string, message: string, statusCode = 400, requestId?: string) {
  const rid = requestId || (reply as any)?.request?.id;
  return reply.status(statusCode).send({
    ok: false,
    error: { code, message, requestId: rid }
  } as ApiError);
}
