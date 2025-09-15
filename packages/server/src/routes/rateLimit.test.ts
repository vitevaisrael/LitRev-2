import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';

// Mock prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ count: 1 }])
  }
}));

// Mock Redis
vi.mock('../lib/redis', () => ({
  getRedis: vi.fn().mockReturnValue({
    ping: vi.fn().mockResolvedValue('PONG')
  })
}));

// Mock S3
vi.mock('../modules/storage/s3', () => ({
  testS3Connection: vi.fn().mockResolvedValue(true)
}));

describe('rateLimit', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create a mock Fastify instance
    fastify = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    } as any;

    await healthRoutes(fastify);
  });

  it('should register health route', () => {
    expect(fastify.get).toHaveBeenCalledWith('/health', expect.any(Function));
  });

  it('should return health status', async () => {
    // Get the registered route handler
    const getCalls = (fastify.get as any).mock.calls;
    const healthRoute = getCalls.find((call: any) => call[0] === '/health');
    const handler = healthRoute[1];

    // Mock request and reply
    const mockRequest = {};
    const mockReply = {
      send: vi.fn()
    };

    await handler(mockRequest, mockReply);

    expect(mockReply.send).toHaveBeenCalledWith({
      ok: true,
      data: {
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        services: {
          database: 'healthy',
          redis: 'healthy',
          s3: 'healthy'
        }
      }
    });
  });

  it('should handle health check with degraded services', async () => {
    const { prisma } = await import('../lib/prisma');
    (prisma.$queryRaw as any).mockRejectedValue(new Error('Database error'));

    // Get the registered route handler
    const getCalls = (fastify.get as any).mock.calls;
    const healthRoute = getCalls.find((call: any) => call[0] === '/health');
    const handler = healthRoute[1];

    // Mock request and reply
    const mockRequest = {};
    const mockReply = {
      send: vi.fn()
    };

    await handler(mockRequest, mockReply);

    expect(mockReply.send).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: 'SERVICE_DEGRADED',
        message: 'Some services are unhealthy',
        requestId: undefined
      }
    });
  });
});
