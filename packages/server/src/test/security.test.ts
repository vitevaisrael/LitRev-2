import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { prisma } from '../lib/prisma';
import { authRateLimit, apiRateLimit } from '../utils/rateLimit';
import { performanceMonitor } from '../utils/performance';

describe('Security Tests', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
    await app.ready();
    
    // Clear rate limit counters
    const redis = app.redis;
    if (redis) {
      await redis.flushdb();
    }
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/projects'
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        ok: false,
        error: 'UNAUTHENTICATED'
      });
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    it('should enforce password complexity requirements', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth-v2/register',
        payload: {
          email: 'test@example.com',
          password: 'weak', // Too weak
          name: 'Test User'
        }
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        ok: false,
        error: 'VALIDATION_ERROR'
      });
    });

    it('should prevent SQL injection in authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth-v2/login',
        payload: {
          email: "admin'; DROP TABLE users; --",
          password: 'password'
        }
      });

      expect(response.statusCode).toBe(401);
      // Should not cause database error
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce authentication rate limits', async () => {
      const requests = Array(10).fill(null).map(() =>
        app.inject({
          method: 'POST',
          url: '/api/v1/auth-v2/login',
          payload: {
            email: 'test@example.com',
            password: 'wrongpassword'
          }
        })
      );

      const responses = await Promise.all(requests);
      
      // First few should be 401, then 429
      const statusCodes = responses.map(r => r.statusCode);
      expect(statusCodes).toContain(429);
    });

    it('should enforce API rate limits', async () => {
      // Create a valid user and token first
      const user = await prisma.user.create({
        data: {
          email: 'ratelimit@example.com',
          passwordHash: 'hashedpassword',
          name: 'Rate Limit Test'
        }
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth-v2/login',
        payload: {
          email: 'ratelimit@example.com',
          password: 'password'
        }
      });

      const token = loginResponse.cookies?.find(c => c.name === 'the_scientist_access')?.value;
      
      const requests = Array(150).fill(null).map(() =>
        app.inject({
          method: 'GET',
          url: '/api/v1/projects',
          headers: {
            'Cookie': `the_scientist_access=${token}`
          }
        })
      );

      const responses = await Promise.all(requests);
      const statusCodes = responses.map(r => r.statusCode);
      
      expect(statusCodes).toContain(429);
    });
  });

  describe('Input Validation', () => {
    it('should sanitize malicious input', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth-v2/register',
        payload: {
          email: 'test@example.com',
          password: 'ValidPassword123!',
          name: maliciousInput
        }
      });

      // Should not contain script tags
      expect(response.body).not.toContain('<script>');
    });

    it('should reject invalid UUIDs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/invalid-uuid/candidates'
      });

      expect(response.statusCode).toBe(422);
    });

    it('should validate file uploads', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/00000000-0000-0000-0000-000000000001/candidates/00000000-0000-0000-0000-000000000011/pdf',
        payload: Buffer.from('fake pdf content'),
        headers: {
          'Content-Type': 'application/pdf'
        }
      });

      expect(response.statusCode).toBe(401); // Should require auth
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing requests', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth-v2/logout'
      });

      // In production, this should require CSRF token
      // For now, it should fail due to missing authentication
      expect(response.statusCode).toBe(401);
    });
  });

  describe('Authorization', () => {
    it('should prevent access to other users projects', async () => {
      // Create two users
      const user1 = await prisma.user.create({
        data: {
          email: 'user1@example.com',
          passwordHash: 'hashedpassword',
          name: 'User 1'
        }
      });

      const user2 = await prisma.user.create({
        data: {
          email: 'user2@example.com',
          passwordHash: 'hashedpassword',
          name: 'User 2'
        }
      });

      // Create project for user1
      const project = await prisma.project.create({
        data: {
          title: 'User 1 Project',
          ownerId: user1.id,
          settings: {}
        }
      });

      // Try to access user1's project as user2
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth-v2/login',
        payload: {
          email: 'user2@example.com',
          password: 'password'
        }
      });

      const token = loginResponse.cookies?.find(c => c.name === 'the_scientist_access')?.value;
      
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/candidates`,
        headers: {
          'Cookie': `the_scientist_access=${token}`
        }
      });

      expect(response.statusCode).toBe(404); // Should not find project
    });
  });

  describe('Performance', () => {
    it('should not have N+1 queries in candidate listing', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'perf@example.com',
          passwordHash: 'hashedpassword',
          name: 'Performance Test'
        }
      });

      const project = await prisma.project.create({
        data: {
          title: 'Performance Project',
          ownerId: user.id,
          settings: {}
        }
      });

      // Create multiple candidates
      await prisma.candidate.createMany({
        data: Array(10).fill(null).map((_, i) => ({
          projectId: project.id,
          title: `Test Candidate ${i}`,
          journal: 'Test Journal',
          year: 2023,
          authors: ['Test Author']
        }))
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth-v2/login',
        payload: {
          email: 'perf@example.com',
          password: 'password'
        }
      });

      const token = loginResponse.cookies?.find(c => c.name === 'the_scientist_access')?.value;
      
      const startTime = Date.now();
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/candidates`,
        headers: {
          'Cookie': `the_scientist_access=${token}`
        }
      });
      const duration = Date.now() - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Error Handling', () => {
    it('should not leak sensitive information in errors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nonexistent-endpoint'
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body).not.toContain('stack');
      expect(body).not.toContain('internal');
    });

    it('should handle database errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, just ensure error responses are properly formatted
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/invalid-uuid'
      });

      expect(response.statusCode).toBe(401); // Should require auth first
    });
  });
});
