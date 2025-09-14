import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../config/env';

let connection: IORedis | undefined;

export function getExplorerQueue() {
  if (!connection) {
    connection = new IORedis(env.REDIS_URL);
  }
  const queue = new Queue('explorer', { connection });
  return queue;
}

