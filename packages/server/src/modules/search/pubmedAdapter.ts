// PubMed adapter stub - placeholder for future implementation
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
  async search(query: string, maxResults = 100): Promise<PubMedSearchResult[]> {
    // Stub implementation - will be replaced with real PubMed E-utilities integration
    return [
      {
        pmid: "12345678",
        title: "Mock PubMed Result",
        journal: "Mock Journal",
        year: 2023,
        authors: ["Mock Author"],
        abstract: "This is a mock abstract from PubMed.",
        doi: "10.1000/mock"
      }
    ];
  }

  async enrichWithCrossref(pmids: string[]): Promise<Record<string, any>> {
    // Stub for Crossref enrichment
    return {};
  }

  async checkUnpaywall(dois: string[]): Promise<Record<string, string | null>> {
    // Stub for Unpaywall OA detection
    return {};
  }
}
