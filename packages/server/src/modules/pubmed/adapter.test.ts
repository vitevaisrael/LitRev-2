import { describe, it, expect, vi, beforeEach } from "vitest";
import { PubMedAdapter } from "./adapter";

// Mock undici
vi.mock("undici", () => ({
  request: vi.fn()
}));

// Mock p-retry
vi.mock("p-retry", () => ({
  default: vi.fn((fn) => fn())
}));

describe("PubMedAdapter", () => {
  let adapter: PubMedAdapter;
  let mockRequest: any;

  beforeEach(async () => {
    adapter = new PubMedAdapter();
    const undici = await import("undici");
    mockRequest = vi.mocked(undici.request);
  });

  describe("esearch", () => {
    it("should search PubMed and return PMIDs", async () => {
      const mockResponse = {
        statusCode: 200,
        body: {
          json: vi.fn().mockResolvedValue({
            esearchresult: {
              idlist: ["12345678", "87654321"],
              count: "2",
              retmax: "50",
              retstart: "0"
            }
          })
        }
      };
      
      mockRequest.mockResolvedValue(mockResponse);

      const result = await adapter.esearch("test query", 50);

      expect(result.pmids).toEqual(["12345678", "87654321"]);
      expect(result.totalFound).toBe(2);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("esearch.fcgi"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("should handle empty results", async () => {
      const mockResponse = {
        statusCode: 200,
        body: {
          json: vi.fn().mockResolvedValue({
            esearchresult: {
              idlist: [],
              count: "0",
              retmax: "50",
              retstart: "0"
            }
          })
        }
      };
      
      mockRequest.mockResolvedValue(mockResponse);

      const result = await adapter.esearch("nonexistent query", 50);

      expect(result.pmids).toEqual([]);
      expect(result.totalFound).toBe(0);
    });

    it("should respect limit parameter", async () => {
      const mockResponse = {
        statusCode: 200,
        body: {
          json: vi.fn().mockResolvedValue({
            esearchresult: {
              idlist: ["1", "2", "3"],
              count: "3",
              retmax: "3",
              retstart: "0"
            }
          })
        }
      };
      
      mockRequest.mockResolvedValue(mockResponse);

      await adapter.esearch("test", 3);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("retmax=3"),
        expect.any(Object)
      );
    });
  });

  describe("esummary", () => {
    it("should fetch article summaries", async () => {
      const mockResponse = {
        statusCode: 200,
        body: {
          json: vi.fn().mockResolvedValue({
            result: {
              uids: ["12345678"],
              "12345678": {
                uid: "12345678",
                title: "Test Article",
                authors: [
                  { lastname: "Smith", firstname: "John", name: "Smith J" }
                ],
                fulljournalname: "Test Journal",
                pubdate: "2023",
                articleids: [
                  { idtype: "doi", value: "10.1000/test" }
                ]
              }
            }
          })
        }
      };
      
      mockRequest.mockResolvedValue(mockResponse);

      const result = await adapter.esummary(["12345678"]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        pmid: "12345678",
        doi: "10.1000/test",
        title: "Test Article",
        abstract: undefined,
        journal: "Test Journal",
        year: 2023,
        authors: [{ family: "Smith", given: "John", full: "Smith J" }]
      });
    });

    it("should handle empty PMID list", async () => {
      const result = await adapter.esummary([]);
      expect(result).toEqual([]);
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it("should handle large PMID lists in batches", async () => {
      const largePmidList = Array.from({ length: 250 }, (_, i) => `${i + 1}`);
      
      const mockResponse = {
        statusCode: 200,
        body: {
          json: vi.fn().mockResolvedValue({
            result: {
              uids: largePmidList.slice(0, 200),
              ...Object.fromEntries(
                largePmidList.slice(0, 200).map(pmid => [
                  pmid,
                  {
                    uid: pmid,
                    title: `Article ${pmid}`,
                    authors: [],
                    fulljournalname: "Test Journal",
                    pubdate: "2023"
                  }
                ])
              )
            }
          })
        }
      };
      
      mockRequest.mockResolvedValue(mockResponse);

      const result = await adapter.esummary(largePmidList);

      // Should make 2 calls (200 + 50)
      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(200);
    });
  });

  describe("search", () => {
    it("should perform complete search workflow", async () => {
      const esearchResponse = {
        statusCode: 200,
        body: {
          json: vi.fn().mockResolvedValue({
            esearchresult: {
              idlist: ["12345678"],
              count: "1"
            }
          })
        }
      };

      const esummaryResponse = {
        statusCode: 200,
        body: {
          json: vi.fn().mockResolvedValue({
            result: {
              uids: ["12345678"],
              "12345678": {
                uid: "12345678",
                title: "Test Article",
                authors: [],
                fulljournalname: "Test Journal",
                pubdate: "2023"
              }
            }
          })
        }
      };

      mockRequest
        .mockResolvedValueOnce(esearchResponse)
        .mockResolvedValueOnce(esummaryResponse);

      const result = await adapter.search("test query", 50);

      expect(result.totalFound).toBe(1);
      expect(result.articles).toHaveLength(1);
      expect(result.articles[0].title).toBe("Test Article");
    });
  });

  describe("efetch", () => {
    it("should return empty object for now (placeholder)", async () => {
      const result = await adapter.efetch(["12345678"]);
      expect(result).toEqual({});
    });

    it("should handle empty PMID list", async () => {
      const result = await adapter.efetch([]);
      expect(result).toEqual({});
    });
  });
});
