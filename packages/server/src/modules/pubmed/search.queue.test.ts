import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pubmedSearchQueue, startPubMedWorker, type PubMedSearchPayload } from "./search.queue";

// Mock Redis
const mockRedis = {
  ping: vi.fn().mockResolvedValue("PONG")
};

// Mock BullMQ
const mockQueue = {
  add: vi.fn(),
  getJob: vi.fn(),
  getJobs: vi.fn(),
  close: vi.fn()
};

const mockWorker = {
  on: vi.fn(),
  close: vi.fn()
};

const mockJob = {
  id: "test-job-1",
  data: {
    projectId: "test-project",
    userId: "test-user",
    query: "test query",
    limit: 50
  },
  updateProgress: vi.fn(),
  getState: vi.fn().mockResolvedValue("completed"),
  progress: { step: "completed", pct: 100 },
  returnvalue: {
    totalFound: 2,
    results: [
      { pmid: "12345678", title: "Test Article 1" },
      { pmid: "87654321", title: "Test Article 2" }
    ]
  }
};

vi.mock("bullmq", () => ({
  Queue: vi.fn(() => mockQueue),
  Worker: vi.fn(() => mockWorker)
}));

vi.mock("../../lib/redis", () => ({
  getRedis: () => mockRedis
}));

vi.mock("./adapter", () => ({
  PubMedAdapter: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue({
      totalFound: 2,
      articles: [
        { pmid: "12345678", title: "Test Article 1" },
        { pmid: "87654321", title: "Test Article 2" }
      ]
    })
  }))
}));

vi.mock("./cache", () => ({
  cacheGetSummary: vi.fn().mockResolvedValue(null),
  cacheSetSummary: vi.fn().mockResolvedValue(undefined)
}));

describe("PubMed Search Queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("pubmedSearchQueue", () => {
    it("should be defined", () => {
      expect(pubmedSearchQueue).toBeDefined();
    });

    it("should add job with correct options", async () => {
      const payload: PubMedSearchPayload = {
        projectId: "test-project",
        userId: "test-user",
        query: "test query",
        limit: 50
      };

      mockQueue.add.mockResolvedValue(mockJob);

      const result = await pubmedSearchQueue.add("search", payload, {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: "exponential", delay: 500 }
      });

      expect(mockQueue.add).toHaveBeenCalledWith("search", payload, {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: "exponential", delay: 500 }
      });
      expect(result).toBe(mockJob);
    });
  });

  describe("startPubMedWorker", () => {
    it("should create worker with correct configuration", () => {
      const { Worker } = require("bullmq");
      
      startPubMedWorker();

      expect(Worker).toHaveBeenCalledWith(
        "pubmed-search",
        expect.any(Function),
        {
          connection: mockRedis,
          concurrency: 3, // PUBMED.RPS
          settings: { backoffStrategies: {} }
        }
      );
    });

    it("should process job correctly", async () => {
      const { PubMedAdapter } = require("./adapter");
      const { cacheGetSummary, cacheSetSummary } = require("./cache");
      
      const mockAdapter = {
        search: vi.fn().mockResolvedValue({
          totalFound: 2,
          articles: [
            { pmid: "12345678", title: "Test Article 1" },
            { pmid: "87654321", title: "Test Article 2" }
          ]
        })
      };
      
      PubMedAdapter.mockImplementation(() => mockAdapter);
      cacheGetSummary.mockResolvedValue(null);
      cacheSetSummary.mockResolvedValue(undefined);

      const { Worker } = require("bullmq");
      startPubMedWorker();

      // Get the worker function
      const workerFunction = Worker.mock.calls[0][1];
      
      // Mock job
      const mockJobInstance = {
        updateProgress: vi.fn(),
        data: {
          query: "test query",
          limit: 50,
          filters: undefined
        }
      };

      const result = await workerFunction(mockJobInstance);

      expect(mockJobInstance.updateProgress).toHaveBeenCalledWith({ step: "searching", pct: 10 });
      expect(mockJobInstance.updateProgress).toHaveBeenCalledWith({ step: "caching", pct: 40 });
      expect(mockJobInstance.updateProgress).toHaveBeenCalledWith({ step: "completed", pct: 100 });
      
      expect(mockAdapter.search).toHaveBeenCalledWith("test query", 50, undefined);
      expect(cacheGetSummary).toHaveBeenCalledTimes(2);
      expect(cacheSetSummary).toHaveBeenCalledTimes(2);
      
      expect(result).toEqual({
        totalFound: 2,
        results: [
          { pmid: "12345678", title: "Test Article 1" },
          { pmid: "87654321", title: "Test Article 2" }
        ]
      });
    });

    it("should skip caching if article already exists", async () => {
      const { PubMedAdapter } = require("./adapter");
      const { cacheGetSummary, cacheSetSummary } = require("./cache");
      
      const mockAdapter = {
        search: vi.fn().mockResolvedValue({
          totalFound: 1,
          articles: [{ pmid: "12345678", title: "Test Article" }]
        })
      };
      
      PubMedAdapter.mockImplementation(() => mockAdapter);
      cacheGetSummary.mockResolvedValue({ pmid: "12345678", title: "Cached Article" });
      cacheSetSummary.mockResolvedValue(undefined);

      const { Worker } = require("bullmq");
      startPubMedWorker();

      const workerFunction = Worker.mock.calls[0][1];
      const mockJobInstance = {
        updateProgress: vi.fn(),
        data: { query: "test", limit: 50 }
      };

      await workerFunction(mockJobInstance);

      expect(cacheGetSummary).toHaveBeenCalledWith("12345678");
      expect(cacheSetSummary).not.toHaveBeenCalled();
    });
  });
});

