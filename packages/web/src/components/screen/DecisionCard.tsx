import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { Dropzone } from '../ui/dropzone';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { FileText, Upload, Search, Quote, CheckCircle, XCircle, HelpCircle, MessageSquare } from 'lucide-react';
import { queryKeys } from '../../lib/queryKeys';
import { notifySuccess, notifyError, handleApiError } from '../../lib/notify';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface Candidate {
  id: string;
  title: string;
  journal: string;
  year: number;
  doi?: string;
  pmid?: string;
  abstract?: string;
  score?: {
    design: number;
    directness: number;
    recency: number;
    journal: number;
    total: number;
  };
}

interface DecisionCardProps {
  candidate: Candidate;
  parsedDoc?: any;
  projectId: string;
  onInclude: (reason?: string, justification?: string) => void;
  onExclude: (reason: string, justification?: string) => void;
  onBetter: (reason?: string) => void;
  onAsk: (question?: string) => void;
}

export function DecisionCard({ 
  candidate, 
  parsedDoc, 
  projectId,
  onInclude, 
  onExclude, 
  onBetter, 
  onAsk 
}: DecisionCardProps) {
  const [reason, setReason] = useState('');
  const [justification, setJustification] = useState('');
  const [showSentences, setShowSentences] = useState(false);
  const [sentenceSearch, setSentenceSearch] = useState('');
  const [showQuotePicker, setShowQuotePicker] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState<any>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const queryClient = useQueryClient();

  // Set up keyboard shortcuts for screening actions
  useKeyboardShortcuts({
    onInclude: () => onInclude(reason, justification),
    onExclude: () => onExclude(reason || 'No reason provided', justification),
    onMarkBetter: () => onBetter(reason),
  });

  // Recompute score mutation
  const recomputeScoreMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/projects/${projectId}/candidates/${candidate.id}/recompute-score`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }
      
      return data;
    },
    onSuccess: () => {
      // Refetch candidates to update the score
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates(projectId) });
      notifySuccess('Score recomputed successfully!');
    },
    onError: (error: any) => {
      handleApiError(error, 'Score recomputation failed');
    }
  });

  // PDF upload mutation with progress tracking
  const pdfUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadError(null);
      setUploadSuccess(false);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setUploadProgress(progress);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              setUploadProgress(100);
              setUploadSuccess(true);
              resolve(data);
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error?.message || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });
        
        xhr.open('POST', `/api/v1/projects/${projectId}/candidates/${candidate.id}/pdf`);
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      // Refetch parsed doc and audit logs
      queryClient.invalidateQueries({ queryKey: ['parsed', candidate.id] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', projectId] });
      
      notifySuccess('PDF uploaded and parsed successfully!');
      
      // Reset success state after a delay
      setTimeout(() => {
        setUploadSuccess(false);
        setUploadProgress(0);
      }, 3000);
    },
    onError: (error: any) => {
      setUploadError(error.message);
      setUploadProgress(0);
      
      handleApiError(error, 'PDF upload failed');
      
      // Clear error after a delay
      setTimeout(() => {
        setUploadError(null);
      }, 5000);
    }
  });

  // Fetch parsed document
  const { data: parsedDocData } = useQuery({
    queryKey: ['parsed', candidate.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/projects/${projectId}/candidates/${candidate.id}/parsed`);
      if (response.status === 404) return null;
      const data = await response.json();
      return data.data;
    },
    enabled: showSentences || showQuotePicker
  });

  // Fetch claims for quote picker
  const { data: claimsData } = useQuery({
    queryKey: queryKeys['ledger-claims'](projectId),
    queryFn: async () => {
      const response = await fetch(`/api/v1/projects/${projectId}/ledger/claims`);
      const data = await response.json();
      return data.data;
    },
    enabled: showQuotePicker
  });

  // Create support mutation
  const createSupportMutation = useMutation({
    mutationFn: async (supportData: any) => {
      const response = await fetch(`/api/v1/projects/${projectId}/ledger/supports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supportData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }
      
      return data;
    },
    onSuccess: () => {
      // Refetch supports for the claim and audit logs
      queryClient.invalidateQueries({ queryKey: queryKeys.supports(selectedClaimId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs(projectId) });
      notifySuccess('Quote captured successfully!');
      setShowQuotePicker(false);
      setSelectedSentence(null);
      setSelectedClaimId('');
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to capture quote');
    }
  });

  const handleFileSelect = (file: File | Error) => {
    if (file instanceof Error) {
      setUploadError(file.message);
      setTimeout(() => setUploadError(null), 5000);
      return;
    }
    
    if (file.type !== 'application/pdf') {
      const errorMessage = 'Please select a PDF file';
      setUploadError(errorMessage);
      notifyError(errorMessage);
      setTimeout(() => setUploadError(null), 5000);
      return;
    }
    
    pdfUploadMutation.mutate(file);
  };

  // Filter sentences based on search
  const filteredSentences = parsedDocData?.textJson?.pages?.flatMap((page: any) =>
    page.sentences
      .filter((sentence: any) => 
        sentence.text.toLowerCase().includes(sentenceSearch.toLowerCase())
      )
      .map((sentence: any) => ({
        ...sentence,
        page: page.page
      }))
  ) || [];

  const handleSentenceSelect = (sentence: any) => {
    setSelectedSentence(sentence);
  };

  const handleCaptureQuote = () => {
    if (!selectedSentence || !selectedClaimId) {
      alert('Please select a sentence and a claim');
      return;
    }

    createSupportMutation.mutate({
      claimId: selectedClaimId,
      candidateId: candidate.id,
      quote: selectedSentence.text,
      locator: {
        page: selectedSentence.page,
        sentence: selectedSentence.idx
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl leading-tight">{candidate.title}</CardTitle>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{candidate.journal}</Badge>
            <Badge variant="outline">{candidate.year}</Badge>
            {candidate.doi && (
              <Badge variant="secondary" className="font-mono text-xs">
                DOI: {candidate.doi}
              </Badge>
            )}
            {candidate.pmid && (
              <Badge variant="secondary" className="font-mono text-xs">
                PMID: {candidate.pmid}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {candidate.abstract && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Abstract
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{candidate.abstract}</p>
          </CardContent>
        </Card>
      )}

      <Accordion type="multiple" className="w-full space-y-6">
        {candidate.score && (
          <Card>
            <AccordionItem value="score" className="border-b-0">
              <AccordionTrigger className="px-6">
                <CardTitle className="text-lg">Quality Score: {candidate.score.total}/65</CardTitle>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="flex justify-end mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => recomputeScoreMutation.mutate()}
                    disabled={recomputeScoreMutation.isPending}
                    title="Recompute score based on current data"
                  >
                    {recomputeScoreMutation.isPending ? 'Computing...' : 'Recompute'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Design</span>
                      <span className="font-medium">{candidate.score.design}/40</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${(candidate.score.design / 40) * 100}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Study design type</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Directness</span>
                      <span className="font-medium">{candidate.score.directness}/10</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${(candidate.score.directness / 10) * 100}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Relevance to profile</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recency</span>
                      <span className="font-medium">{candidate.score.recency}/5</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${(candidate.score.recency / 5) * 100}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Publication recency</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Journal</span>
                      <span className="font-medium">{candidate.score.journal}/5</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${(candidate.score.journal / 5) * 100}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Journal impact</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Card>
        )}

        {/* PDF Upload & Sentences Section */}
        <Card>
          <AccordionItem value="pdf" className="border-b-0">
            <AccordionTrigger className="px-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                PDF Document
              </CardTitle>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                <Dropzone
                  onFileSelect={handleFileSelect}
                  isUploading={pdfUploadMutation.isPending}
                  uploadProgress={uploadProgress}
                  error={uploadError}
                  success={uploadSuccess}
                  acceptedFileTypes={['.pdf']}
                  maxFileSize={10 * 1024 * 1024} // 10MB
                />
                {parsedDocData && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowSentences(!showSentences)}
                      className="flex-1"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {showSentences ? 'Hide' : 'Show'} Sentences
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowQuotePicker(!showQuotePicker)}
                      className="flex-1"
                    >
                      <Quote className="h-4 w-4 mr-2" />
                      {showQuotePicker ? 'Cancel' : 'Capture Quote'}
                    </Button>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Card>
      </Accordion>

      {/* Sentences Panel */}
      {showSentences && parsedDocData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Document Sentences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sentence-search">Search sentences</Label>
                <Input
                  id="sentence-search"
                  type="text"
                  value={sentenceSearch}
                  onChange={(e) => setSentenceSearch(e.target.value)}
                  placeholder="Search sentences..."
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredSentences.length} sentences found
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredSentences.map((sentence: any, index: number) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Badge variant="outline" className="text-xs">
                        Page {sentence.page}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Sentence {sentence.idx}
                      </Badge>
                    </div>
                    <div className="text-sm">{sentence.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quote Picker Panel */}
      {showQuotePicker && parsedDocData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Quote className="h-5 w-5" />
              Capture Quote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Claim Selection */}
              <div className="space-y-2">
                <Label htmlFor="claim-select">Select Claim</Label>
                <select
                  id="claim-select"
                  value={selectedClaimId}
                  onChange={(e) => setSelectedClaimId(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="">Choose a claim...</option>
                  {claimsData?.claims?.map((claim: any) => (
                    <option key={claim.id} value={claim.id}>
                      {claim.title}
                    </option>
                  ))}
                </select>
              </div>

              <Separator />

              {/* Sentence Selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quote-search">Search and Select Sentence</Label>
                  <Input
                    id="quote-search"
                    type="text"
                    value={sentenceSearch}
                    onChange={(e) => setSentenceSearch(e.target.value)}
                    placeholder="Search sentences..."
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredSentences.length} sentences found
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredSentences.map((sentence: any, index: number) => (
                    <div
                      key={index}
                      onClick={() => handleSentenceSelect(sentence)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedSentence?.idx === sentence.idx && selectedSentence?.page === sentence.page
                          ? 'bg-primary/10 border-2 border-primary'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Badge variant="outline" className="text-xs">
                          Page {sentence.page}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Sentence {sentence.idx}
                        </Badge>
                      </div>
                      <div className="text-sm">{sentence.text}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Sentence Preview */}
              {selectedSentence && (
                <Alert>
                  <Quote className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">Selected Quote:</div>
                      <div className="text-sm text-muted-foreground">
                        Page {selectedSentence.page}, Sentence {selectedSentence.idx}
                      </div>
                      <div className="text-sm">{selectedSentence.text}</div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Capture Button */}
              <div className="flex gap-2">
                <Button
                  onClick={handleCaptureQuote}
                  disabled={!selectedSentence || !selectedClaimId || createSupportMutation.isPending}
                  className="flex-1"
                >
                  <Quote className="h-4 w-4 mr-2" />
                  {createSupportMutation.isPending ? 'Capturing...' : 'Capture Quote'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQuotePicker(false);
                    setSelectedSentence(null);
                    setSelectedClaimId('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {parsedDoc && (
        <div>
          <h3 className="font-medium mb-2">Parsed Text Preview</h3>
          <div className="text-sm text-gray-700 max-h-32 overflow-y-auto">
            {parsedDoc.pages?.slice(0, 2).map((page: any) => (
              <div key={page.page} className="mb-2">
                <div className="font-medium">Page {page.page}:</div>
                {page.sentences?.slice(0, 2).map((sentence: any) => (
                  <div key={sentence.idx} className="ml-2">
                    {sentence.idx}. {sentence.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Make Decision</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief reason for decision..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="justification">Justification (optional)</Label>
              <textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="w-full p-2 border rounded resize-none"
                placeholder="Detailed justification..."
                rows={3}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => onInclude(reason, justification)}
                className="bg-green-600 hover:bg-green-700 text-white"
                title="Include candidate (I)"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Include
                <kbd className="ml-2 bg-green-700 px-1 py-0.5 rounded text-xs">I</kbd>
              </Button>
              <Button
                onClick={() => onExclude(reason || 'No reason provided', justification)}
                variant="destructive"
                title="Exclude candidate (X)"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Exclude
                <kbd className="ml-2 bg-red-700 px-1 py-0.5 rounded text-xs">X</kbd>
              </Button>
              <Button
                onClick={() => onBetter(reason)}
                variant="outline"
                className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                title="Mark as Better (B)"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Better
                <kbd className="ml-2 bg-yellow-600 px-1 py-0.5 rounded text-xs">B</kbd>
              </Button>
              <Button
                onClick={() => onAsk(reason)}
                variant="outline"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Ask
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
