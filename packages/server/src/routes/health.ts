import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { prisma, checkDatabaseHealth } from '../lib/prisma';
import { getRedis, isRedisAvailable } from '../lib/redis';
import { Client } from 'minio';
import { env } from '../config/env';

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]) as Promise<T>;
}

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async (request, reply) => {
    const started = Date.now();
    
    // Probes with detailed error information
    const dbProbe = (async () => {
      try {
        const isHealthy = await withTimeout(checkDatabaseHealth(), 1500);
        return { healthy: isHealthy, error: null };
      } catch (error) {
        return { 
          healthy: false, 
          error: error instanceof Error ? error.message : 'Unknown database error' 
        };
      }
    })();

    const redisProbe = (async () => {
      try {
        if (!env.REDIS_URL) {
          return { healthy: false, error: 'Redis URL not configured' };
        }
        const isHealthy = await withTimeout(isRedisAvailable(), 1000);
        return { healthy: isHealthy, error: null };
      } catch (error) {
        return { 
          healthy: false, 
          error: error instanceof Error ? error.message : 'Unknown Redis error' 
        };
      }
    })();

    const s3Probe = (async () => {
      try {
        const endpoint = new URL(env.S3_ENDPOINT);
        const minio = new Client({
          endPoint: endpoint.hostname,
          port: Number(endpoint.port) || (endpoint.protocol === 'https:' ? 443 : 9000),
          useSSL: endpoint.protocol === 'https:',
          accessKey: env.S3_ACCESS_KEY,
          secretKey: env.S3_SECRET_KEY,
        });
        const exists = await withTimeout(minio.bucketExists(env.S3_BUCKET), 1500);
        return { healthy: !!exists, error: null };
      } catch (error) {
        return { 
          healthy: false, 
          error: error instanceof Error ? error.message : 'Unknown S3 error' 
        };
      }
    })();

    const [db, redis, s3] = await Promise.all([dbProbe, redisProbe, s3Probe]);
    
    const allHealthy = db.healthy && redis.healthy && s3.healthy;
    const criticalHealthy = db.healthy; // Database is critical

    const payload = {
      status: allHealthy ? 'healthy' : criticalHealthy ? 'degraded' : 'unhealthy',
      services: { 
        database: db, 
        redis: redis, 
        storage: s3 
      },
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
      responseMs: Date.now() - started,
      version: process.env.npm_package_version || 'unknown',
      environment: env.NODE_ENV
    };

    if (allHealthy) {
      return sendSuccess(reply, payload);
    } else if (criticalHealthy) {
      return reply.status(200).send({ 
        ok: false, 
        error: { 
          code: 'HEALTH_DEGRADED', 
          message: 'Some services are unavailable',
          details: payload
        } 
      });
    } else {
      return reply.status(503).send({ 
        ok: false, 
        error: { 
          code: 'HEALTH_UNHEALTHY', 
          message: 'Critical services are unavailable',
          details: payload
        } 
      });
    }
  });

  // Detailed health check with more information
  fastify.get('/health/detailed', async (request, reply) => {
    const started = Date.now();
    
    const healthInfo = {
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || 'unknown',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };

    return sendSuccess(reply, healthInfo);
  });
}
