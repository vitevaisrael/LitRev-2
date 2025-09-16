import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cacheGetSummary, cacheSetSummary, cacheGetMultipleSummaries, cacheSetMultipleSummaries } from "./cache";

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  mget: vi.fn(),
  pipeline: vi.fn(() => ({
    set: vi.fn(),
    exec: vi.fn()
  }))
};

vi.mock("../../lib/redis", () => ({
  getRedis: () => mockRedis
}));

describe("PubMed Cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("cacheGetSummary", () => {
    it("should return cached data when available", async () => {
      const mockData = { pmid: "12345678", title: "Test Article" };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await cacheGetSummary("12345678");

      expect(result).toEqual(mockData);
      expect(mockRedis.get).toHaveBeenCalledWith("pubmed:summary:12345678");
    });

    it("should return null when no cached data", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheGetSummary("12345678");

      expect(result).toBeNull();
    });

    it("should handle invalid JSON gracefully", async () => {
      mockRedis.get.mockResolvedValue("invalid json");

      const result = await cacheGetSummary("12345678");

      expect(result).toBeNull();
    });
  });

  describe("cacheSetSummary", () => {
    it("should store data with TTL", async () => {
      const mockData = { pmid: "12345678", title: "Test Article" };
      mockRedis.set.mockResolvedValue("OK");

      await cacheSetSummary("12345678", mockData);

      expect(mockRedis.set).toHaveBeenCalledWith(
        "pubmed:summary:12345678",
        JSON.stringify(mockData),
        "EX",
        604800 // 7 days
      );
    });
  });

  describe("cacheGetMultipleSummaries", () => {
    it("should return multiple cached items", async () => {
      const mockData1 = { pmid: "12345678", title: "Article 1" };
      const mockData2 = { pmid: "87654321", title: "Article 2" };
      
      mockRedis.mget.mockResolvedValue([
        JSON.stringify(mockData1),
        JSON.stringify(mockData2)
      ]);

      const result = await cacheGetMultipleSummaries(["12345678", "87654321"]);

      expect(result).toEqual([mockData1, mockData2]);
      expect(mockRedis.mget).toHaveBeenCalledWith(
        "pubmed:summary:12345678",
        "pubmed:summary:87654321"
      );
    });

    it("should handle mixed cache hits and misses", async () => {
      const mockData1 = { pmid: "12345678", title: "Article 1" };
      
      mockRedis.mget.mockResolvedValue([
        JSON.stringify(mockData1),
        null
      ]);

      const result = await cacheGetMultipleSummaries(["12345678", "87654321"]);

      expect(result).toEqual([mockData1, null]);
    });

    it("should handle invalid JSON in batch", async () => {
      mockRedis.mget.mockResolvedValue([
        "invalid json",
        null
      ]);

      const result = await cacheGetMultipleSummaries(["12345678", "87654321"]);

      expect(result).toEqual([null, null]);
    });
  });

  describe("cacheSetMultipleSummaries", () => {
    it("should store multiple items using pipeline", async () => {
      const mockPipeline = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue([["OK"], ["OK"]])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const summaries = [
        { pmid: "12345678", data: { title: "Article 1" } },
        { pmid: "87654321", data: { title: "Article 2" } }
      ];

      await cacheSetMultipleSummaries(summaries);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.set).toHaveBeenCalledTimes(2);
      expect(mockPipeline.set).toHaveBeenCalledWith(
        "pubmed:summary:12345678",
        JSON.stringify({ title: "Article 1" }),
        "EX",
        604800
      );
      expect(mockPipeline.set).toHaveBeenCalledWith(
        "pubmed:summary:87654321",
        JSON.stringify({ title: "Article 2" }),
        "EX",
        604800
      );
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it("should handle empty array", async () => {
      const mockPipeline = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue([])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await cacheSetMultipleSummaries([]);

      expect(mockPipeline.set).not.toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });
});

