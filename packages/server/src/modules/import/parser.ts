// @ts-ignore - no types available for bibtex-parse-js
import { parse as parseBibtex } from 'bibtex-parse-js';
import { z } from 'zod';
import { PdfBibExtractor } from './extractors/pdfBibExtractor';
import { DocxBibExtractor } from './extractors/docxBibExtractor';
import { validateFileContent } from '../../services/fileValidation';
import { IMPORT_CONFIG } from '../../config/importConfig';

export interface NormalizedRef {
  title: string;
  journal: string;
  year: number;
  doi?: string;
  pmid?: string;
  authors: string[];
  abstract?: string;
  source?: string;
  partial?: boolean;
  confidence?: number;
  rawText?: string;
}

// Local schema for validation
const NormalizedRefSchema = z.object({
  title: z.string().min(1),
  journal: z.string().min(1),
  year: z.number().int().min(1800).max(new Date().getFullYear() + 1),
  doi: z.string().optional(),
  pmid: z.string().optional(),
  authors: z.array(z.string()).min(1),
  abstract: z.string().optional(),
  source: z.string().optional(),
  partial: z.boolean().optional(),
  confidence: z.number().optional(),
  rawText: z.string().optional()
}).strict();

// Simple RIS parser
export function parseRis(content: string): NormalizedRef[] {
  const lines = content.split('\n');
  const records: any[] = [];
  let currentRecord: any = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    
    if (trimmed.startsWith('TY  -')) {
      if (Object.keys(currentRecord).length > 0) {
        records.push(currentRecord);
      }
      currentRecord = { type: trimmed.substring(5).trim() };
    } else if (trimmed.startsWith('ER  -')) {
      records.push(currentRecord);
      currentRecord = {};
    } else if (trimmed.includes('  - ')) {
      const [tag, value] = trimmed.split('  - ', 2);
      if (!currentRecord[tag]) {
        currentRecord[tag] = [];
      }
      currentRecord[tag].push(value);
    }
  }
  
  return records.map(record => normalizeRisRecord(record)).filter((ref): ref is NormalizedRef => ref !== null);
}

// Normalize RIS record to our format
function normalizeRisRecord(record: any): NormalizedRef | null {
  try {
    const title = record.TI?.[0] || record.T1?.[0] || '';
    const journal = record.T2?.[0] || record.JO?.[0] || record.JA?.[0] || '';
    const year = parseInt(record.PY?.[0] || record.Y1?.[0] || '0');
    const doi = record.DO?.[0] || record.DA?.[0] || undefined;
    const pmid = record.PMID?.[0] || undefined;
    const authors = record.AU || record.A1 || [];
    const abstract = record.AB?.[0] || record.N2?.[0] || undefined;
    
    if (!title || !journal || !year || authors.length === 0) {
      return null;
    }
    
    return {
      title: title.trim(),
      journal: journal.trim(),
      year: year,
      doi: doi?.trim(),
      pmid: pmid?.trim(),
      authors: authors.map((a: string) => a.trim()),
      abstract: abstract?.trim()
    };
  } catch (error) {
    return null;
  }
}

// Parse BibTeX content
export function parseBibtexContent(content: string): NormalizedRef[] {
  try {
    const parsed = parseBibtex(content);
    return parsed.map((entry: any) => normalizeBibtexEntry(entry)).filter((ref: any): ref is NormalizedRef => ref !== null);
  } catch (error) {
    throw new Error(`Failed to parse BibTeX: ${error}`);
  }
}

// Normalize BibTeX entry to our format
function normalizeBibtexEntry(entry: any): NormalizedRef | null {
  try {
    const title = entry.title || '';
    const journal = entry.journal || entry.booktitle || '';
    const year = parseInt(entry.year || '0');
    const doi = entry.doi || undefined;
    const pmid = entry.pmid || undefined;
    const authors = entry.author ? entry.author.split(' and ').map((a: string) => a.trim()) : [];
    const abstract = entry.abstract || undefined;
    
    if (!title || !journal || !year || authors.length === 0) {
      return null;
    }
    
    return {
      title: title.replace(/[{}]/g, '').trim(),
      journal: journal.replace(/[{}]/g, '').trim(),
      year: year,
      doi: doi?.replace(/[{}]/g, '').trim(),
      pmid: pmid?.replace(/[{}]/g, '').trim(),
      authors: authors,
      abstract: abstract?.replace(/[{}]/g, '').trim()
    };
  } catch (error) {
    return null;
  }
}

// Main parser function for text-based imports
export function parseImportFile(content: string, filename: string): NormalizedRef[] {
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'ris':
      return parseRis(content);
    case 'bib':
    case 'bibtex':
      return parseBibtexContent(content);
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
}

// Enhanced parser function that handles both text and binary inputs
export async function parseImportFileEnhanced(input: { buffer?: Buffer; text?: string; filename?: string; mimetype?: string }): Promise<{ refs: NormalizedRef[]; metadata?: any }> {
  // If binary provided, sniff content; otherwise treat as text
  if (input.buffer) {
    const ft = await validateFileContent(input.buffer);
    switch (ft.mime) {
      case "application/pdf":
        if (!IMPORT_CONFIG.FEATURE_IMPORT_PDF_BIB) {
          throw Object.assign(new Error("NOT_ENABLED"), { code: "ERR_NOT_ENABLED" });
        }
        return await PdfBibExtractor.extract(input.buffer);
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": // .docx
        if (!IMPORT_CONFIG.FEATURE_IMPORT_DOCX_BIB) {
          throw Object.assign(new Error("NOT_ENABLED"), { code: "ERR_NOT_ENABLED" });
        }
        return await DocxBibExtractor.extract(input.buffer);
      case "application/msword": // legacy .doc (explicitly not supported)
        throw Object.assign(new Error("DOC_LEGACY_NOT_SUPPORTED"), { code: "ERR_DOC_UNSUPPORTED" });
      default:
        throw Object.assign(new Error("UNSUPPORTED_TYPE"), { code: "ERR_UNSUPPORTED_TYPE", mime: ft.mime });
    }
  } else if (input.text) {
    // Handle existing RIS/BibTeX detection/parse functions
    if (input.filename) {
      const refs = parseImportFile(input.text, input.filename);
      return { refs, metadata: { source: "text", format: input.filename.split('.').pop() } };
    }
    throw Object.assign(new Error("UNKNOWN_TEXT_FORMAT"), { code: "ERR_UNKNOWN_TEXT" });
  }
  throw Object.assign(new Error("NO_INPUT"), { code: "ERR_NO_INPUT" });
}

// Validate normalized references
export function validateNormalizedRefs(refs: NormalizedRef[]): NormalizedRef[] {
  return refs.map(ref => {
    const validated = NormalizedRefSchema.parse(ref);
    return validated;
  });
}
