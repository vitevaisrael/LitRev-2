import type { FastifyRequest, FastifyReply } from "fastify";
import { ENV } from "../config/auth";
import { prisma } from "../lib/prisma";
import { sendError } from "../utils/response";
import { auditLog } from "../utils/audit";

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    const token = req.cookies?.[ENV.AUTH_COOKIE_NAME];
    if (!token) {
      await auditLog('system', 'anonymous', 'auth_failed', { 
        reason: 'no_token',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        url: req.url
      });
      return sendError(reply, 'UNAUTHENTICATED', 'Authentication required', 401);
    }
    
    const decoded = await req.server.jwt.verify(token);
    const user = decoded as any;
    
    // For dev bypass users, skip database verification
    if (user.id === '00000000-0000-0000-0000-000000000001' && user.email === 'dev@localhost.com') {
      req.user = user;
      return;
    }
    
    // Verify user still exists in database
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true }
    });
    
    if (!existingUser) {
      await auditLog('system', user.id, 'auth_failed', { 
        reason: 'user_not_found',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        url: req.url
      });
      return sendError(reply, 'USER_NOT_FOUND', 'User no longer exists', 401);
    }
    
    req.user = existingUser;
  } catch (error) {
    await auditLog('system', 'anonymous', 'auth_failed', { 
      reason: 'invalid_token',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return sendError(reply, 'UNAUTHENTICATED', 'Invalid authentication token', 401);
  }
}

export async function requireProjectAccess(req: FastifyRequest, reply: FastifyReply) {
  const p = (req.params as any) || {};
  const projectId = p.id || p.projectId;
  
  if (!projectId) {
    return sendError(reply, 'PROJECT_ID_REQUIRED', 'Project ID is required', 400);
  }
  
  if (!(req.user as any)?.id) {
    return sendError(reply, 'UNAUTHENTICATED', 'Authentication required', 401);
  }
  
  try {
    // For dev bypass users, allow access to any project (for development)
    if ((req.user as any).id === '00000000-0000-0000-0000-000000000001') {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (!project) {
        return sendError(reply, 'PROJECT_NOT_FOUND', 'Project not found', 404);
      }
      
      (req as any).project = project;
      return;
    }
    
    // Check if project exists and user owns it
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: (req.user as any).id
      }
    });
    
    if (!project) {
      await auditLog('system', (req.user as any).id, 'project_access_denied', { 
        projectId,
        reason: 'not_found_or_no_access',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        url: req.url
      });
      return sendError(reply, 'PROJECT_NOT_FOUND', 'Project not found or access denied', 404);
    }
    
    // Attach project to request for use in route handlers
    (req as any).project = project;
  } catch (error) {
    console.error('Project access check error:', error);
    return sendError(reply, 'INTERNAL_ERROR', 'Error checking project access', 500);
  }
}

// Admin role check
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  
  if (!user) {
    return sendError(reply, 'UNAUTHENTICATED', 'Authentication required', 401);
  }
  
  // For now, we'll implement a simple admin check
  // In a real application, you'd have a proper role system
  const isAdmin = user.email === 'admin@thescientist.app' || 
                  user.email?.endsWith('@thescientist.app');
  
  if (!isAdmin) {
    await auditLog('system', user.id, 'admin_access_denied', { 
      email: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.url
    });
    return sendError(reply, 'FORBIDDEN', 'Admin access required', 403);
  }
}

