// Minimal PubMed adapter using E-utilities (ESearch + EFetch)
export interface PubMedSearchResult {
  pmid: string;
  title: string;
  journal: string;
  year: number;
  authors: string[];
  abstract?: string;
  doi?: string;
}

export class PubMedAdapter {
  private base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

  async search(query: string, maxResults = 50): Promise<PubMedSearchResult[]> {
    try {
      // 1) ESearch: get PMIDs
      const esearchUrl = `${this.base}/esearch.fcgi?db=pubmed&retmode=json&retmax=${Math.min(maxResults, 200)}&term=${encodeURIComponent(query)}`;
      const esResp = await fetch(esearchUrl);
      const esData = await esResp.json();
      const pmids: string[] = (esData as any)?.esearchresult?.idlist || [];
      if (pmids.length === 0) return [];

      // 2) EFetch: get details
      const efetchUrl = `${this.base}/efetch.fcgi?db=pubmed&retmode=xml&id=${pmids.join(',')}`;
      const efResp = await fetch(efetchUrl);
      const efText = await efResp.text();

      // naive XML parsing via regexes to keep dependencies light
      const results: PubMedSearchResult[] = [];
      const records = efText.split('<PubmedArticle>').slice(1);
      for (const rec of records) {
        const pmid = matchTag(rec, 'PMID');
        const articleTitle = matchTag(rec, 'ArticleTitle');
        const journalTitle = matchTag(rec, 'Title');
        const yearStr = matchTag(rec, 'Year') || matchTag(rec, 'MedlineDate');
        const abstractText = between(rec, '<AbstractText', '</AbstractText>');
        const doi = findDOI(rec);
        const authors = extractAuthors(rec);

        if (!pmid || !articleTitle || !journalTitle) continue;
        const year = parseYear(yearStr);
        results.push({
          pmid,
          title: decodeHtml(articleTitle),
          journal: decodeHtml(journalTitle),
          year,
          authors,
          abstract: abstractText ? stripTags(abstractText) : undefined,
          doi: doi || undefined,
        });
      }
      return results;
    } catch (err) {
      // On error, return empty to keep downstream stable
      return [];
    }
  }
}

function matchTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function between(xml: string, startTag: string, endTag: string): string | null {
  const start = xml.indexOf(startTag);
  if (start === -1) return null;
  const end = xml.indexOf(endTag, start);
  if (end === -1) return null;
  const sub = xml.slice(start, end + endTag.length);
  // remove attributes in startTag
  return sub.replace(/<AbstractText[^>]*>/, '').replace(/<\/AbstractText>/, '');
}

function parseYear(text: string | null): number {
  if (!text) return new Date().getFullYear();
  const m = text.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : new Date().getFullYear();
}

function extractAuthors(xml: string): string[] {
  const authors: string[] = [];
  const blocks = xml.split('<Author>').slice(1);
  for (const b of blocks) {
    const last = matchTag(b, 'LastName');
    const fore = matchTag(b, 'ForeName') || matchTag(b, 'Initials');
    if (last) authors.push([fore, last].filter(Boolean).join(' '));
  }
  return authors;
}

function findDOI(xml: string): string | null {
  const re = /<ArticleId IdType=\"doi\">([\s\S]*?)<\/ArticleId>/i;
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function decodeHtml(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function stripTags(s: string): string { return s.replace(/<[^>]+>/g, ''); }
