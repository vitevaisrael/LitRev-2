import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateIntegrityFlags, 
  checkRetractions, 
  checkPredatoryJournals,
  getIntegrityStats,
  batchIntegrityCheck
} from './integrity';
import { ProviderRecord } from '@the-scientist/schemas';

// Mock prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    journalBlocklist: {
      findFirst: vi.fn()
    },
    candidate: {
      findMany: vi.fn(),
      count: vi.fn()
    }
  }
}));

describe('integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateIntegrityFlags', () => {
    it('should generate flags for a record', async () => {
      const record: ProviderRecord = {
        title: 'Test Article',
        journal: 'Test Journal',
        doi: '10.1000/test',
        pmid: '12345678',
        source: 'pubmed'
      };

      const flags = await generateIntegrityFlags(record);

      expect(flags).toHaveProperty('detectedAt');
      expect(flags.detectedAt).toBeDefined();
    });

    it('should handle records without identifiers', async () => {
      const record: ProviderRecord = {
        title: 'Test Article',
        journal: 'Test Journal',
        source: 'pubmed'
      };

      const flags = await generateIntegrityFlags(record);

      expect(flags).toHaveProperty('detectedAt');
      expect(flags.retracted).toBeUndefined();
      expect(flags.predatory).toBeUndefined();
    });
  });

  describe('checkRetractions', () => {
    it('should check retractions for record with PMID', async () => {
      const record: ProviderRecord = {
        title: 'Test Article',
        pmid: '12345678',
        source: 'pubmed'
      };

      const results = await checkRetractions(record);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should check retractions for record with DOI', async () => {
      const record: ProviderRecord = {
        title: 'Test Article',
        doi: '10.1000/test',
        source: 'pubmed'
      };

      const results = await checkRetractions(record);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle records without identifiers', async () => {
      const record: ProviderRecord = {
        title: 'Test Article',
        source: 'pubmed'
      };

      const results = await checkRetractions(record);

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });
  });

  describe('checkPredatoryJournals', () => {
    it('should check against blocklist', async () => {
      const { prisma } = await import('../lib/prisma');
      
      (prisma.journalBlocklist.findFirst as any).mockResolvedValue({
        id: 'blocklist-1',
        issn: '1234-5678',
        note: 'Predatory journal',
        addedBy: 'user-1',
        addedAt: new Date()
      });

      const record: ProviderRecord = {
        title: 'Test Article',
        journal: 'Predatory Journal',
        source: 'pubmed'
      };

      const results = await checkPredatoryJournals(record);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].predatory).toBe(true);
      expect(results[0].source).toBe('blocklist');
    });

    it('should return empty array when journal not in blocklist', async () => {
      const { prisma } = await import('../lib/prisma');
      
      (prisma.journalBlocklist.findFirst as any).mockResolvedValue(null);

      const record: ProviderRecord = {
        title: 'Test Article',
        journal: 'Legitimate Journal',
        source: 'pubmed'
      };

      const results = await checkPredatoryJournals(record);

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });

    it('should handle records without journal', async () => {
      const record: ProviderRecord = {
        title: 'Test Article',
        source: 'pubmed'
      };

      const results = await checkPredatoryJournals(record);

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });
  });

  describe('getIntegrityStats', () => {
    it('should return integrity statistics', async () => {
      const { prisma } = await import('../lib/prisma');
      
      const mockCandidates = [
        { flags: { retracted: true, predatory: false } },
        { flags: { retracted: false, predatory: true } },
        { flags: {} },
        { flags: { retracted: true, predatory: true } }
      ];

      (prisma.candidate.findMany as any).mockResolvedValue(mockCandidates);

      const stats = await getIntegrityStats('project-1');

      expect(stats).toHaveProperty('totalRecords');
      expect(stats).toHaveProperty('flaggedRecords');
      expect(stats).toHaveProperty('retractedRecords');
      expect(stats).toHaveProperty('predatoryRecords');
      expect(stats).toHaveProperty('flagBreakdown');
      
      expect(stats.totalRecords).toBe(4);
      expect(stats.flaggedRecords).toBe(3);
      expect(stats.retractedRecords).toBe(2);
      expect(stats.predatoryRecords).toBe(2);
    });

    it('should handle empty project', async () => {
      const { prisma } = await import('../lib/prisma');
      
      (prisma.candidate.findMany as any).mockResolvedValue([]);

      const stats = await getIntegrityStats('empty-project');

      expect(stats.totalRecords).toBe(0);
      expect(stats.flaggedRecords).toBe(0);
      expect(stats.retractedRecords).toBe(0);
      expect(stats.predatoryRecords).toBe(0);
    });

    it('should handle database errors', async () => {
      const { prisma } = await import('../lib/prisma');
      
      (prisma.candidate.findMany as any).mockRejectedValue(new Error('Database error'));

      const stats = await getIntegrityStats('error-project');

      expect(stats.totalRecords).toBe(0);
      expect(stats.flaggedRecords).toBe(0);
      expect(stats.retractedRecords).toBe(0);
      expect(stats.predatoryRecords).toBe(0);
    });
  });

  describe('batchIntegrityCheck', () => {
    it('should process multiple records', async () => {
      const records: ProviderRecord[] = [
        {
          title: 'Article 1',
          doi: '10.1000/test1',
          source: 'pubmed'
        },
        {
          title: 'Article 2',
          doi: '10.1000/test2',
          source: 'pubmed'
        }
      ];

      const results = await batchIntegrityCheck(records);

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(2);
      
      for (const [key, flags] of results) {
        expect(flags).toHaveProperty('detectedAt');
      }
    });

    it('should handle empty records array', async () => {
      const results = await batchIntegrityCheck([]);

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(0);
    });

    it('should handle records without identifiers', async () => {
      const records: ProviderRecord[] = [
        {
          title: 'Article 1',
          source: 'pubmed'
        }
      ];

      const results = await batchIntegrityCheck(records);

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(1);
    });
  });
});
