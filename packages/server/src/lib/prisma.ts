import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

// Create a single instance of PrismaClient with proper configuration
const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: env.DATABASE_URL
    }
  },
  // Connection pool configuration
  __internal: {
    engine: {
      connectTimeout: 60000, // 60 seconds
      queryTimeout: 30000,   // 30 seconds
    }
  }
});

// Graceful shutdown
process.on('beforeExit', async () => {
  console.log('Disconnecting from database...');
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, disconnecting from database...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, disconnecting from database...');
  await prisma.$disconnect();
  process.exit(0);
});

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export { prisma };
