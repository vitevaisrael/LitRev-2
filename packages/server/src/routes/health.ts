import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';
import Redis from 'ioredis';
import { Client } from 'minio';
import { env } from '../config/env';

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]) as Promise<T>;
}

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    const started = Date.now();
    // Probes
    const dbProbe = (async () => {
      try {
        await withTimeout(prisma.$queryRaw`SELECT 1`, 1500);
        return true;
      } catch {
        return false;
      }
    })();

    const redisProbe = (async () => {
      try {
        if (!env.REDIS_URL) return false;
        const redis = new Redis(env.REDIS_URL, { lazyConnect: true });
        await withTimeout(redis.connect(), 1000).catch(() => {});
        const pong = await withTimeout(redis.ping(), 1000);
        await redis.quit().catch(() => redis.disconnect());
        return pong === 'PONG' || pong === 'pong';
      } catch {
        return false;
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
        // bucketExists returns boolean or throws
        const exists = await withTimeout(minio.bucketExists(env.S3_BUCKET), 1500);
        return !!exists;
      } catch {
        return false;
      }
    })();

    const [db, redis, s3] = await Promise.all([dbProbe, redisProbe, s3Probe]);
    const healthy = db && redis && s3;

    const payload = {
      status: healthy ? 'healthy' : 'degraded',
      services: { db, redis, s3 },
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
      responseMs: Date.now() - started
    };

    if (healthy) {
      return sendSuccess(reply, payload);
    } else {
      // Keep HTTP 200 but signal not-ok via body for UI to show red
      return reply.status(200).send({ ok: false, error: { code: 'HEALTH_DEGRADED', message: JSON.stringify(payload) } });
    }
  });
}
