import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToDocx } from './docxExport';
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
    }
  }
}));

// Mock citation-js
vi.mock('citation-js', () => ({
  Cite: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    add: vi.fn().mockReturnThis(),
    get: vi.fn().mockReturnValue('Mock Citation')
  }))
}));

describe('docxExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportToDocx', () => {
    it('should export project to DOCX successfully', async () => {
      const mockProject = {
        id: 'project-1',
        title: 'Test Project',
        description: 'Test Description'
      };

      const mockCandidates = [
        {
          id: 'candidate-1',
          title: 'Test Article 1',
          journal: 'Test Journal',
          year: 2023,
          authors: ['Author 1', 'Author 2'],
          abstract: 'Test abstract',
          doi: '10.1000/test1',
          status: 'included',
          flags: {}
        },
        {
          id: 'candidate-2',
          title: 'Test Article 2',
          journal: 'Test Journal 2',
          year: 2022,
          authors: ['Author 3'],
          abstract: 'Test abstract 2',
          doi: '10.1000/test2',
          status: 'excluded',
          flags: {}
        }
      ];

      const mockPrismaData = {
        identified: 100,
        deduped: 80,
        screened: 60,
        included: 40,
        excluded: 20
      };

      (prisma.project.findUnique as any).mockResolvedValue(mockProject);
      (prisma.candidate.findMany as any).mockResolvedValue(mockCandidates);
      (prisma.prismaData.findUnique as any).mockResolvedValue(mockPrismaData);

      const result = await exportToDocx('project-1');

      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.candidateCount).toBe(2);
      expect(result.metadata.includedCount).toBe(1);
      expect(result.metadata.excludedCount).toBe(1);
      expect(result.filename).toContain('Test_Project');
      expect(result.filename).toContain('.docx');
    });

    it('should throw error if project not found', async () => {
      (prisma.project.findUnique as any).mockResolvedValue(null);

      await expect(exportToDocx('nonexistent-project')).rejects.toThrow('Project not found');
    });

    it('should throw error if no candidates found', async () => {
      const mockProject = {
        id: 'project-1',
        title: 'Test Project',
        description: 'Test Description'
      };

      (prisma.project.findUnique as any).mockResolvedValue(mockProject);
      (prisma.candidate.findMany as any).mockResolvedValue([]);

      await expect(exportToDocx('project-1')).rejects.toThrow('No candidates found for export');
    });

    it('should handle candidates with integrity flags', async () => {
      const mockProject = {
        id: 'project-1',
        title: 'Test Project',
        description: 'Test Description'
      };

      const mockCandidates = [
        {
          id: 'candidate-1',
          title: 'Test Article 1',
          journal: 'Test Journal',
          year: 2023,
          authors: ['Author 1'],
          abstract: 'Test abstract',
          doi: '10.1000/test1',
          status: 'included',
          flags: {
            retracted: true,
            predatory: false
          }
        }
      ];

      (prisma.project.findUnique as any).mockResolvedValue(mockProject);
      (prisma.candidate.findMany as any).mockResolvedValue(mockCandidates);
      (prisma.prismaData.findUnique as any).mockResolvedValue(null);

      const result = await exportToDocx('project-1', { includeIntegrityFlags: true });

      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('metadata');
    });

    it('should handle different export options', async () => {
      const mockProject = {
        id: 'project-1',
        title: 'Test Project',
        description: 'Test Description'
      };

      const mockCandidates = [
        {
          id: 'candidate-1',
          title: 'Test Article 1',
          journal: 'Test Journal',
          year: 2023,
          authors: ['Author 1'],
          abstract: 'Test abstract',
          doi: '10.1000/test1',
          status: 'included',
          flags: {}
        }
      ];

      (prisma.project.findUnique as any).mockResolvedValue(mockProject);
      (prisma.candidate.findMany as any).mockResolvedValue(mockCandidates);
      (prisma.prismaData.findUnique as any).mockResolvedValue(null);

      const options = {
        includeAbstract: false,
        includeAuthors: false,
        includeJournal: false,
        citationStyle: 'apa' as const,
        includePrismaFlow: false,
        includeIntegrityFlags: false
      };

      const result = await exportToDocx('project-1', options);

      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('metadata');
    });
  });
});
