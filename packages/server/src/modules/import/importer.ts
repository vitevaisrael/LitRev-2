import { PrismaClient } from '@prisma/client';
import { NormalizedRef } from './parser';
import { deduplicateReferences } from './deduplicator';
import { calculateScore } from '../../utils/scoreCalculator';

const prisma = new PrismaClient();

export interface ImportResult {
  added: number;
  duplicates: number;
  items: any[];
}

// Import references into a project
export async function importReferences(
  projectId: string,
  refs: NormalizedRef[]
): Promise<ImportResult> {
  // Validate that project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });
  
  if (!project) {
    throw new Error('Project not found');
  }
  
  // Deduplicate against existing candidates
  const { toAdd, duplicates } = await deduplicateReferences(projectId, refs);
  
  if (toAdd.length === 0) {
    return {
      added: 0,
      duplicates,
      items: []
    };
  }
  
  // Get problem profile for scoring
  const problemProfile = await prisma.problemProfile.findUnique({
    where: { projectId }
  });

  // Create new candidates with scoring
  const candidates = await Promise.all(
    toAdd.map(async ref => {
      const score = calculateScore(
        ref.title,
        ref.journal,
        ref.year,
        ref.abstract,
        problemProfile ? {
          population: problemProfile.population,
          exposure: problemProfile.exposure,
          comparator: problemProfile.comparator,
          outcomes: problemProfile.outcomes
        } : undefined
      );

      return prisma.candidate.create({
        data: {
          projectId,
          title: ref.title,
          journal: ref.journal,
          year: ref.year,
          doi: ref.doi || null,
          pmid: ref.pmid || null,
          authors: ref.authors,
          abstract: ref.abstract || null,
          score: score as any
        }
      });
    })
  );
  
  // Update PrismaData counters
  await prisma.prismaData.upsert({
    where: { projectId },
    update: {
      identified: {
        increment: candidates.length
      }
    },
    create: {
      projectId,
      identified: candidates.length,
      duplicates: 0,
      screened: 0,
      included: 0,
      excluded: 0
    }
  });
  
  // Create audit log entries
  await prisma.auditLog.create({
    data: {
      projectId,
      userId: project.ownerId, // Using ownerId as userId for now
      action: 'import_completed',
      details: {
        added: candidates.length,
        duplicates,
        fileType: 'ris_or_bibtex'
      }
    }
  });
  
  return {
    added: candidates.length,
    duplicates,
    items: candidates.map(c => ({
      id: c.id,
      title: c.title,
      journal: c.journal,
      year: c.year,
      doi: c.doi,
      pmid: c.pmid,
      authors: c.authors,
      abstract: c.abstract,
      createdAt: c.createdAt.toISOString()
    }))
  };
}