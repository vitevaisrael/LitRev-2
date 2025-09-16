import { getRedis } from "../../lib/redis";
import { PUBMED } from "../../config/pubmed";

const KEY = (pmid: string) => `pubmed:summary:${pmid}`;

export async function cacheGetSummary(pmid: string) {
  const redis = getRedis();
  const raw = await redis.get(KEY(pmid));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function cacheSetSummary(pmid: string, value: any) {
  const redis = getRedis();
  await redis.set(KEY(pmid), JSON.stringify(value), "EX", PUBMED.SUMMARY_CACHE_TTL_SEC);
}

export async function cacheGetMultipleSummaries(pmids: string[]) {
  const redis = getRedis();
  const keys = pmids.map(KEY);
  const results = await redis.mget(...keys);
  return results.map((raw, index) => {
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  });
}

export async function cacheSetMultipleSummaries(summaries: Array<{ pmid: string; data: any }>) {
  const redis = getRedis();
  const pipeline = redis.pipeline();
  
  for (const { pmid, data } of summaries) {
    pipeline.set(KEY(pmid), JSON.stringify(data), "EX", PUBMED.SUMMARY_CACHE_TTL_SEC);
  }
  
  await pipeline.exec();
}
