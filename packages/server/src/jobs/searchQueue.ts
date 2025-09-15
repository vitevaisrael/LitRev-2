import { Queue, Worker, Job } from 'bullmq';
import { getRedis } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { pubmedSearch } from '../providers/pubmed';
import { dedupe } from '../lib/dedupe';
import { generateIntegrityFlags } from '../services/integrity';
import { QueryManifest, ProviderRecord, SearchRunStatus } from '@the-scientist/schemas';
import { env } from '../config/env';

export const SEARCH_QUEUE_NAME = 'search-queue';

// Create queue
export const searchQueue = new Queue(SEARCH_QUEUE_NAME, {
  connection: getRedis(),
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Job data interface
export interface SearchJobData {
  searchRunId: string;
  manifest: QueryManifest;
}

// Worker to process search jobs
export const searchWorker = new Worker(
  SEARCH_QUEUE_NAME,
  async (job: Job<SearchJobData>) => {
    const { searchRunId, manifest } = job.data;
    
    try {
      // Update job status to running
      await updateSearchRunStatus(searchRunId, 'running');
      
      // Update job progress
      await job.updateProgress(10);
      
      // Execute search providers
      const allRecords: ProviderRecord[] = [];
      const providerStats: Record<string, { count: number; errors: string[] }> = {};
      
      for (const provider of manifest.providers) {
        try {
          let records: ProviderRecord[] = [];
          
          switch (provider.name) {
            case 'pubmed':
              records = await pubmedSearch({
                query: provider.query,
                maxResults: env.MAX_RESULTS_PER_RUN || 1000,
                apiKey: env.PUBMED_API_KEY
              });
              break;
            default:
              throw new Error(`Unknown provider: ${provider.name}`);
          }
          
          providerStats[provider.name] = {
            count: records.length,
            errors: []
          };
          
          allRecords.push(...records);
        } catch (error) {
          console.error(`Provider ${provider.name} failed:`, error);
          providerStats[provider.name] = {
            count: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error']
          };
        }
      }
      
      // Update progress
      await job.updateProgress(50);
      
      // Deduplicate records
      const dedupeResult = dedupe(allRecords);
      
      // Update progress
      await job.updateProgress(70);
      
      // Generate integrity flags for each record
      const recordsWithFlags = await Promise.all(
        dedupeResult.unique.map(async (record) => {
          const flags = await generateIntegrityFlags(record);
          return { ...record, flags };
        })
      );
      
      // Update progress
      await job.updateProgress(80);
      
      // Store results in database
      await storeSearchResults(searchRunId, recordsWithFlags);
      
      // Update progress
      await job.updateProgress(90);
      
      // Compute PRISMA deltas
      await computePrismaDeltas(searchRunId, dedupeResult.stats);
      
      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          projectId: manifest.projectId,
          userId: manifest.userId,
          action: 'search_run_completed',
          details: {
            searchRunId,
            providerStats,
            dedupeStats: dedupeResult.stats,
            totalRecords: allRecords.length,
            uniqueRecords: dedupeResult.unique.length
          }
        }
      });
      
      // Update final status
      await updateSearchRunStatus(searchRunId, 'completed', {
        providerStats,
        dedupeStats: dedupeResult.stats,
        totalRecords: allRecords.length,
        uniqueRecords: dedupeResult.unique.length
      });
      
      await job.updateProgress(100);
      
    } catch (error) {
      console.error('Search job failed:', error);
      
      // Update status to failed
      await updateSearchRunStatus(searchRunId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  },
  {
    connection: getRedis(),
    concurrency: env.SEARCH_QUEUE_CONCURRENCY || 2,
  }
);

/**
 * Update search run status
 */
async function updateSearchRunStatus(
  searchRunId: string, 
  status: SearchRunStatus, 
  metadata?: any
): Promise<void> {
  await prisma.searchRun.update({
    where: { id: searchRunId },
    data: {
      status,
      metadata: metadata || {},
      updatedAt: new Date()
    }
  });
}

/**
 * Store search results in database
 */
async function storeSearchResults(searchRunId: string, records: any[]): Promise<void> {
  if (records.length === 0) return;

  // Batch insert records
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const insertData = batch.map(record => ({
      searchRunId,
      canonicalHash: generateCanonicalHash(record),
      title: record.title,
      year: record.year,
      doi: record.doi,
      pmid: record.pmid,
      pmcid: record.pmcid,
      source: record.source,
      authors: record.authors || [],
      journal: record.journal,
      volume: record.volume,
      issue: record.issue,
      pages: record.pages,
      abstract: record.abstract,
      meshTerms: record.meshTerms || [],
      flags: record.flags || {},
      rawPayload: record.rawPayload || {}
    }));

    await prisma.searchResult.createMany({
      data: insertData,
      skipDuplicates: true
    });
  }
}

/**
 * Compute PRISMA deltas
 */
async function computePrismaDeltas(searchRunId: string, stats: any): Promise<void> {
  // Get the project ID from the search run
  const searchRun = await prisma.searchRun.findUnique({
    where: { id: searchRunId },
    include: { savedSearch: true }
  });

  if (!searchRun) return;

  const projectId = searchRun.savedSearch.projectId;

  // Update or create PRISMA data
  await prisma.prismaData.upsert({
    where: { projectId },
    update: {
      identified: { increment: stats.unique }
    },
    create: {
      projectId,
      identified: stats.unique,
      deduped: 0,
      screened: 0,
      included: 0,
      excluded: 0
    }
  });
}

/**
 * Generate canonical hash for a record
 */
function generateCanonicalHash(record: ProviderRecord): string {
  const crypto = require('crypto');
  const key = `${record.doi || ''}|${record.pmid || ''}|${record.title || ''}|${record.year || ''}`;
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Start the search worker
 */
export function startSearchWorker(): void {
  console.log('Starting search worker...');
  
  searchWorker.on('completed', (job) => {
    console.log(`Search job ${job.id} completed`);
  });
  
  searchWorker.on('failed', (job, err) => {
    console.error(`Search job ${job?.id} failed:`, err);
  });
  
  searchWorker.on('error', (err) => {
    console.error('Search worker error:', err);
  });
}

/**
 * Stop the search worker
 */
export async function stopSearchWorker(): Promise<void> {
  await searchWorker.close();
  await searchQueue.close();
}
