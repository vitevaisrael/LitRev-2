import mammoth from "mammoth";
import { IMPORT_CONFIG } from "../../../config/importConfig";
import { 
  findReferencesSection, 
  parseReferences, 
  assessConfidence,
  type NormalizedRef 
} from "../bibCore";

type ExtractMeta = {
  extractedLines: number;
  truncated: boolean;
  confidence: "high" | "medium" | "low";
  warning?: string;
};

export class DocxBibExtractor {
  static async extract(buffer: Buffer): Promise<{ refs: NormalizedRef[]; metadata: ExtractMeta }> {
    const sizeMB = buffer.length / (1024 * 1024);
    if (sizeMB > IMPORT_CONFIG.DOCX_MAX_SIZE_MB) {
      throw Object.assign(new Error("DOCX_TOO_LARGE"), { code: "ERR_DOCX_TOO_LARGE" });
    }

    // mammoth supports DOCX only. We enforce a hard timeout.
    const t = setTimeout(() => { 
      throw Object.assign(new Error("DOCX_TIMEOUT"), { code: "ERR_DOCX_TIMEOUT" }); 
    }, IMPORT_CONFIG.DOCX_TIMEOUT_MS);
    
    try {
      // extractRawText is faster & avoids HTML stripping
      const { value: rawText } = await mammoth.extractRawText({ buffer });
      clearTimeout(t);

      let text = (rawText ?? "").replace(/\u0000/g, "");
      if (text.length > IMPORT_CONFIG.DOCX_MAX_TEXT_CHARS) {
        text = text.slice(0, IMPORT_CONFIG.DOCX_MAX_TEXT_CHARS);
      }

      const section = findReferencesSection(text);
      if (!section) {
        return {
          refs: [],
          metadata: { 
            extractedLines: 0, 
            truncated: text.length >= IMPORT_CONFIG.DOCX_MAX_TEXT_CHARS, 
            confidence: "low", 
            warning: "No references section detected" 
          }
        };
      }

      const refs = parseReferences(section).map(r => ({ ...r, source: "docx" }));
      const conf = assessConfidence(refs);
      return {
        refs,
        metadata: {
          extractedLines: section.split("\n").length,
          truncated: text.length >= IMPORT_CONFIG.DOCX_MAX_TEXT_CHARS,
          confidence: conf,
          ...(conf === "low" ? { warning: "Low confidence; prefer RIS/BibTeX for accuracy" } : {})
        }
      };
    } finally {
      clearTimeout(t);
    }
  }
}

