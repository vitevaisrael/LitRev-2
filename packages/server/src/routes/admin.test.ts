import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { prisma } from '../lib/prisma';
import { adminRoutes } from './admin';

describe('Admin Routes', () => {
  let app: any;
  let testUserId: string;
  let testProjectId: string;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(adminRoutes, { prefix: '/api/v1/admin' });
    await app.ready();
  });

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'admin@example.com',
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

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('Journal Blocklist Management', () => {
    it('should create a journal blocklist entry', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/journal-blocklist',
        payload: {
          issn: '1234-5678',
          note: 'Known predatory journal',
          addedBy: testUserId
        }
      });

      expect(response.statusCode).toBe(201);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.data.issn).toBe('1234-5678');
      expect(data.data.note).toBe('Known predatory journal');
      expect(data.data.addedBy).toBe(testUserId);
    });

    it('should reject duplicate ISSN', async () => {
      // Create first entry
      await prisma.journalBlocklist.create({
        data: {
          issn: '1234-5678',
          note: 'First entry',
          addedBy: testUserId
        }
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/journal-blocklist',
        payload: {
          issn: '1234-5678',
          note: 'Duplicate entry',
          addedBy: testUserId
        }
      });

      expect(response.statusCode).toBe(409);
      const data = response.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('CONFLICT');
    });

    it('should list journal blocklist entries', async () => {
      // Create test entries
      await prisma.journalBlocklist.createMany({
        data: [
          {
            issn: '1234-5678',
            note: 'First journal',
            addedBy: testUserId
          },
          {
            issn: '8765-4321',
            note: 'Second journal',
            addedBy: testUserId
          }
        ]
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/journal-blocklist'
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.data.blocklist).toHaveLength(2);
      expect(data.data.pagination.total).toBe(2);
    });

    it('should search journal blocklist entries', async () => {
      // Create test entries
      await prisma.journalBlocklist.createMany({
        data: [
          {
            issn: '1234-5678',
            note: 'Nature Journal',
            addedBy: testUserId
          },
          {
            issn: '8765-4321',
            note: 'Science Journal',
            addedBy: testUserId
          }
        ]
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/journal-blocklist?search=nature'
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.data.blocklist).toHaveLength(1);
      expect(data.data.blocklist[0].note).toContain('Nature');
    });

    it('should get a specific journal blocklist entry', async () => {
      const entry = await prisma.journalBlocklist.create({
        data: {
          issn: '1234-5678',
          note: 'Test journal',
          addedBy: testUserId
        }
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/admin/journal-blocklist/${entry.id}`
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.data.id).toBe(entry.id);
      expect(data.data.issn).toBe('1234-5678');
    });

    it('should update a journal blocklist entry', async () => {
      const entry = await prisma.journalBlocklist.create({
        data: {
          issn: '1234-5678',
          note: 'Original note',
          addedBy: testUserId
        }
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/journal-blocklist/${entry.id}`,
        payload: {
          note: 'Updated note'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.data.note).toBe('Updated note');
    });

    it('should delete a journal blocklist entry', async () => {
      const entry = await prisma.journalBlocklist.create({
        data: {
          issn: '1234-5678',
          note: 'Test journal',
          addedBy: testUserId
        }
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/journal-blocklist/${entry.id}`
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.data.message).toContain('deleted successfully');

      // Verify deletion
      const deletedEntry = await prisma.journalBlocklist.findUnique({
        where: { id: entry.id }
      });
      expect(deletedEntry).toBeNull();
    });
  });

  describe('Integrity Statistics', () => {
    it('should return integrity statistics for a project', async () => {
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
            title: 'Clean Article',
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
          }
        ]
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/admin/integrity-stats/${testProjectId}`
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.data.total).toBe(3);
      expect(data.data.flagged).toBe(2);
      expect(data.data.retracted).toBe(1);
      expect(data.data.predatory).toBe(1);
      expect(data.data.bySource.pubmed).toBe(3);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/integrity-stats/non-existent-id'
      });

      expect(response.statusCode).toBe(404);
      const data = response.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });
});
