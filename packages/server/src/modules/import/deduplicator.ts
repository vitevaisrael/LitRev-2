import { PrismaClient } from '@prisma/client';
import { NormalizedRef } from './parser';

const prisma = new PrismaClient();

export interface DeduplicationResult {
  toAdd: NormalizedRef[];
  duplicates: number;
}

// Simple Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[b.length][a.length];
}

// Normalize title for comparison
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

// Check if titles are similar (fuzzy match)
function isTitleSimilar(title1: string, title2: string): boolean {
  const normalized1 = normalizeTitle(title1);
  const normalized2 = normalizeTitle(title2);
  
  if (normalized1 === normalized2) return true;
  
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const similarity = 1 - (distance / maxLength);
  
  // Consider similar if similarity > 0.9 (90% similar)
  return similarity > 0.9;
}

// Deduplicate references against existing candidates
export async function deduplicateReferences(
  projectId: string, 
  refs: NormalizedRef[]
): Promise<DeduplicationResult> {
  // Get existing candidates for this project
  const existingCandidates = await prisma.candidate.findMany({
    where: { projectId },
    select: {
      id: true,
      title: true,
      year: true,
      doi: true,
      pmid: true
    }
  });
  
  const toAdd: NormalizedRef[] = [];
  let duplicates = 0;
  
  for (const ref of refs) {
    let isDuplicate = false;
    
    // Check for exact DOI match
    if (ref.doi) {
      const doiMatch = existingCandidates.find(c => c.doi === ref.doi);
      if (doiMatch) {
        isDuplicate = true;
      }
    }
    
    // Check for exact PMID match
    if (!isDuplicate && ref.pmid) {
      const pmidMatch = existingCandidates.find(c => c.pmid === ref.pmid);
      if (pmidMatch) {
        isDuplicate = true;
      }
    }
    
    // Check for fuzzy title match + same year
    if (!isDuplicate) {
      const titleMatch = existingCandidates.find(c => 
        c.year === ref.year && isTitleSimilar(c.title, ref.title)
      );
      if (titleMatch) {
        isDuplicate = true;
      }
    }
    
    if (isDuplicate) {
      duplicates++;
    } else {
      toAdd.push(ref);
    }
  }
  
  return { toAdd, duplicates };
}