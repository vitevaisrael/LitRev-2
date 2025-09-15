import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { exportsRoutes } from './exports';
import { prisma } from '../lib/prisma';

// Mock prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: vi.fn()
    },
    candidate: {
      findMany: vi.fn()
    },
    prismaData: {
      findUnique: vi.fn()
    },
    draft: {
      findMany: vi.fn()
    },
    claim: {
      findMany: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  }
}));

// Mock DOCX export
vi.mock('../exports/docxExport', () => ({
  exportToDocx: vi.fn()
}));

// Mock PRISMA SVG
vi.mock('../modules/exports/prismaSvg', () => ({
  generatePrismaSvg: vi.fn().mockReturnValue('<svg>Mock SVG</svg>')
}));

describe('exportsRoutes', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create a mock Fastify instance
    fastify = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    } as any;

    await exportsRoutes(fastify);
  });

  describe('DOCX export route', () => {
    it('should register DOCX export route', () => {
      expect(fastify.post).toHaveBeenCalledWith('/projects/:id/exports/docx', expect.any(Function));
    });

    it('should handle DOCX export successfully', async () => {
      const mockProject = {
        id: 'project-1',
        title: 'Test Project'
      };

      const mockExportResult = {
        buffer: Buffer.from('mock docx content'),
        filename: 'Test_Project_export_2023-01-01.docx',
        metadata: {
          candidateCount: 5,
          includedCount: 3,
          excludedCount: 2,
          exportDate: new Date()
        }
      };

      (prisma.project.findUnique as any).mockResolvedValue(mockProject);
      (prisma.auditLog.create as any).mockResolvedValue({});

      const { exportToDocx } = await import('../exports/docxExport');
      (exportToDocx as any).mockResolvedValue(mockExportResult);

      // Get the registered route handler
      const postCalls = (fastify.post as any).mock.calls;
      const docxRoute = postCalls.find((call: any) => call[0] === '/projects/:id/exports/docx');
      const handler = docxRoute[1];

      // Mock request and reply
      const mockRequest = {
        params: { id: 'project-1' },
        body: { includeAbstract: true }
      };

      const mockReply = {
        header: vi.fn(),
        send: vi.fn()
      };

      await handler(mockRequest, mockReply);

      expect(exportToDocx).toHaveBeenCalledWith('project-1', { includeAbstract: true });
      expect(mockReply.header).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(mockReply.header).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="Test_Project_export_2023-01-01.docx"');
      expect(mockReply.send).toHaveBeenCalledWith(mockExportResult.buffer);
    });

    it('should handle project not found error', async () => {
      (prisma.project.findUnique as any).mockResolvedValue(null);

      // Get the registered route handler
      const postCalls = (fastify.post as any).mock.calls;
      const docxRoute = postCalls.find((call: any) => call[0] === '/projects/:id/exports/docx');
      const handler = docxRoute[1];

      // Mock request and reply
      const mockRequest = {
        params: { id: 'nonexistent-project' },
        body: {}
      };

      const mockReply = {
        header: vi.fn(),
        send: vi.fn()
      };

      await handler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Project not found',
          requestId: undefined
        }
      });
    });

    it('should handle export error', async () => {
      const mockProject = {
        id: 'project-1',
        title: 'Test Project'
      };

      (prisma.project.findUnique as any).mockResolvedValue(mockProject);

      const { exportToDocx } = await import('../exports/docxExport');
      (exportToDocx as any).mockRejectedValue(new Error('Export failed'));

      // Get the registered route handler
      const postCalls = (fastify.post as any).mock.calls;
      const docxRoute = postCalls.find((call: any) => call[0] === '/projects/:id/exports/docx');
      const handler = docxRoute[1];

      // Mock request and reply
      const mockRequest = {
        params: { id: 'project-1' },
        body: {}
      };

      const mockReply = {
        header: vi.fn(),
        send: vi.fn()
      };

      await handler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'EXPORT_ERROR',
          message: 'Export failed',
          requestId: undefined
        }
      });
    });
  });
});
