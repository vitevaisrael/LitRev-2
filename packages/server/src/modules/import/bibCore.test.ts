import { describe, it, expect } from "vitest";
import { 
  findReferencesSection, 
  parseReferences, 
  assessConfidence,
  DOI_REGEX,
  PMID_REGEX,
  CITATION_STYLES
} from "./bibCore";

describe("bibCore", () => {
  describe("findReferencesSection", () => {
    it("should find References section", () => {
      const text = `
        Introduction
        Methods
        
        References
        1. Smith J. 2023. Title. Journal.
        2. Doe A. 2022. Another Title. Journal.
      `;
      
      const result = findReferencesSection(text);
      expect(result).toContain("1. Smith J. 2023. Title. Journal.");
      expect(result).toContain("2. Doe A. 2022. Another Title. Journal.");
    });

    it("should find Bibliography section", () => {
      const text = `
        Introduction
        
        Bibliography
        1. Smith J. 2023. Title. Journal.
      `;
      
      const result = findReferencesSection(text);
      expect(result).toContain("1. Smith J. 2023. Title. Journal.");
    });

    it("should find multilingual reference headers", () => {
      const text = `
        Introduction
        
        Références
        1. Smith J. 2023. Title. Journal.
      `;
      
      const result = findReferencesSection(text);
      expect(result).toContain("1. Smith J. 2023. Title. Journal.");
    });

    it("should return null when no references section found", () => {
      const text = `
        Introduction
        Methods
        Results
        Discussion
      `;
      
      const result = findReferencesSection(text);
      expect(result).toBeNull();
    });

    it("should use DOI density fallback", () => {
      const text = `
        Introduction
        Methods
        Results
        Discussion
        Conclusion
        
        Some content here
        Another line
        Yet another line
        
        1. Smith J. 2023. Title. doi:10.1000/test1
        2. Doe A. 2022. Title. doi:10.1000/test2
        3. Brown L. 2021. Title. doi:10.1000/test3
      `;
      
      const result = findReferencesSection(text);
      expect(result).toContain("1. Smith J. 2023. Title. doi:10.1000/test1");
    });
  });

  describe("parseReferences", () => {
    it("should extract DOIs", () => {
      const text = `
        1. Smith J. 2023. Title. Journal. doi:10.1000/test
        2. Doe A. 2022. Another Title. Journal.
      `;
      
      const refs = parseReferences(text);
      const doiRef = refs.find(r => r.doi);
      expect(doiRef?.doi).toBe("10.1000/test");
      expect(doiRef?.confidence).toBe(1.0);
    });

    it("should extract PMIDs", () => {
      const text = `
        1. Smith J. 2023. Title. Journal. PMID:12345678
        2. Doe A. 2022. Another Title. Journal.
      `;
      
      const refs = parseReferences(text);
      const pmidRef = refs.find(r => r.pmid);
      expect(pmidRef?.pmid).toBe("12345678");
      expect(pmidRef?.confidence).toBe(0.9);
    });

    it("should parse numbered citations", () => {
      const text = `
        1. Smith J. 2023. A Study of Something. Journal of Medicine.
        2. Doe A. 2022. Another Study. Medical Journal.
      `;
      
      const refs = parseReferences(text);
      expect(refs.length).toBeGreaterThan(0);
      expect(refs[0].title).toContain("A Study of Something");
      expect(refs[0].year).toBe(2023);
    });

    it("should deduplicate references", () => {
      const text = `
        1. Smith J. 2023. Title. Journal. doi:10.1000/test
        2. Smith J. 2023. Title. Journal. doi:10.1000/test
      `;
      
      const refs = parseReferences(text);
      const doiRefs = refs.filter(r => r.doi);
      expect(doiRefs).toHaveLength(1);
    });
  });

  describe("assessConfidence", () => {
    it("should return high confidence for mostly DOIs/PMIDs", () => {
      const refs = [
        { title: "Test", authors: [], journal: "Test", year: 2023, doi: "10.1000/test", source: "test", partial: false, confidence: 1.0 },
        { title: "Test2", authors: [], journal: "Test", year: 2023, pmid: "12345678", source: "test", partial: false, confidence: 0.9 },
        { title: "Test3", authors: [], journal: "Test", year: 2023, doi: "10.1000/test2", source: "test", partial: false, confidence: 1.0 }
      ];
      
      const confidence = assessConfidence(refs);
      expect(confidence).toBe("high");
    });

    it("should return medium confidence for some DOIs/PMIDs", () => {
      const refs = [
        { title: "Test", authors: [], journal: "Test", year: 2023, doi: "10.1000/test", source: "test", partial: false, confidence: 1.0 },
        { title: "Test2", authors: [], journal: "Test", year: 2023, source: "test", partial: true, confidence: 0.4 },
        { title: "Test3", authors: [], journal: "Test", year: 2023, source: "test", partial: true, confidence: 0.4 }
      ];
      
      const confidence = assessConfidence(refs);
      expect(confidence).toBe("medium");
    });

    it("should return low confidence for no DOIs/PMIDs", () => {
      const refs = [
        { title: "Test", authors: [], journal: "Test", year: 2023, source: "test", partial: true, confidence: 0.4 },
        { title: "Test2", authors: [], journal: "Test", year: 2023, source: "test", partial: true, confidence: 0.4 }
      ];
      
      const confidence = assessConfidence(refs);
      expect(confidence).toBe("low");
    });

    it("should return low confidence for empty refs", () => {
      const refs: any[] = [];
      const confidence = assessConfidence(refs);
      expect(confidence).toBe("low");
    });
  });

  describe("regex patterns", () => {
    it("should match DOI patterns", () => {
      const text = "doi:10.1000/test doi:10.1234/example-123";
      const matches = Array.from(text.matchAll(DOI_REGEX));
      expect(matches).toHaveLength(2);
      expect(matches[0][0]).toBe("10.1000/test");
      expect(matches[1][0]).toBe("10.1234/example-123");
    });

    it("should match PMID patterns", () => {
      const text = "PMID:12345678 pmid:87654321";
      const matches = Array.from(text.matchAll(PMID_REGEX));
      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe("12345678");
      expect(matches[1][1]).toBe("87654321");
    });

    it("should match numbered citation style", () => {
      const text = "1. Smith J. 2023. Title. Journal.\n2. Doe A. 2022. Another Title.";
      const matches = Array.from(text.matchAll(CITATION_STYLES.numbered));
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
