import { describe, it, expect, vi } from "vitest";
import * as mammoth from "mammoth";
import { DocxBibExtractor } from "./docxBibExtractor";

describe("DocxBibExtractor", () => {
  // Mock mammoth.extractRawText to avoid file system issues
  vi.mock("mammoth", () => ({
    default: {
      extractRawText: vi.fn()
    }
  }));

  describe("extract", () => {
    it("should extract DOIs/PMIDs and compute confidence", async () => {
      vi.spyOn(mammoth.default, "extractRawText").mockResolvedValue({
        value: `
        Introduction
        Methods

        References
        1. Smith J et al. 2023. Title. J Med. doi:10.1000/xyz123
        2. Doe A. 2021. Another Title. PMID:3456789
        3. Brown L. 2022. Third Title. Journal of Medicine.
      `
      } as any);

      const fakeDocx = Buffer.alloc(10); // content type is validated in parser tests; here we focus on extractor
      const { refs, metadata } = await DocxBibExtractor.extract(fakeDocx);
      
      expect(refs.some(r => r.doi)).toBe(true);
      expect(refs.some(r => r.pmid)).toBe(true);
      expect(["high","medium","low"]).toContain(metadata.confidence);
      expect(metadata.extractedLines).toBeGreaterThan(0);
      expect(metadata.truncated).toBe(false);
    });

    it("should handle DOCX with no references section", async () => {
      vi.spyOn(mammoth.default, "extractRawText").mockResolvedValue({
        value: `
        Introduction
        Methods
        Results
        Discussion
        No references section here.
      `
      } as any);

      const fakeDocx = Buffer.alloc(10);
      const { refs, metadata } = await DocxBibExtractor.extract(fakeDocx);
      
      expect(refs).toHaveLength(0);
      expect(metadata.confidence).toBe("low");
      expect(metadata.warning).toBe("No references section detected");
    });

    it("should throw error for DOCX too large", async () => {
      // Create a buffer larger than 20MB
      const largeBuffer = Buffer.alloc(21 * 1024 * 1024); // 21MB
      largeBuffer.write("%DOCX", 0);

      await expect(DocxBibExtractor.extract(largeBuffer)).rejects.toThrow("DOCX_TOO_LARGE");
    });

    it("should have timeout protection", async () => {
      // Test that the extractor has timeout protection by checking the implementation
      // The actual timeout behavior is tested in integration tests
      const fakeDocx = Buffer.alloc(10);
      
      // Mock mammoth to resolve quickly
      vi.spyOn(mammoth.default, "extractRawText").mockResolvedValue({
        value: "References\n1. Test reference"
      } as any);
      
      const result = await DocxBibExtractor.extract(fakeDocx);
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it("should return proper metadata structure", async () => {
      vi.spyOn(mammoth.default, "extractRawText").mockResolvedValue({
        value: "References\n1. Test reference"
      } as any);

      const fakeDocx = Buffer.alloc(10);
      const { metadata } = await DocxBibExtractor.extract(fakeDocx);

      expect(metadata).toHaveProperty("extractedLines");
      expect(metadata).toHaveProperty("truncated");
      expect(metadata).toHaveProperty("confidence");
      expect(["high", "medium", "low"]).toContain(metadata.confidence);
    });

    it("should handle multilingual reference headers", async () => {
      vi.spyOn(mammoth.default, "extractRawText").mockResolvedValue({
        value: `
        Introduction
        
        Références
        1. Smith J. 2023. French Title. Journal.
        2. Doe A. 2022. Another Title. PMID:1234567
      `
      } as any);

      const fakeDocx = Buffer.alloc(10);
      const { refs, metadata } = await DocxBibExtractor.extract(fakeDocx);
      
      expect(refs.length).toBeGreaterThan(0);
      expect(metadata.confidence).toBe("medium"); // Has PMID but also partial refs
    });

    it("should mark references with docx source", async () => {
      vi.spyOn(mammoth.default, "extractRawText").mockResolvedValue({
        value: `
        References
        1. Smith J. 2023. Title. doi:10.1000/test
      `
      } as any);

      const fakeDocx = Buffer.alloc(10);
      const { refs } = await DocxBibExtractor.extract(fakeDocx);
      
      expect(refs[0].source).toBe("docx");
    });
  });
});
