import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { detectIntegrityFlags, detectRetraction, detectPredatoryJournal, getIntegrityStats } from './integrity';
import { ProviderRecord } from '@the-scientist/schemas';

describe('Integrity Service', () => {
  let testUserId: string;
  let testProjectId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      }
    });
    testUserId = user.id;

    // Create test project
    const project = await prisma.project.create({
      data: {
        ownerId: testUserId,
        title: 'Test Project',
        settings: {}
      }
    });
    testProjectId = project.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({ where: { projectId: testProjectId } });
    await prisma.prismaLog.deleteMany({ where: { projectId: testProjectId } });
    await prisma.searchResult.deleteMany();
    await prisma.searchRun.deleteMany();
    await prisma.savedSearch.deleteMany({ where: { projectId: testProjectId } });
    await prisma.journalBlocklist.deleteMany();
    await prisma.project.deleteMany({ where: { id: testProjectId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  describe('detectRetraction', () => {
    it('should detect retraction from PubMed publication type', async () => {
      const record: ProviderRecord = {
        title: 'Test Retracted Article',
        source: 'pubmed',
        rawPayload: {
          PublicationTypeList: {
            PublicationType: 'Retracted Publication'
          }
        }
      };

      const result = await detectRetraction(record);
      expect(result.retracted).toBe(true);
      expect(result.source).toBe('pubmed_publication_type');
      expect(result.notes).toContain('Retracted Publication');
    });

    it('should detect retraction from PubMed comments', async () => {
      const record: ProviderRecord = {
        title: 'Test Retracted Article',
        source: 'pubmed',
        rawPayload: {
          CommentsCorrectionsList: {
            CommentsCorrections: {
              RefType: 'Retraction',
              RefSource: 'Nature. 2023;123:456-789'
            }
          }
        }
      };

      const result = await detectRetraction(record);
      expect(result.retracted).toBe(true);
      expect(result.source).toBe('pubmed_comments');
      expect(result.notes).toContain('Retraction notice found');
    });

    it('should detect retraction from Crossref relation', async () => {
      const record: ProviderRecord = {
        title: 'Test Retracted Article',
        source: 'crossref',
        rawPayload: {
          relation: {
            'is-retracted-by': '10.1000/retraction.doi'
          }
        }
      };

      const result = await detectRetraction(record);
      expect(result.retracted).toBe(true);
      expect(result.source).toBe('crossref_relation');
    });

    it('should not detect retraction for normal article', async () => {
      const record: ProviderRecord = {
        title: 'Normal Article',
        source: 'pubmed',
        rawPayload: {
          PublicationTypeList: {
            PublicationType: 'Journal Article'
          }
        }
      };

      const result = await detectRetraction(record);
      expect(result.retracted).toBe(false);
      expect(result.source).toBe('none');
    });
  });

  describe('detectPredatoryJournal', () => {
    it('should detect predatory journal from blocklist', async () => {
      // Add journal to blocklist
      await prisma.journalBlocklist.create({
        data: {
          issn: '1234-5678',
          note: 'Known predatory journal',
          addedBy: testUserId
        }
      });

      const record: ProviderRecord = {
        title: 'Test Article',
        journal: '1234-5678',
        source: 'pubmed'
      };

      const result = await detectPredatoryJournal(record);
      expect(result.predatory).toBe(true);
      expect(result.source).toBe('journal_blocklist');
      expect(result.notes).toContain('Known predatory journal');
    });

    it('should not detect predatory journal for normal journal', async () => {
      const record: ProviderRecord = {
        title: 'Test Article',
        journal: 'Nature',
        source: 'pubmed'
      };

      const result = await detectPredatoryJournal(record);
      expect(result.predatory).toBe(false);
      expect(result.source).toBe('none');
    });

    it('should handle missing journal gracefully', async () => {
      const record: ProviderRecord = {
        title: 'Test Article',
        source: 'pubmed'
      };

      const result = await detectPredatoryJournal(record);
      expect(result.predatory).toBe(false);
      expect(result.source).toBe('none');
    });
  });

  describe('detectIntegrityFlags', () => {
    it('should detect both retraction and predatory flags', async () => {
      // Add journal to blocklist
      await prisma.journalBlocklist.create({
        data: {
          issn: '1234-5678',
          note: 'Known predatory journal',
          addedBy: testUserId
        }
      });

      const record: ProviderRecord = {
        title: 'Test Retracted Article',
        journal: '1234-5678',
        source: 'pubmed',
        rawPayload: {
          PublicationTypeList: {
            PublicationType: 'Retracted Publication'
          }
        }
      };

      const result = await detectIntegrityFlags(record);
      expect(result.flags.retracted).toBe(true);
      expect(result.flags.predatory).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.flags.sources).toContain('pubmed_publication_type');
      expect(result.flags.sources).toContain('journal_blocklist');
    });

    it('should return empty flags for clean record', async () => {
      const record: ProviderRecord = {
        title: 'Clean Article',
        journal: 'Nature',
        source: 'pubmed',
        rawPayload: {
          PublicationTypeList: {
            PublicationType: 'Journal Article'
          }
        }
      };

      const result = await detectIntegrityFlags(record);
      expect(Object.keys(result.flags)).toHaveLength(0);
      expect(result.confidence).toBe('low');
    });
  });

  describe('getIntegrityStats', () => {
    it('should return correct integrity statistics', async () => {
      // Create test data
      const savedSearch = await prisma.savedSearch.create({
        data: {
          projectId: testProjectId,
          name: 'Test Search',
          queryManifest: {},
          createdBy: testUserId
        }
      });

      const searchRun = await prisma.searchRun.create({
        data: {
          savedSearchId: savedSearch.id,
          status: 'success'
        }
      });

      // Create search results with different flags
      await prisma.searchResult.createMany({
        data: [
          {
            searchRunId: searchRun.id,
            canonicalHash: 'hash1',
            title: 'Clean Article 1',
            source: 'pubmed',
            flags: {},
            rawPayload: {}
          },
          {
            searchRunId: searchRun.id,
            canonicalHash: 'hash2',
            title: 'Retracted Article',
            source: 'pubmed',
            flags: { retracted: true, sources: ['pubmed_publication_type'] },
            rawPayload: {}
          },
          {
            searchRunId: searchRun.id,
            canonicalHash: 'hash3',
            title: 'Predatory Article',
            source: 'pubmed',
            flags: { predatory: true, sources: ['journal_blocklist'] },
            rawPayload: {}
          },
          {
            searchRunId: searchRun.id,
            canonicalHash: 'hash4',
            title: 'Both Flags Article',
            source: 'pubmed',
            flags: { 
              retracted: true, 
              predatory: true, 
              sources: ['pubmed_publication_type', 'journal_blocklist'] 
            },
            rawPayload: {}
          }
        ]
      });

      const stats = await getIntegrityStats(testProjectId);
      expect(stats.total).toBe(4);
      expect(stats.flagged).toBe(3); // 3 out of 4 have flags
      expect(stats.retracted).toBe(2); // 2 have retracted flag
      expect(stats.predatory).toBe(2); // 2 have predatory flag
      expect(stats.breakdown['pubmed_publication_type']).toBe(2);
      expect(stats.breakdown['journal_blocklist']).toBe(2);
    });
  });
});
