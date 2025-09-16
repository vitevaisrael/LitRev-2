import pdfParse from "pdf-parse";
import { IMPORT_CONFIG } from "../../../config/importConfig";
import { 
  findReferencesSection, 
  parseReferences, 
  assessConfidence,
  type NormalizedRef 
} from "../bibCore";

type ExtractMeta = {
  totalPages: number;
  extractedLines: number;
  truncated: boolean;
  confidence: "high" | "medium" | "low";
  warning?: string;
};

export class PdfBibExtractor {

  static async extract(buffer: Buffer): Promise<{ refs: NormalizedRef[]; metadata: ExtractMeta }> {
    const sizeMB = buffer.length / (1024 * 1024);
    if (sizeMB > IMPORT_CONFIG.PDF_MAX_SIZE_MB) {
      throw Object.assign(new Error("PDF_TOO_LARGE"), { code: "ERR_PDF_TOO_LARGE" });
    }

    const parsePromise = pdfParse(buffer, { max: IMPORT_CONFIG.PDF_MAX_PAGES });
    const timeout = new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("PDF_TIMEOUT"), { code: "ERR_PDF_TIMEOUT" })), IMPORT_CONFIG.PDF_TIMEOUT_MS));
    const data: any = await Promise.race([parsePromise, timeout]);

    let text: string = (data?.text ?? "").replace(/\u0000/g, "");
    if (text.length > IMPORT_CONFIG.PDF_MAX_TEXT_CHARS) {
      text = text.slice(0, IMPORT_CONFIG.PDF_MAX_TEXT_CHARS);
    }

    const section = findReferencesSection(text);
    if (!section) {
      return {
        refs: [],
        metadata: {
          totalPages: data?.numpages ?? 0,
          extractedLines: 0,
          truncated: text.length >= IMPORT_CONFIG.PDF_MAX_TEXT_CHARS,
          confidence: "low",
          warning: "No references section detected"
        }
      };
    }

    const refs = parseReferences(section).map(r => ({ ...r, source: "pdf" }));
    const conf = assessConfidence(refs);
    return {
      refs,
      metadata: {
        totalPages: data?.numpages ?? 0,
        extractedLines: section.split("\n").length,
        truncated: text.length >= IMPORT_CONFIG.PDF_MAX_TEXT_CHARS,
        confidence: conf,
        ...(conf === "low" ? { warning: "Low confidence; prefer RIS/BibTeX for accuracy" } : {})
      }
    };
  }

}
