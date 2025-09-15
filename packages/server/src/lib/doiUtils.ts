/**
 * Normalize DOI string
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
 * Validate DOI format
 */
export function isValidDOI(doi: string): boolean {
  if (!doi) return false;
  
  const normalized = normalizeDOI(doi);
  
  // Basic DOI pattern: 10.xxxx/xxxx
  const doiPattern = /^10\.\d{4,}\/[^\s]+$/;
  
  return doiPattern.test(normalized);
}

/**
 * Extract DOI from various formats
 */
export function extractDOI(text: string): string | null {
  if (!text) return null;
  
  // Common DOI patterns
  const patterns = [
    /(?:doi:|DOI:)\s*(10\.\d{4,}\/[^\s]+)/i,
    /(?:https?:\/\/doi\.org\/)(10\.\d{4,}\/[^\s]+)/i,
    /(10\.\d{4,}\/[^\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return normalizeDOI(match[1]);
    }
  }
  
  return null;
}

/**
 * Generate DOI URL
 */
export function getDOIUrl(doi: string): string {
  const normalized = normalizeDOI(doi);
  return `https://doi.org/${normalized}`;
}

/**
 * Generate PubMed URL
 */
export function getPubMedUrl(pmid: string): string {
  if (!pmid) return '';
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}

/**
 * Generate PMC URL
 */
export function getPMCUrl(pmcid: string): string {
  if (!pmcid) return '';
  return `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`;
}
