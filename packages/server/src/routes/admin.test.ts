import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { adminRoutes } from './admin';
import { prisma } from '../lib/prisma';

// Mock prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    journalBlocklist: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    candidate: {
      findMany: vi.fn(),
      update: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  }
}));

// Mock integrity service
vi.mock('../services/integrity', () => ({
  getIntegrityStats: vi.fn(),
  generateIntegrityFlags: vi.fn()
}));

describe('adminRoutes', () => {
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

    await adminRoutes(fastify);
  });

  describe('Journal blocklist routes', () => {
    it('should register journal blocklist routes', () => {
      expect(fastify.get).toHaveBeenCalledWith('/admin/journal-blocklist', expect.any(Function));
      expect(fastify.post).toHaveBeenCalledWith('/admin/journal-blocklist', expect.any(Function));
      expect(fastify.put).toHaveBeenCalledWith('/admin/journal-blocklist/:id', expect.any(Function));
      expect(fastify.delete).toHaveBeenCalledWith('/admin/journal-blocklist/:id', expect.any(Function));
    });

    it('should handle GET journal blocklist', async () => {
      const mockBlocklist = [
        {
          id: 'blocklist-1',
          issn: '1234-5678',
          note: 'Predatory journal',
          addedAt: new Date(),
          addedByUser: {
            id: 'user-1',
            name: 'Admin User',
            email: 'admin@example.com'
          }
        }
      ];

      (prisma.journalBlocklist.findMany as any).mockResolvedValue(mockBlocklist);
      (prisma.journalBlocklist.count as any).mockResolvedValue(1);

      // Get the registered route handler
      const getCalls = (fastify.get as any).mock.calls;
      const blocklistRoute = getCalls.find((call: any) => call[0] === '/admin/journal-blocklist');
      const handler = blocklistRoute[1];

      // Mock request and reply
      const mockRequest = {
        query: { limit: 50, offset: 0 }
      };

      const mockReply = {
        send: vi.fn()
      };

      await handler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        ok: true,
        data: {
          blocklist: [
            {
              id: 'blocklist-1',
              issn: '1234-5678',
              note: 'Predatory journal',
              addedAt: expect.any(Date),
              addedBy: {
                id: 'user-1',
                name: 'Admin User',
                email: 'admin@example.com'
              }
            }
          ],
          pagination: {
            limit: 50,
            offset: 0,
            total: 1,
            hasMore: false
          }
        }
      });
    });

    it('should handle POST journal blocklist', async () => {
      const mockBlocklistEntry = {
        id: 'blocklist-1',
        issn: '1234-5678',
        note: 'Predatory journal',
        addedAt: new Date(),
        addedBy: 'user-1',
        addedByUser: {
          id: 'user-1',
          name: 'Admin User',
          email: 'admin@example.com'
        }
      };

      (prisma.journalBlocklist.findUnique as any).mockResolvedValue(null);
      (prisma.journalBlocklist.create as any).mockResolvedValue(mockBlocklistEntry);
      (prisma.auditLog.create as any).mockResolvedValue({});

      // Get the registered route handler
      const postCalls = (fastify.post as any).mock.calls;
      const blocklistRoute = postCalls.find((call: any) => call[0] === '/admin/journal-blocklist');
      const handler = blocklistRoute[1];

      // Mock request and reply
      const mockRequest = {
        body: { issn: '1234-5678', note: 'Predatory journal' },
        user: { id: 'user-1' }
      };

      const mockReply = {
        send: vi.fn()
      };

      await handler(mockRequest, mockReply);

      expect(prisma.journalBlocklist.create).toHaveBeenCalledWith({
        data: {
          issn: '1234-5678',
          note: 'Predatory journal',
          addedBy: 'user-1'
        },
        include: {
          addedByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      expect(mockReply.send).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 'blocklist-1',
          issn: '1234-5678',
          note: 'Predatory journal',
          addedAt: expect.any(Date),
          addedBy: {
            id: 'user-1',
            name: 'Admin User',
            email: 'admin@example.com'
          }
        }
      });
    });

    it('should handle duplicate ISSN error', async () => {
      const mockExistingEntry = {
        id: 'blocklist-1',
        issn: '1234-5678',
        note: 'Existing entry',
        addedAt: new Date(),
        addedBy: 'user-1'
      };

      (prisma.journalBlocklist.findUnique as any).mockResolvedValue(mockExistingEntry);

      // Get the registered route handler
      const postCalls = (fastify.post as any).mock.calls;
      const blocklistRoute = postCalls.find((call: any) => call[0] === '/admin/journal-blocklist');
      const handler = blocklistRoute[1];

      // Mock request and reply
      const mockRequest = {
        body: { issn: '1234-5678', note: 'New entry' },
        user: { id: 'user-1' }
      };

      const mockReply = {
        send: vi.fn()
      };

      await handler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'CONFLICT',
          message: 'ISSN already in blocklist',
          requestId: undefined
        }
      });
    });
  });

  describe('Integrity stats routes', () => {
    it('should register integrity stats route', () => {
      expect(fastify.get).toHaveBeenCalledWith('/admin/integrity-stats', expect.any(Function));
    });

    it('should handle GET integrity stats for project', async () => {
      const { getIntegrityStats } = await import('../services/integrity');
      
      (getIntegrityStats as any).mockResolvedValue({
        totalRecords: 100,
        flaggedRecords: 10,
        retractedRecords: 5,
        predatoryRecords: 3,
        flagBreakdown: {
          retracted: 5,
          predatory: 3
        }
      });

      // Get the registered route handler
      const getCalls = (fastify.get as any).mock.calls;
      const statsRoute = getCalls.find((call: any) => call[0] === '/admin/integrity-stats');
      const handler = statsRoute[1];

      // Mock request and reply
      const mockRequest = {
        query: { projectId: 'project-1' }
      };

      const mockReply = {
        send: vi.fn()
      };

      await handler(mockRequest, mockReply);

      expect(getIntegrityStats).toHaveBeenCalledWith('project-1');
      expect(mockReply.send).toHaveBeenCalledWith({
        ok: true,
        data: {
          projectId: 'project-1',
          totalRecords: 100,
          flaggedRecords: 10,
          retractedRecords: 5,
          predatoryRecords: 3,
          flagBreakdown: {
            retracted: 5,
            predatory: 3
          }
        }
      });
    });

    it('should handle GET global integrity stats', async () => {
      (prisma.candidate.count as any).mockResolvedValue(1000);
      (prisma.candidate.count as any).mockResolvedValueOnce(1000).mockResolvedValueOnce(50);
      (prisma.journalBlocklist.count as any).mockResolvedValue(25);

      // Get the registered route handler
      const getCalls = (fastify.get as any).mock.calls;
      const statsRoute = getCalls.find((call: any) => call[0] === '/admin/integrity-stats');
      const handler = statsRoute[1];

      // Mock request and reply
      const mockRequest = {
        query: {}
      };

      const mockReply = {
        send: vi.fn()
      };

      await handler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        ok: true,
        data: {
          totalCandidates: 1000,
          flaggedCandidates: 50,
          blocklistCount: 25,
          flagRate: 5
        }
      });
    });
  });

  describe('Integrity check routes', () => {
    it('should register integrity check route', () => {
      expect(fastify.post).toHaveBeenCalledWith('/admin/integrity-check', expect.any(Function));
    });

    it('should handle POST integrity check', async () => {
      const mockCandidates = [
        {
          id: 'candidate-1',
          title: 'Test Article 1',
          journal: 'Test Journal',
          doi: '10.1000/test1',
          pmid: '12345678',
          flags: {}
        },
        {
          id: 'candidate-2',
          title: 'Test Article 2',
          journal: 'Test Journal 2',
          doi: '10.1000/test2',
          pmid: '87654321',
          flags: {}
        }
      ];

      (prisma.candidate.findMany as any).mockResolvedValue(mockCandidates);
      (prisma.candidate.update as any).mockResolvedValue({});
      (prisma.auditLog.create as any).mockResolvedValue({});

      const { generateIntegrityFlags } = await import('../services/integrity');
      (generateIntegrityFlags as any).mockResolvedValue({
        retracted: false,
        predatory: false,
        detectedAt: new Date().toISOString()
      });

      // Get the registered route handler
      const postCalls = (fastify.post as any).mock.calls;
      const checkRoute = postCalls.find((call: any) => call[0] === '/admin/integrity-check');
      const handler = checkRoute[1];

      // Mock request and reply
      const mockRequest = {
        body: { projectId: 'project-1' },
        user: { id: 'user-1' }
      };

      const mockReply = {
        send: vi.fn()
      };

      await handler(mockRequest, mockReply);

      expect(prisma.candidate.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        select: {
          id: true,
          title: true,
          journal: true,
          doi: true,
          pmid: true,
          flags: true
        }
      });

      expect(mockReply.send).toHaveBeenCalledWith({
        ok: true,
        data: {
          checkedCount: 2,
          results: expect.arrayContaining([
            expect.objectContaining({
              candidateId: 'candidate-1',
              title: 'Test Article 1',
              flags: expect.any(Object)
            }),
            expect.objectContaining({
              candidateId: 'candidate-2',
              title: 'Test Article 2',
              flags: expect.any(Object)
            })
          ])
        }
      });
    });

    it('should handle no candidates found', async () => {
      (prisma.candidate.findMany as any).mockResolvedValue([]);

      // Get the registered route handler
      const postCalls = (fastify.post as any).mock.calls;
      const checkRoute = postCalls.find((call: any) => call[0] === '/admin/integrity-check');
      const handler = checkRoute[1];

      // Mock request and reply
      const mockRequest = {
        body: { projectId: 'empty-project' },
        user: { id: 'user-1' }
      };

      const mockReply = {
        send: vi.fn()
      };

      await handler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No candidates found to check',
          requestId: undefined
        }
      });
    });
  });
});
