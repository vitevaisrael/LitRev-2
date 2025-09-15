import { ProviderRecord } from '@the-scientist/schemas';

export interface PubMedSearchOptions {
  query: string;
  maxResults?: number;
  apiKey?: string;
}

export interface PubMedResponse {
  esearchresult: {
    idlist: string[];
    count: string;
    retmax: string;
    retstart: string;
  };
}

export interface PubMedSummaryResponse {
  result: {
    [pmid: string]: {
      uid: string;
      title: string;
      authors: Array<{ name: string; authtype: string }>;
      source: string;
      pubdate: string;
      epubdate: string;
      doi: string;
      pmc: string;
      abstract?: string;
      meshterms?: Array<{ ui: string; name: string }>;
    };
  };
}

/**
 * Search PubMed using E-utilities API
 */
export async function pubmedSearch(options: PubMedSearchOptions): Promise<ProviderRecord[]> {
  const { query, maxResults = 100, apiKey } = options;
  
  try {
    // Step 1: Search for PMIDs
    const searchUrl = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
    searchUrl.searchParams.set('db', 'pubmed');
    searchUrl.searchParams.set('term', query);
    searchUrl.searchParams.set('retmax', maxResults.toString());
    searchUrl.searchParams.set('retmode', 'json');
    if (apiKey) {
      searchUrl.searchParams.set('api_key', apiKey);
    }

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      throw new Error(`PubMed search failed: ${searchResponse.statusText}`);
    }

    const searchData: PubMedResponse = await searchResponse.json();
    const pmids = searchData.esearchresult.idlist;

    if (pmids.length === 0) {
      return [];
    }

    // Step 2: Get detailed information for each PMID
    const summaryUrl = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
    summaryUrl.searchParams.set('db', 'pubmed');
    summaryUrl.searchParams.set('id', pmids.join(','));
    summaryUrl.searchParams.set('retmode', 'json');
    if (apiKey) {
      summaryUrl.searchParams.set('api_key', apiKey);
    }

    const summaryResponse = await fetch(summaryUrl.toString());
    if (!summaryResponse.ok) {
      throw new Error(`PubMed summary failed: ${summaryResponse.statusText}`);
    }

    const summaryData: PubMedSummaryResponse = await summaryResponse.json();

    // Step 3: Convert to ProviderRecord format
    const records: ProviderRecord[] = [];
    
    for (const pmid of pmids) {
      const article = summaryData.result[pmid];
      if (!article) continue;

      const record: ProviderRecord = {
        title: article.title || '',
        year: extractYear(article.pubdate || article.epubdate),
        doi: article.doi || undefined,
        pmid: article.uid,
        pmcid: article.pmc || undefined,
        source: 'pubmed',
        authors: article.authors?.map(author => author.name) || [],
        journal: article.source || undefined,
        abstract: article.abstract || undefined,
        meshTerms: article.meshterms?.map(term => ({ ui: term.ui, name: term.name })) || [],
        rawPayload: article
      };

      records.push(record);
    }

    return records;
  } catch (error) {
    console.error('PubMed search error:', error);
    throw new Error(`Failed to search PubMed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract year from PubMed date string
 */
function extractYear(dateString: string): number | undefined {
  if (!dateString) return undefined;
  
  // PubMed dates can be in various formats: "2023", "2023-01", "2023-01-15", etc.
  const yearMatch = dateString.match(/^(\d{4})/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    if (year >= 1900 && year <= new Date().getFullYear() + 1) {
      return year;
    }
  }
  
  return undefined;
}
