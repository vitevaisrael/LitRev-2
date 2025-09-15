export const IMPORT_CONFIG = {
  FEATURE_IMPORT_PDF_BIB: process.env.FEATURE_IMPORT_PDF_BIB !== "false",
  FEATURE_IMPORT_DOCX_BIB: process.env.FEATURE_IMPORT_DOCX_BIB !== "false",
  PDF_MAX_SIZE_MB: 20,
  PDF_MAX_PAGES: 50,           // cap pages parsed by pdf-parse
  PDF_MAX_TEXT_CHARS: 1_000_000,
  PDF_TIMEOUT_MS: 30_000,
  DOCX_MAX_SIZE_MB: 20,
  DOCX_MAX_TEXT_CHARS: 1_000_000,
  DOCX_TIMEOUT_MS: 15_000,
  REFERENCE_HEADERS: [
    "References","Bibliography","Works Cited","Literature Cited",
    "Références","Bibliografía","Literaturverzeichnis",
    "Bibliografia","参考文献","المراجع","참고문헌"
  ]
};
