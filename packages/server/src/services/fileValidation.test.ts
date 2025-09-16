import { describe, it, expect } from "vitest";
import { validateFileContent } from "./fileValidation";

describe("fileValidation", () => {
  describe("validateFileContent", () => {
    it("should detect PDF files correctly", async () => {
      // Create a minimal PDF buffer
      const pdfBuffer = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\nxref\n0 2\n0000000000 65535 f \n0000000010 00000 n \ntrailer\n<<>>\nstartxref\n9\n%%EOF");
      
      const result = await validateFileContent(pdfBuffer);
      
      expect(result.mime).toBe("application/pdf");
      expect(result.ext).toBe("pdf");
    });

    it("should detect text files correctly", async () => {
      const textBuffer = Buffer.from("This is a plain text file with some content.");
      
      const result = await validateFileContent(textBuffer);
      
      // file-type doesn't detect plain text files, so we expect null
      expect(result.mime).toBeNull();
      expect(result.ext).toBeNull();
    });

    it("should return null for unrecognized content", async () => {
      const unknownBuffer = Buffer.from("This is some random binary data that doesn't match any known format.");
      
      const result = await validateFileContent(unknownBuffer);
      
      expect(result.mime).toBeNull();
      expect(result.ext).toBeNull();
    });

    it("should handle empty buffers", async () => {
      const emptyBuffer = Buffer.alloc(0);
      
      const result = await validateFileContent(emptyBuffer);
      
      expect(result.mime).toBeNull();
      expect(result.ext).toBeNull();
    });

    it("should handle very small buffers", async () => {
      const smallBuffer = Buffer.from("hi");
      
      const result = await validateFileContent(smallBuffer);
      
      // Small buffers might not be detected by file-type
      expect(result.mime).toBeNull();
      expect(result.ext).toBeNull();
    });
  });
});
