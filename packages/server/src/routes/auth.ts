import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional()
}).strict();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
}).strict();

const RefreshSchema = z.object({
  refreshToken: z.string().min(1)
}).strict();

// JWT token generation
function generateTokens(userId: string, email: string) {
  const accessToken = jwt.sign(
    { userId, email, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, email, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}

// Set httpOnly cookies
function setAuthCookies(reply: any, accessToken: string, refreshToken: string) {
  reply.setCookie('accessToken', accessToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/'
  });
  
  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/register
  fastify.post('/auth/register', {
    preHandler: async (request, reply) => {
      try {
        request.body = RegisterSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password, name } = request.body as { email: string; password: string; name?: string };
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return sendError(reply, 'USER_EXISTS', 'User with this email already exists', 409);
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: name || email.split('@')[0]
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true
        }
      });
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id, user.email);
      
      // Set cookies
      setAuthCookies(reply, accessToken, refreshToken);
      
      // Create audit log (skip if audit log creation fails)
      try {
        await prisma.auditLog.create({
          data: {
            projectId: 'system',
            userId: user.id,
            action: 'user_registered',
            details: { email: user.email }
          }
        });
      } catch (auditError) {
        // Log the error but don't fail the registration
        console.error('Failed to create audit log:', auditError);
      }
      
      return sendSuccess(reply, { 
        user,
        message: 'User registered successfully' 
      }, 201);
    } catch (error) {
      return sendError(reply, 'REGISTRATION_ERROR', 'Failed to register user', 500);
    }
  });

  // POST /api/v1/auth/login
  fastify.post('/auth/login', {
    preHandler: async (request, reply) => {
      try {
        request.body = LoginSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });
      
      if (!user) {
        return sendError(reply, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (!isValidPassword) {
        return sendError(reply, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
      }
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id, user.email);
      
      // Set cookies
      setAuthCookies(reply, accessToken, refreshToken);
      
      // Create audit log (skip if audit log creation fails)
      try {
        await prisma.auditLog.create({
          data: {
            projectId: 'system',
            userId: user.id,
            action: 'user_logged_in',
            details: { email: user.email }
          }
        });
      } catch (auditError) {
        // Log the error but don't fail the login
        console.error('Failed to create audit log:', auditError);
      }
      
      return sendSuccess(reply, { 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        },
        message: 'Login successful' 
      });
    } catch (error) {
      return sendError(reply, 'LOGIN_ERROR', 'Failed to login', 500);
    }
  });

  // POST /api/v1/auth/refresh
  fastify.post('/auth/refresh', {
    preHandler: async (request, reply) => {
      try {
        request.body = RefreshSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };
      
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        return sendError(reply, 'INVALID_TOKEN', 'Invalid refresh token', 401);
      }
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true
        }
      });
      
      if (!user) {
        return sendError(reply, 'USER_NOT_FOUND', 'User not found', 404);
      }
      
      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.email);
      
      // Set cookies
      setAuthCookies(reply, accessToken, newRefreshToken);
      
      return sendSuccess(reply, { 
        user,
        message: 'Token refreshed successfully' 
      });
    } catch (error) {
      return sendError(reply, 'REFRESH_ERROR', 'Failed to refresh token', 401);
    }
  });

  // POST /api/v1/auth/logout
  fastify.post('/auth/logout', async (request, reply) => {
    try {
      // Clear cookies
      (reply as any).clearCookie('accessToken', { path: '/' });
      (reply as any).clearCookie('refreshToken', { path: '/' });
      
      return sendSuccess(reply, { message: 'Logout successful' });
    } catch (error) {
      return sendError(reply, 'LOGOUT_ERROR', 'Failed to logout', 500);
    }
  });

  // GET /api/v1/auth/me
  fastify.get('/auth/me', async (request, reply) => {
    try {
      const accessToken = (request as any).cookies?.accessToken;
      
      if (!accessToken) {
        return sendError(reply, 'NO_TOKEN', 'No access token provided', 401);
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
          name: true,
          createdAt: true
        }
      });
      
      if (!user) {
        return sendError(reply, 'USER_NOT_FOUND', 'User not found', 404);
      }
      
      return sendSuccess(reply, { user });
    } catch (error) {
      return sendError(reply, 'AUTH_ERROR', 'Authentication failed', 401);
    }
  });
}
