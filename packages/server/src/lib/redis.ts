import { Redis } from 'ioredis';
import { env } from '../config/env';

let redisClient: Redis | null = null;

/**
 * Get Redis client instance
 */
export function getRedis(): Redis {
  if (!redisClient) {
    const url = env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(url, {
      maxRetriesPerRequest: null, // Required for BullMQ compatibility
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 10000,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      enableOfflineQueue: false,
      keepAlive: 30000,
      family: 4, // Use IPv4
      db: 0,
    });

    redisClient.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    redisClient.on('ready', () => {
      console.log('Redis client ready');
    });

    redisClient.on('close', () => {
      console.log('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });
  }

  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    } finally {
      redisClient = null;
    }
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  console.log('Closing Redis connection...');
  await closeRedis();
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing Redis connection...');
  await closeRedis();
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing Redis connection...');
  await closeRedis();
});

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const redis = getRedis();
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis not available:', error);
    return false;
  }
}
