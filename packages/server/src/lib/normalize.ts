import { createHash } from 'crypto';
import { ProviderRecord } from '@the-scientist/schemas';

/**
 * Normalize title for deduplication
 */
export function normalizeTitle(title: string): string {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .trim();
}

/**
 * Normalize DOI
 */
export function normalizeDOI(doi: string): string {
  if (!doi) return '';
  
  // Remove common prefixes and ensure lowercase
  return doi
    .replace(/^(doi:|https?:\/\/doi\.org\/)/i, '')
    .toLowerCase()
    .trim();
}

/**
 * Normalize PMID
 */
export function normalizePMID(pmid: string): string {
  if (!pmid) return '';
  
  return pmid.trim();
}

/**
 * Generate canonical key for deduplication
 */
export function canonicalKey(record: ProviderRecord): string {
  const parts: string[] = [];
  
  // Add normalized identifiers in order of preference
  if (record.doi) {
    parts.push(`doi:${normalizeDOI(record.doi)}`);
  } else if (record.pmid) {
    parts.push(`pmid:${normalizePMID(record.pmid)}`);
  } else if (record.title) {
    parts.push(`title:${normalizeTitle(record.title)}`);
  }
  
  // Add year if available
  if (record.year) {
    parts.push(`year:${record.year}`);
  }
  
  return parts.join('|');
}

/**
 * Generate SHA256 hash of canonical key
 */
export function generateCanonicalHash(record: ProviderRecord): string {
  const key = canonicalKey(record);
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Check if two records are duplicates based on exact ID matches
 */
export function isDuplicateRecord(record1: ProviderRecord, record2: ProviderRecord): boolean {
  // Check DOI match
  if (record1.doi && record2.doi) {
    return normalizeDOI(record1.doi) === normalizeDOI(record2.doi);
  }
  
  // Check PMID match
  if (record1.pmid && record2.pmid) {
    return normalizePMID(record1.pmid) === normalizePMID(record2.pmid);
  }
  
  return false;
}

/**
 * Calculate record richness score for deduplication
 */
export function calculateRecordRichness(record: ProviderRecord): number {
  let score = 0;
  
  // Base score for having a title
  if (record.title) score += 10;
  
  // DOI is highly valuable
  if (record.doi) score += 20;
  
  // PMID is valuable
  if (record.pmid) score += 15;
  
  // PMC ID is valuable
  if (record.pmcid) score += 10;
  
  // Abstract adds value
  if (record.abstract) score += 15;
  
  // Authors add value
  if (record.authors && record.authors.length > 0) score += 10;
  
  // Journal adds value
  if (record.journal) score += 5;
  
  // Year adds value
  if (record.year) score += 5;
  
  // MeSH terms add value
  if (record.meshTerms && record.meshTerms.length > 0) score += 5;
  
  return score;
}
