import { Queue, Worker, Job, QueueOptions } from "bullmq";
import { getRedis } from "../../lib/redis";
import { PubMedAdapter } from "./adapter";
import { PUBMED } from "../../config/pubmed";
import { cacheGetSummary, cacheSetSummary } from "./cache";

const connection = getRedis();
const opts: QueueOptions = { connection };
export const pubmedSearchQueue = new Queue("pubmed-search", opts);

export type PubMedSearchPayload = {
  projectId: string;
  userId: string;
  query: string;
  limit: number;
  filters?: { mindate?: string; maxdate?: string; sort?: "relevance"|"pub_date" };
};

export function startPubMedWorker() {
  const adapter = new PubMedAdapter();
  new Worker("pubmed-search", async (job: Job<PubMedSearchPayload>) => {
    await job.updateProgress({ step: "searching", pct: 10 });
    const { query, limit, filters } = job.data;
    const res = await adapter.search(query, limit, filters);

    // Cache ESummary articles by PMID
    await job.updateProgress({ step: "caching", pct: 40 });
    for (const a of res.articles) {
      const exists = await cacheGetSummary(a.pmid);
      if (!exists) await cacheSetSummary(a.pmid, a);
    }

    await job.updateProgress({ step: "completed", pct: 100 });
    return { totalFound: res.totalFound, results: res.articles };
  }, {
    connection,
    concurrency: Math.max(PUBMED.RPS, 1),
    // robust backoff for transient failures
    settings: { backoffStrategy: {} as any },
    // Attempts/backoff via defaultJobOptions on queue add (see routes)
  });
}
