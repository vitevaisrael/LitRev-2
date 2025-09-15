import { IMPORT_CONFIG } from "../../config/importConfig";

export type NormalizedRef = {
  title: string;
  authors: string[];
  journal: string;
  year: number;
  doi?: string;
  pmid?: string;
  source?: string;
  partial?: boolean;
  confidence?: number;
  rawText?: string;
};

// Shared regex patterns for citation parsing
export const DOI_REGEX = /10\.\d{4,}(?:\.\d+)*\/[-._;()/:A-Z0-9]+/gi;
export const PMID_REGEX = /\b(?:PMID|pmid)[:\s]*([1-9]\d{5,8})\b/g;

// Citation style patterns
export const CITATION_STYLES = {
  numbered: /^\s*(?:\[(\d+)\]|(\d+)\.)\s+(.+?)(?:\n{2,}|$)/gm,
  authorYear: /^([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)*)(?:,\s*[\w\.\-]+)*\s*\((\d{4})\)\.?\s+(.+?)(?:\n{2,}|$)/gm,
  vancouverLoose: /^\s*\d+\.\s+(.+?)(?:\n{2,}|$)/gm
};

/**
 * Find the references section in text by looking for reference headers
 * or using DOI density analysis as fallback
 */
export function findReferencesSection(text: string): string | null {
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex(line => {
    const L = line.trim().toLowerCase().replace(/\s+/g, " ");
    return IMPORT_CONFIG.REFERENCE_HEADERS.some(h => {
      const H = h.toLowerCase();
      return L === H || L.startsWith(H + ":");
    });
  });
  if (idx >= 0) return lines.slice(idx + 1).join("\n");

  // fallback: last 30% DOI density
  const start = Math.floor(lines.length * 0.7);
  const tail = lines.slice(start).join("\n");
  const doiCount = (tail.match(DOI_REGEX) || []).length;
  return doiCount >= 3 ? tail : null;
}

/**
 * Parse references from text using multiple citation patterns
 */
export function parseReferences(text: string): NormalizedRef[] {
  const refs: NormalizedRef[] = [];
  const seenKeys = new Set<string>();

  const pushUnique = (r: NormalizedRef) => {
    const key = r.doi ? `doi:${r.doi.toLowerCase()}` :
                r.pmid ? `pmid:${r.pmid}` :
                r.title && r.year ? `t:${r.title.toLowerCase()}|y:${r.year}` : `raw:${r.rawText?.slice(0,80)}`;
    if (!seenKeys.has(key)) { seenKeys.add(key); refs.push(r); }
  };

  // strong signals first - extract DOIs and PMIDs
  for (const m of text.matchAll(DOI_REGEX)) pushUnique({ 
    title: "DOI Reference", 
    authors: [], 
    journal: "Unknown", 
    year: new Date().getFullYear(),
    doi: m[0], 
    source: "extracted", 
    partial: false, 
    confidence: 1.0 
  });
  
  for (const m of text.matchAll(PMID_REGEX)) pushUnique({ 
    title: "PMID Reference", 
    authors: [], 
    journal: "Unknown", 
    year: new Date().getFullYear(),
    pmid: m[1], 
    source: "extracted", 
    partial: false, 
    confidence: 0.9 
  });

  // loosened structured matches
  const candidates: string[] = [];
  for (const regex of Object.values(CITATION_STYLES)) {
    for (const m of text.matchAll(regex)) {
      const raw = m[0].trim();
      // skip if already contains an extracted DOI/PMID
      if (DOI_REGEX.test(raw) || PMID_REGEX.test(raw)) continue;
      candidates.push(raw);
    }
  }

  for (const raw of candidates) {
    const year = raw.match(/\b(19|20)\d{2}\b/)?.[0];
    const journal = raw.match(/\b([A-Z][A-Za-z&\s\-]*?(?:J|Journal|Rev|Res|Med)[A-Za-z&\s\-]*)\b/)?.[1];
    const titleBetweenPeriods = raw.match(/\.\s+([^\.]{10,160})\.\s+/)?.[1];
    const ref: NormalizedRef = {
      title: titleBetweenPeriods?.trim() || "Unknown Title",
      authors: [],
      journal: journal?.trim() || "Unknown Journal",
      year: year ? Number(year) : new Date().getFullYear(),
      source: "extracted",
      partial: true,
      confidence: 0.4,
      rawText: raw
    };
    if (ref.title !== "Unknown Title" || ref.journal !== "Unknown Journal" || ref.year) pushUnique(ref);
  }

  return refs;
}

/**
 * Assess confidence level based on the quality of extracted references
 */
export function assessConfidence(refs: NormalizedRef[]): "high" | "medium" | "low" {
  const idCount = refs.filter(r => r.doi || r.pmid).length;
  if (refs.length === 0) return "low";
  const ratio = idCount / refs.length;
  return ratio >= 0.7 ? "high" : ratio >= 0.3 ? "medium" : "low";
}

