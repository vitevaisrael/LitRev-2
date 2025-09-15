import { beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';

// Clean up database before each test
beforeEach(async () => {
  // Delete all data in reverse order of dependencies
  await prisma.auditLog.deleteMany();
  await prisma.journalBlocklist.deleteMany();
  await prisma.searchResult.deleteMany();
  await prisma.searchRun.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.support.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.draft.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.explorerRun.deleteMany();
  await prisma.jobStatus.deleteMany();
  await prisma.prismaData.deleteMany();
  await prisma.problemProfile.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

// Close database connection after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
