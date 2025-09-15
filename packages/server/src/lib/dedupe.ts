import { ProviderRecord } from '@the-scientist/schemas';
import { generateCanonicalHash, isDuplicateRecord, calculateRecordRichness } from './normalize';

export interface DedupeResult {
  unique: ProviderRecord[];
  duplicates: Array<{
    canonical: ProviderRecord;
    duplicates: ProviderRecord[];
  }>;
  stats: {
    total: number;
    unique: number;
    duplicates: number;
    duplicateGroups: number;
  };
}

/**
 * Deduplicate records using multiple strategies
 */
export function dedupe(records: ProviderRecord[]): DedupeResult {
  if (records.length === 0) {
    return {
      unique: [],
      duplicates: [],
      stats: {
        total: 0,
        unique: 0,
        duplicates: 0,
        duplicateGroups: 0
      }
    };
  }

  // Step 1: Group by exact ID matches (DOI, PMID)
  const idGroups = new Map<string, ProviderRecord[]>();
  const processedRecords = new Set<number>();
  
  for (let i = 0; i < records.length; i++) {
    if (processedRecords.has(i)) continue;
    
    const record = records[i];
    const groupKey = getIDGroupKey(record);
    
    if (!idGroups.has(groupKey)) {
      idGroups.set(groupKey, []);
    }
    
    // Find all records that match this one by ID
    const group = [record];
    processedRecords.add(i);
    
    for (let j = i + 1; j < records.length; j++) {
      if (processedRecords.has(j)) continue;
      
      if (isDuplicateRecord(record, records[j])) {
        group.push(records[j]);
        processedRecords.add(j);
      }
    }
    
    idGroups.set(groupKey, group);
  }

  // Step 2: For each group, pick the richest record
  const unique: ProviderRecord[] = [];
  const duplicates: Array<{ canonical: ProviderRecord; duplicates: ProviderRecord[] }> = [];
  
  for (const group of idGroups.values()) {
    if (group.length === 1) {
      // No duplicates, add directly
      unique.push(group[0]);
    } else {
      // Find the richest record
      const richest = group.reduce((best, current) => {
        const bestScore = calculateRecordRichness(best);
        const currentScore = calculateRecordRichness(current);
        return currentScore > bestScore ? current : best;
      });
      
      // Add richest as unique
      unique.push(richest);
      
      // Add others as duplicates
      const duplicatesInGroup = group.filter(record => record !== richest);
      duplicates.push({
        canonical: richest,
        duplicates: duplicatesInGroup
      });
    }
  }

  // Step 3: Group by canonical hash for remaining potential duplicates
  const hashGroups = new Map<string, ProviderRecord[]>();
  
  for (const record of unique) {
    const hash = generateCanonicalHash(record);
    if (!hashGroups.has(hash)) {
      hashGroups.set(hash, []);
    }
    hashGroups.get(hash)!.push(record);
  }

  // Step 4: Process hash groups
  const finalUnique: ProviderRecord[] = [];
  const finalDuplicates: Array<{ canonical: ProviderRecord; duplicates: ProviderRecord[] }> = [];
  
  for (const group of hashGroups.values()) {
    if (group.length === 1) {
      finalUnique.push(group[0]);
    } else {
      // Find the richest record
      const richest = group.reduce((best, current) => {
        const bestScore = calculateRecordRichness(best);
        const currentScore = calculateRecordRichness(current);
        return currentScore > bestScore ? current : best;
      });
      
      finalUnique.push(richest);
      
      const duplicatesInGroup = group.filter(record => record !== richest);
      finalDuplicates.push({
        canonical: richest,
        duplicates: duplicatesInGroup
      });
    }
  }

  // Calculate stats
  const totalDuplicates = finalDuplicates.reduce((sum, group) => sum + group.duplicates.length, 0);
  
  return {
    unique: finalUnique,
    duplicates: finalDuplicates,
    stats: {
      total: records.length,
      unique: finalUnique.length,
      duplicates: totalDuplicates,
      duplicateGroups: finalDuplicates.length
    }
  };
}

/**
 * Get a group key for ID-based grouping
 */
function getIDGroupKey(record: ProviderRecord): string {
  if (record.doi) {
    return `doi:${record.doi.toLowerCase().trim()}`;
  }
  if (record.pmid) {
    return `pmid:${record.pmid.trim()}`;
  }
  // Fallback to a unique key for records without IDs
  return `no-id:${Math.random().toString(36)}`;
}

/**
 * Validate deduplication result
 */
export function validateDedupeResult(result: DedupeResult): boolean {
  // Check that total = unique + duplicates
  if (result.stats.total !== result.stats.unique + result.stats.duplicates) {
    return false;
  }
  
  // Check that all unique records are actually unique
  const uniqueHashes = new Set<string>();
  for (const record of result.unique) {
    const hash = generateCanonicalHash(record);
    if (uniqueHashes.has(hash)) {
      return false;
    }
    uniqueHashes.add(hash);
  }
  
  return true;
}

/**
 * Get deduplication statistics
 */
export function getDedupeStats(result: DedupeResult): {
  totalRecords: number;
  uniqueRecords: number;
  duplicateRecords: number;
  duplicateGroups: number;
  deduplicationRate: number;
} {
  const deduplicationRate = result.stats.total > 0 
    ? (result.stats.duplicates / result.stats.total) * 100 
    : 0;
  
  return {
    totalRecords: result.stats.total,
    uniqueRecords: result.stats.unique,
    duplicateRecords: result.stats.duplicates,
    duplicateGroups: result.stats.duplicateGroups,
    deduplicationRate: Math.round(deduplicationRate * 100) / 100
  };
}
