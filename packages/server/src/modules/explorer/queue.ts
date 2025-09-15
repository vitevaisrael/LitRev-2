import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../config/env';

let connection: IORedis | undefined;

export function getExplorerQueue() {
  if (!connection && env.REDIS_URL) {
    connection = new IORedis(env.REDIS_URL);
  }
  if (!connection) {
    throw new Error('Redis connection not available');
  }
  const queue = new Queue('explorer', { connection });
  return queue;
}

