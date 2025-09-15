import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { Alert } from "../ui/alert";

type Job = { 
  id: string; 
  state: string; 
  progress: any; 
  result?: { 
    totalFound: number; 
    results: any[] 
  } | null 
};

type PubMedArticle = {
  pmid: string;
  doi?: string;
  title: string;
  abstract?: string;
  journal?: string;
  year?: number;
  authors: Array<{ family?: string; given?: string; full?: string }>;
};

interface PubMedSearchPanelProps {
  projectId: string;
  onImportComplete?: () => void;
}

export default function PubMedSearchPanel({ projectId, onImportComplete }: PubMedSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [jobId, setJobId] = useState<string>();
  const [job, setJob] = useState<Job>();
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const [existing, setExisting] = useState<{pmids: Set<string>, dois: Set<string>}>({ 
    pmids: new Set(), 
    dois: new Set() 
  });
  const [isSearching, setIsSearching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSearch() {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/pubmed/search`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ query, limit: 50 })
      });
      
      if (!res.ok) {
        throw new Error(`Search failed: ${res.statusText}`);
      }
      
      const data = await res.json();
      setJobId(data?.data?.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    let t: any;
    async function poll() {
      if (!jobId) return;
      
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/pubmed/jobs/${jobId}`).then(r => r.json());
        setJob(res?.data);
        
        if (res?.data?.state !== "completed" && res?.data?.state !== "failed") {
          t = setTimeout(poll, 1000);
        } else if (res?.data?.state === "failed") {
          setError("Search job failed");
        }
      } catch (err) {
        setError("Failed to check job status");
      }
    }
    poll(); 
    return () => t && clearTimeout(t);
  }, [jobId, projectId]);

  // After results arrive, ask server which are already in the project
  useEffect(() => {
    (async () => {
      const items = job?.result?.results || [];
      if (!items.length) return;
      
      const pmids = items.map((a: any) => String(a.pmid));
      const dois = items.map((a: any) => a.doi).filter(Boolean);
      
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/pubmed/dedupe-check`, {
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pmids, dois })
        }).then(r => r.json());
        
        setExisting({
          pmids: new Set(res?.data?.existingPmids || []),
          dois: new Set(res?.data?.existingDois || [])
        });
      } catch (err) {
        console.error("Failed to check duplicates:", err);
      }
    })();
  }, [job?.result?.results, projectId]);

  async function importSelected() {
    if (!jobId) return;
    
    const pmids = job?.result?.results?.filter((a: any) => chosen[a.pmid]).map((a: any) => a.pmid) || [];
    if (pmids.length === 0) return;
    
    setIsImporting(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/pubmed/jobs/${jobId}/import`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ pmids })
      });
      
      if (!res.ok) {
        throw new Error(`Import failed: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Clear selections and refresh
      setChosen({});
      onImportComplete?.();
      
      // Show success message (you might want to use a toast here)
      alert(`Successfully imported ${data.data.imported} references. ${data.data.skipped} were skipped.`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }

  const selectedCount = Object.values(chosen).filter(Boolean).length;
  const hasResults = job?.result?.results && job.result.results.length > 0;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">PubMed Search</h3>
            <p className="text-sm text-muted-foreground">
              Search PubMed and import references directly into your project
            </p>
          </div>
          
          <div className="flex gap-2">
            <Input 
              className="flex-1" 
              placeholder="Enter your PubMed search query..." 
              value={query} 
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startSearch()}
            />
            <Button 
              onClick={startSearch} 
              disabled={!query.trim() || isSearching}
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}
        </div>
      </Card>

      {job && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Search Status</h4>
                <p className="text-sm text-muted-foreground">
                  State: <Badge variant={job.state === 'completed' ? 'default' : 'secondary'}>
                    {job.state}
                  </Badge>
                </p>
              </div>
              {job.progress?.pct && (
                <div className="w-32">
                  <Progress value={job.progress.pct} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {job.progress.pct}%
                  </p>
                </div>
              )}
            </div>

            {hasResults && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    Results ({job.result?.results.length} of {job.result?.totalFound} found)
                  </h4>
                  {selectedCount > 0 && (
                    <Button 
                      onClick={importSelected}
                      disabled={isImporting}
                      size="sm"
                    >
                      {isImporting ? "Importing..." : `Import ${selectedCount} selected`}
                    </Button>
                  )}
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {job.result.results.map((article: PubMedArticle) => {
                    const isDup = existing.pmids.has(String(article.pmid)) || 
                                 (article.doi && existing.dois.has(String(article.doi)));
                    
                    return (
                      <div 
                        key={article.pmid} 
                        className={`flex items-start gap-3 p-3 border rounded-lg ${
                          isDup ? "opacity-60 bg-muted/50" : ""
                        }`}
                      >
                        <Checkbox 
                          checked={!!chosen[article.pmid]} 
                          onCheckedChange={checked => 
                            setChosen(s => ({ ...s, [article.pmid]: !!checked }))
                          }
                          disabled={isDup}
                        />
                        <div className="flex-1 space-y-1">
                          <h5 className="font-medium text-sm leading-tight">
                            {article.title}
                          </h5>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>
                              {article.journal || "—"} • {article.year ?? "n/a"} • PMID {article.pmid}
                              {article.doi && ` • DOI ${article.doi}`}
                            </div>
                            {article.authors.length > 0 && (
                              <div>
                                {article.authors.map(a => a.full || `${a.family || ""} ${a.given || ""}`.trim()).filter(Boolean).join(", ")}
                              </div>
                            )}
                            {isDup && (
                              <Badge variant="outline" className="text-xs">
                                Already in project
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

