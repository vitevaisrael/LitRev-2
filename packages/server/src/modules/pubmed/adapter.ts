import { request } from "undici";
import pRetry from "p-retry";
import { PUBMED } from "../../config/pubmed";
import type { PubMedArticle } from "@the-scientist/schemas";

function buildURL(path: string, params: Record<string, string | number | undefined>) {
  const u = new URL(`${PUBMED.BASE}/${path}`);
  const q = {
    ...params,
    tool: PUBMED.TOOL || undefined,
    email: PUBMED.EMAIL || undefined,
    api_key: PUBMED.API_KEY || undefined,
    retmode: "json"
  };
  for (const [k,v] of Object.entries(q)) if (v !== undefined && v !== "") u.searchParams.set(k, String(v));
  return u.toString();
}

async function getJSON(url: string) {
  const res = await request(url, { method: "GET" });
  if (res.statusCode >= 400) throw new Error(`PUBMED_HTTP_${res.statusCode}`);
  return res.body.json();
}

export class PubMedAdapter {
  async esearch(term: string, limit: number, filters?: { mindate?: string; maxdate?: string; sort?: "relevance"|"pub_date" }) {
    const retmax = Math.min(Math.max(limit ?? 50, 1), 200);
    const url = buildURL("esearch.fcgi", {
      db: "pubmed",
      term,
      retmax,
      sort: filters?.sort === "pub_date" ? "pub+date" : undefined,
      mindate: filters?.mindate,
      maxdate: filters?.maxdate,
      usehistory: "y"
    });
    const data: any = await pRetry(() => getJSON(url), { retries: 2 });
    const ids: string[] = data?.esearchresult?.idlist ?? [];
    const count = Number(data?.esearchresult?.count ?? ids.length);
    return { pmids: ids, totalFound: count };
  }

  async esummary(pmids: string[]): Promise<PubMedArticle[]> {
    if (!pmids.length) return [];
    const out: PubMedArticle[] = [];
    for (let i = 0; i < pmids.length; i += 200) {
      const batch = pmids.slice(i, i+200);
      const url = buildURL("esummary.fcgi", { db: "pubmed", id: batch.join(",") });
      const data: any = await pRetry(() => getJSON(url), { retries: 2 });
      const uids: string[] = data?.result?.uids ?? [];
      for (const uid of uids) {
        const r = data.result[uid];
        if (!r) continue;
        const doi = (r?.articleids || []).find((x:any)=> String(x?.idtype).toLowerCase() === "doi")?.value;
        const year = Number(r?.pubdate?.match(/\b(19|20)\d{2}\b/)?.[0] ?? r?.epubdate?.match(/\b(19|20)\d{2}\b/)?.[0]);
        out.push({
          pmid: String(uid),
          doi,
          title: r?.title || "",
          abstract: undefined, // ESummary rarely includes abstracts; use EFetch when FEATURE_PUBMED_EFETCH=1
          journal: r?.fulljournalname || r?.source,
          year: Number.isFinite(year) ? year : undefined,
          authors: (r?.authors ?? []).map((a:any)=>({ family: a?.lastname, given: a?.firstname, full: a?.name }))
        });
      }
    }
    return out;
  }

  // Optional: EFetch for abstracts (on-demand)
  async efetch(pmids: string[]): Promise<Record<string, { abstract?: string }>> {
    if (!pmids.length) return {};
    // EFetch XML returns; for simplicity we skip XML parsing here—wire a tiny parser or keep placeholder.
    // ADAPT: you may use a small XML parser (fast-xml-parser) if allowed; otherwise, skip implementing until needed.
    return {}; // placeholder; route will no-op unless you implement parsing.
  }

  async search(term: string, limit: number, filters?: { mindate?: string; maxdate?: string; sort?: "relevance"|"pub_date" }) {
    const { pmids, totalFound } = await this.esearch(term, limit, filters);
    const articles = await this.esummary(pmids);
    return { totalFound, articles };
  }
}
