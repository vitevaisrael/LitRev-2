import { describe, it, expect, beforeEach, vi } from "vitest";
import { PdfBibExtractor } from "./pdfBibExtractor";

// Mock pdf-parse to avoid file system issues
vi.mock("pdf-parse", () => ({
  default: vi.fn().mockImplementation((buffer) => {
    // Return mock data that simulates PDF parsing
    return Promise.resolve({
      text: "References\n\n1. Smith J, Jones K. A randomized trial of treatment. New England Journal of Medicine. 2023; 388(12): 1234-1245. doi:10.1056/NEJMoa2023\n\n2. Brown L, Davis M. Systematic review of interventions. Lancet. 2022; 399(10325): 567-578. PMID: 34567890",
      numpages: 12
    });
  })
}));

describe("PdfBibExtractor", () => {
  // Simple mock PDF buffer
  function createMockPdfBuffer(): Buffer {
    return Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\nxref\n0 2\n0000000000 65535 f \n0000000010 00000 n \ntrailer\n<<>>\nstartxref\n9\n%%EOF");
  }

  describe("extract", () => {
    it("should extract references from PDF with References section", async () => {
      const buffer = createMockPdfBuffer();
      const result = await PdfBibExtractor.extract(buffer);

      expect(result.refs).toHaveLength(3);
      expect(result.metadata.confidence).toBe("medium");
      expect(result.metadata.totalPages).toBe(12);
      
      // Check first reference
      const firstRef = result.refs[0];
      expect(firstRef.doi).toBe("10.1056/NEJMoa2023");
      expect(firstRef.source).toBe("pdf");
      expect(firstRef.partial).toBe(false);
      expect(firstRef.confidence).toBe(1.0);
    });

    it("should throw error for PDF too large", async () => {
      // Create a buffer larger than 20MB
      const largeBuffer = Buffer.alloc(21 * 1024 * 1024); // 21MB
      largeBuffer.write("%PDF-1.4", 0);

      await expect(PdfBibExtractor.extract(largeBuffer)).rejects.toThrow("PDF_TOO_LARGE");
    });

    it("should return proper metadata structure", async () => {
      const buffer = createMockPdfBuffer();
      const result = await PdfBibExtractor.extract(buffer);

      expect(result.metadata).toHaveProperty("totalPages");
      expect(result.metadata).toHaveProperty("extractedLines");
      expect(result.metadata).toHaveProperty("truncated");
      expect(result.metadata).toHaveProperty("confidence");
      expect(["high", "medium", "low"]).toContain(result.metadata.confidence);
    });
  });
});
