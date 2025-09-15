import { prisma } from '../lib/prisma';
import { ProviderRecord } from '@the-scientist/schemas';

export interface IntegrityFlags {
  retracted?: boolean;
  predatory?: boolean;
  notes?: string;
  detectedAt?: string;
  sources?: string[];
}

export interface IntegrityDetectionResult {
  flags: IntegrityFlags;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detect integrity flags for a record based on various sources
 */
export async function detectIntegrityFlags(record: ProviderRecord): Promise<IntegrityDetectionResult> {
  const flags: IntegrityFlags = {};
  const sources: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // Check for retractions
  const retractionResult = await detectRetraction(record);
  if (retractionResult.retracted) {
    flags.retracted = true;
    flags.notes = retractionResult.notes;
    sources.push(retractionResult.source);
    confidence = 'high';
  }

  // Check for predatory journals
  const predatoryResult = await detectPredatoryJournal(record);
  if (predatoryResult.predatory) {
    flags.predatory = true;
    if (flags.notes) {
      flags.notes += `; ${predatoryResult.notes}`;
    } else {
      flags.notes = predatoryResult.notes;
    }
    sources.push(predatoryResult.source);
    confidence = 'high';
  }

  // Only add metadata if there are actual flags
  if (Object.keys(flags).length > 0) {
    flags.detectedAt = new Date().toISOString();
    flags.sources = sources;
  }

  return {
    flags,
    confidence
  };
}

/**
 * Detect if a record is retracted
 */
export async function detectRetraction(record: ProviderRecord): Promise<{
  retracted: boolean;
  notes?: string;
  source: string;
}> {
  // Check PubMed for retraction indicators
  if (record.source === 'pubmed' && record.rawPayload) {
    const rawData = record.rawPayload as any;
    
    // Check PublicationType for retraction
    if (rawData.PublicationTypeList?.PublicationType) {
      const pubTypes = Array.isArray(rawData.PublicationTypeList.PublicType)
        ? rawData.PublicationTypeList.PublicationType
        : [rawData.PublicationTypeList.PublicationType];
      
      const retractionTypes = [
        'Retracted Publication',
        'Retraction of Publication',
        'Retraction'
      ];
      
      const hasRetractionType = pubTypes.some((type: any) => 
        retractionTypes.includes(type)
      );
      
      if (hasRetractionType) {
        return {
          retracted: true,
          notes: `Publication type indicates retraction: ${pubTypes.join(', ')}`,
          source: 'pubmed_publication_type'
        };
      }
    }

    // Check for retraction notices in comments
    if (rawData.CommentsCorrectionsList?.CommentsCorrections) {
      const comments = Array.isArray(rawData.CommentsCorrectionsList.CommentsCorrections)
        ? rawData.CommentsCorrectionsList.CommentsCorrections
        : [rawData.CommentsCorrectionsList.CommentsCorrections];
      
      const retractionComments = comments.filter((comment: any) => 
        comment.RefType === 'Retraction' || 
        comment.RefType === 'Retraction of Publication'
      );
      
      if (retractionComments.length > 0) {
        return {
          retracted: true,
          notes: `Retraction notice found in comments: ${retractionComments.map((c: any) => c.RefSource).join(', ')}`,
          source: 'pubmed_comments'
        };
      }
    }
  }

  // Check Crossref for retraction indicators
  if (record.source === 'crossref' && record.rawPayload) {
    const rawData = record.rawPayload as any;
    
    // Check for retraction relation
    if (rawData.relation) {
      const relations = Array.isArray(rawData.relation) ? rawData.relation : [rawData.relation];
      
      const retractionRelations = relations.filter((rel: any) => 
        rel['is-retracted-by'] || 
        rel.retraction ||
        (rel.type === 'IsRetractedBy')
      );
      
      if (retractionRelations.length > 0) {
        return {
          retracted: true,
          notes: `Retraction relation found in Crossref data`,
          source: 'crossref_relation'
        };
      }
    }

    // Check subtype for retraction
    if (rawData.subtype && rawData.subtype.includes('retraction')) {
      return {
        retracted: true,
        notes: `Crossref subtype indicates retraction: ${rawData.subtype}`,
        source: 'crossref_subtype'
      };
    }
  }

  return {
    retracted: false,
    source: 'none'
  };
}

/**
 * Detect if a journal is predatory based on blocklist
 */
export async function detectPredatoryJournal(record: ProviderRecord): Promise<{
  predatory: boolean;
  notes?: string;
  source: string;
}> {
  if (!record.journal) {
    return {
      predatory: false,
      source: 'none'
    };
  }

  // Check against journal blocklist
  const blocklistEntry = await prisma.journalBlocklist.findFirst({
    where: {
      OR: [
        { issn: record.journal },
        { note: { contains: record.journal, mode: 'insensitive' } }
      ]
    }
  });

  if (blocklistEntry) {
    return {
      predatory: true,
      notes: `Journal flagged as predatory: ${blocklistEntry.note || 'No additional details'}`,
      source: 'journal_blocklist'
    };
  }

  // Additional checks could be added here:
  // - Check against DOAJ (Directory of Open Access Journals)
  // - Check against Beall's list (if available)
  // - Check journal impact factor thresholds
  // - Check for suspicious patterns in journal names

  return {
    predatory: false,
    source: 'none'
  };
}

/**
 * Apply integrity flags to search results during ingest
 */
export async function applyIntegrityOnIngest(records: ProviderRecord[]): Promise<void> {
  for (const record of records) {
    try {
      const integrityResult = await detectIntegrityFlags(record);
      
      if (Object.keys(integrityResult.flags).length > 0) {
        // Update the record with integrity flags
        // This would typically be called during the search result insertion process
        console.log(`Integrity flags detected for record ${record.title}:`, integrityResult.flags);
      }
    } catch (error) {
      console.error(`Error detecting integrity flags for record ${record.title}:`, error);
    }
  }
}

/**
 * Get integrity statistics for a project
 */
export async function getIntegrityStats(projectId: string): Promise<{
  total: number;
  flagged: number;
  retracted: number;
  predatory: number;
  breakdown: Record<string, number>;
}> {
  const results = await prisma.searchResult.findMany({
    where: {
      searchRun: {
        savedSearch: {
          projectId
        }
      }
    },
    select: {
      flags: true
    }
  });

  const stats = {
    total: results.length,
    flagged: 0,
    retracted: 0,
    predatory: 0,
    breakdown: {} as Record<string, number>
  };

  for (const result of results) {
    const flags = result.flags as IntegrityFlags;
    
    if (flags && Object.keys(flags).length > 0) {
      stats.flagged++;
      
      if (flags.retracted) {
        stats.retracted++;
      }
      
      if (flags.predatory) {
        stats.predatory++;
      }
      
      // Count by source
      if (flags.sources) {
        for (const source of flags.sources) {
          stats.breakdown[source] = (stats.breakdown[source] || 0) + 1;
        }
      }
    }
  }

  return stats;
}