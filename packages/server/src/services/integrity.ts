import { prisma } from '../lib/prisma';
import { ProviderRecord } from '@the-scientist/schemas';

export interface IntegrityFlags {
  retracted?: boolean;
  predatory?: boolean;
  detectedAt?: string;
  sources?: string[];
}

export interface RetractionData {
  pmid?: string;
  doi?: string;
  retracted: boolean;
  retractionDate?: string;
  retractionReason?: string;
  source: string;
}

export interface PredatoryJournalData {
  issn?: string;
  journal?: string;
  predatory: boolean;
  source: string;
}

/**
 * Check for retractions using PubMed and Crossref
 */
export async function checkRetractions(record: ProviderRecord): Promise<RetractionData[]> {
  const results: RetractionData[] = [];

  try {
    // Check PubMed for retractions
    if (record.pmid) {
      const pubmedResult = await checkPubMedRetractions(record.pmid);
      if (pubmedResult) {
        results.push(pubmedResult);
      }
    }

    // Check Crossref for retractions
    if (record.doi) {
      const crossrefResult = await checkCrossrefRetractions(record.doi);
      if (crossrefResult) {
        results.push(crossrefResult);
      }
    }
  } catch (error) {
    console.error('Error checking retractions:', error);
  }

  return results;
}

/**
 * Check for predatory journals using blocklist
 */
export async function checkPredatoryJournals(record: ProviderRecord): Promise<PredatoryJournalData[]> {
  const results: PredatoryJournalData[] = [];

  try {
    if (record.journal) {
      // Check against blocklist
      const blocklistEntry = await prisma.journalBlocklist.findFirst({
        where: {
          OR: [
            { journal: { contains: record.journal, mode: 'insensitive' } },
            { issn: record.journal }
          ]
        }
      });

      if (blocklistEntry) {
        results.push({
          issn: blocklistEntry.issn,
          journal: record.journal,
          predatory: true,
          source: 'blocklist'
        });
      }
    }
  } catch (error) {
    console.error('Error checking predatory journals:', error);
  }

  return results;
}

/**
 * Generate integrity flags for a record
 */
export async function generateIntegrityFlags(record: ProviderRecord): Promise<IntegrityFlags> {
  const flags: IntegrityFlags = {
    detectedAt: new Date().toISOString()
  };

  try {
    // Check for retractions
    const retractionResults = await checkRetractions(record);
    if (retractionResults.length > 0) {
      flags.retracted = retractionResults.some(r => r.retracted);
      flags.sources = [...(flags.sources || []), ...retractionResults.map(r => r.source)];
    }

    // Check for predatory journals
    const predatoryResults = await checkPredatoryJournals(record);
    if (predatoryResults.length > 0) {
      flags.predatory = predatoryResults.some(p => p.predatory);
      flags.sources = [...(flags.sources || []), ...predatoryResults.map(p => p.source)];
    }

    // Remove duplicates from sources
    if (flags.sources) {
      flags.sources = [...new Set(flags.sources)];
    }
  } catch (error) {
    console.error('Error generating integrity flags:', error);
  }

  return flags;
}

/**
 * Check PubMed for retractions
 */
async function checkPubMedRetractions(pmid: string): Promise<RetractionData | null> {
  try {
    // This is a simplified implementation
    // In a real implementation, you would query PubMed's E-utilities API
    // and check for retraction notices or retracted publication status
    
    // For now, we'll simulate a check
    // In practice, you would:
    // 1. Query PubMed with the PMID
    // 2. Check the publication type for retraction notices
    // 3. Check for retraction-related MeSH terms
    // 4. Check the publication status
    
    return null; // No retraction found
  } catch (error) {
    console.error('Error checking PubMed retractions:', error);
    return null;
  }
}

/**
 * Check Crossref for retractions
 */
async function checkCrossrefRetractions(doi: string): Promise<RetractionData | null> {
  try {
    // This is a simplified implementation
    // In a real implementation, you would query Crossref's API
    // and check for retraction information
    
    // For now, we'll simulate a check
    // In practice, you would:
    // 1. Query Crossref with the DOI
    // 2. Check for retraction-related metadata
    // 3. Check the publication status
    
    return null; // No retraction found
  } catch (error) {
    console.error('Error checking Crossref retractions:', error);
    return null;
  }
}

/**
 * Get integrity statistics for a project
 */
export async function getIntegrityStats(projectId: string): Promise<{
  totalRecords: number;
  flaggedRecords: number;
  retractedRecords: number;
  predatoryRecords: number;
  flagBreakdown: Record<string, number>;
}> {
  try {
    const candidates = await prisma.candidate.findMany({
      where: { projectId },
      select: { flags: true }
    });

    const totalRecords = candidates.length;
    let flaggedRecords = 0;
    let retractedRecords = 0;
    let predatoryRecords = 0;
    const flagBreakdown: Record<string, number> = {};

    for (const candidate of candidates) {
      const flags = candidate.flags as any;
      if (flags && Object.keys(flags).length > 0) {
        flaggedRecords++;
        
        if (flags.retracted) {
          retractedRecords++;
        }
        
        if (flags.predatory) {
          predatoryRecords++;
        }

        // Count individual flags
        for (const [key, value] of Object.entries(flags)) {
          if (value === true) {
            flagBreakdown[key] = (flagBreakdown[key] || 0) + 1;
          }
        }
      }
    }

    return {
      totalRecords,
      flaggedRecords,
      retractedRecords,
      predatoryRecords,
      flagBreakdown
    };
  } catch (error) {
    console.error('Error getting integrity stats:', error);
    return {
      totalRecords: 0,
      flaggedRecords: 0,
      retractedRecords: 0,
      predatoryRecords: 0,
      flagBreakdown: {}
    };
  }
}

/**
 * Batch process integrity checks for multiple records
 */
export async function batchIntegrityCheck(records: ProviderRecord[]): Promise<Map<string, IntegrityFlags>> {
  const results = new Map<string, IntegrityFlags>();

  // Process records in batches to avoid overwhelming external APIs
  const batchSize = 10;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (record) => {
      const flags = await generateIntegrityFlags(record);
      const key = record.doi || record.pmid || record.title;
      if (key) {
        results.set(key, flags);
      }
    });

    await Promise.all(batchPromises);
    
    // Add a small delay between batches to be respectful to external APIs
    if (i + batchSize < records.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}
