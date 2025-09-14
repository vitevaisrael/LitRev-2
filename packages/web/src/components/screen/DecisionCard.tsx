import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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
      alert('Score recomputed successfully!');
    },
    onError: (error: any) => {
      alert(`Score recomputation failed: ${error.message}`);
    }
  });

  // PDF upload mutation
  const pdfUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/v1/projects/${projectId}/candidates/${candidate.id}/pdf`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }
      
      return data;
    },
    onSuccess: () => {
      // Refetch parsed doc and audit logs
      queryClient.invalidateQueries({ queryKey: ['parsed', candidate.id] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', projectId] });
      alert('PDF uploaded and parsed successfully!');
    },
    onError: (error: any) => {
      alert(`PDF upload failed: ${error.message}`);
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
      alert('Quote captured successfully!');
      setShowQuotePicker(false);
      setSelectedSentence(null);
      setSelectedClaimId('');
    },
    onError: (error: any) => {
      alert(`Failed to capture quote: ${error.message}`);
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        return;
      }
      pdfUploadMutation.mutate(file);
    }
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
      <div>
        <h2 className="text-xl font-semibold mb-2">{candidate.title}</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <div>{candidate.journal} ({candidate.year})</div>
          {candidate.doi && <div>DOI: {candidate.doi}</div>}
          {candidate.pmid && <div>PMID: {candidate.pmid}</div>}
        </div>
      </div>

      {candidate.abstract && (
        <div>
          <h3 className="font-medium mb-2">Abstract</h3>
          <p className="text-sm text-gray-700">{candidate.abstract}</p>
        </div>
      )}

      {candidate.score && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Score: {candidate.score.total}/65</h3>
            <button
              onClick={() => recomputeScoreMutation.mutate()}
              disabled={recomputeScoreMutation.isPending}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
              title="Recompute score based on current data"
            >
              {recomputeScoreMutation.isPending ? 'Computing...' : 'Recompute'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div title="Study design type (SR/MA=40, RCT=35, Cohort=28, etc.)">
              Design: {candidate.score.design}/40
            </div>
            <div title="Relevance to problem profile (exact=10, close=7, partial=3, off=0)">
              Directness: {candidate.score.directness}/10
            </div>
            <div title="Publication recency (≤2y=5, ≤5y=3, older=1, very old=0)">
              Recency: {candidate.score.recency}/5
            </div>
            <div title="Journal impact factor (NEJM/Lancet/JAMA=5, etc.)">
              Journal: {candidate.score.journal}/5
            </div>
          </div>
        </div>
      )}

      {/* PDF Upload Section */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-2">PDF Document</h3>
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={pdfUploadMutation.isPending}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {pdfUploadMutation.isPending ? 'Uploading...' : 'Attach PDF'}
          </button>
          
          {parsedDocData && (
            <>
              <button
                onClick={() => setShowSentences(!showSentences)}
                className="ml-2 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                {showSentences ? 'Hide' : 'Show'} Sentences
              </button>
              <button
                onClick={() => setShowQuotePicker(!showQuotePicker)}
                className="ml-2 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
              >
                {showQuotePicker ? 'Cancel' : 'Capture Quote'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sentences Panel */}
      {showSentences && parsedDocData && (
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Sentences</h3>
          <div className="space-y-2">
            <input
              type="text"
              value={sentenceSearch}
              onChange={(e) => setSentenceSearch(e.target.value)}
              className="w-full p-2 border rounded text-sm"
              placeholder="Search sentences..."
            />
            <div className="text-sm text-gray-600">
              {filteredSentences.length} sentences found
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredSentences.map((sentence: any, index: number) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                  <div className="font-medium text-gray-600">
                    Page {sentence.page}, Sentence {sentence.idx}
                  </div>
                  <div className="text-gray-800">{sentence.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quote Picker Panel */}
      {showQuotePicker && parsedDocData && (
        <div className="border-t pt-4">
          <h3 className="font-medium mb-4">Capture Quote</h3>
          
          {/* Claim Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Claim</label>
            <select
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

          {/* Sentence Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Search and Select Sentence</label>
            <input
              type="text"
              value={sentenceSearch}
              onChange={(e) => setSentenceSearch(e.target.value)}
              className="w-full p-2 border rounded text-sm mb-2"
              placeholder="Search sentences..."
            />
            <div className="text-sm text-gray-600 mb-2">
              {filteredSentences.length} sentences found
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredSentences.map((sentence: any, index: number) => (
                <div
                  key={index}
                  onClick={() => handleSentenceSelect(sentence)}
                  className={`text-sm p-2 rounded cursor-pointer transition-colors ${
                    selectedSentence?.idx === sentence.idx && selectedSentence?.page === sentence.page
                      ? 'bg-purple-100 border-2 border-purple-300'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium text-gray-600">
                    Page {sentence.page}, Sentence {sentence.idx}
                  </div>
                  <div className="text-gray-800">{sentence.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Sentence Preview */}
          {selectedSentence && (
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
              <div className="text-sm font-medium text-purple-800 mb-1">Selected Quote:</div>
              <div className="text-sm text-purple-700">
                Page {selectedSentence.page}, Sentence {selectedSentence.idx}
              </div>
              <div className="text-sm text-gray-800 mt-1">{selectedSentence.text}</div>
            </div>
          )}

          {/* Capture Button */}
          <div className="flex gap-2">
            <button
              onClick={handleCaptureQuote}
              disabled={!selectedSentence || !selectedClaimId || createSupportMutation.isPending}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {createSupportMutation.isPending ? 'Capturing...' : 'Capture Quote'}
            </button>
            <button
              onClick={() => {
                setShowQuotePicker(false);
                setSelectedSentence(null);
                setSelectedClaimId('');
              }}
              className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
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

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Brief reason for decision..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Justification (optional)</label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Detailed justification..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onInclude(reason, justification)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Include
        </button>
        <button
          onClick={() => onExclude(reason || 'No reason provided', justification)}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Exclude
        </button>
        <button
          onClick={() => onBetter(reason)}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Better
        </button>
        <button
          onClick={() => onAsk(reason)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Ask
        </button>
      </div>
    </div>
  );
}
