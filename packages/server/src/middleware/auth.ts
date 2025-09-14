import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { sendError } from '../utils/response';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
  cookies?: {
    accessToken?: string;
    refreshToken?: string;
  };
}

// Authentication middleware
export async function authenticate(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const accessToken = request.cookies?.accessToken;
    
    if (!accessToken) {
      return sendError(reply, 'NO_TOKEN', 'Authentication required', 401);
    }
    
    // Verify token
    const decoded = jwt.verify(accessToken, env.JWT_SECRET) as any;
    
    if (decoded.type !== 'access') {
      return sendError(reply, 'INVALID_TOKEN', 'Invalid access token', 401);
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    });
    
    if (!user) {
      return sendError(reply, 'USER_NOT_FOUND', 'User not found', 404);
    }
    
    // Attach user to request
    request.user = user;
    
  } catch (error) {
    return sendError(reply, 'AUTH_ERROR', 'Authentication failed', 401);
  }
}

// Project ownership validation middleware
export async function validateProjectOwnership(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const { id: projectId } = request.params as { id: string };
    
    if (!request.user) {
      return sendError(reply, 'NO_USER', 'User not authenticated', 401);
    }
    
    // Check if project exists and user owns it
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: request.user.id
      }
    });
    
    if (!project) {
      return sendError(reply, 'PROJECT_NOT_FOUND', 'Project not found or access denied', 404);
    }
    
    // Attach project to request for use in route handlers
    (request as any).project = project;
    
  } catch (error) {
    return sendError(reply, 'PROJECT_VALIDATION_ERROR', 'Failed to validate project ownership', 500);
  }
}

// Optional authentication (doesn't fail if no token)
export async function optionalAuth(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const accessToken = request.cookies?.accessToken;
    
    if (!accessToken) {
      return; // No token, continue without user
    }
    
    // Verify token
    const decoded = jwt.verify(accessToken, env.JWT_SECRET) as any;
    
    if (decoded.type !== 'access') {
      return; // Invalid token, continue without user
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    });
    
    if (user) {
      request.user = user;
    }
    
  } catch (error) {
    // Token invalid, continue without user
    return;
  }
}
