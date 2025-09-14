import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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
    enabled: showSentences
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
          <h3 className="font-medium mb-2">Score: {candidate.score.total}/65</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Design: {candidate.score.design}/40</div>
            <div>Directness: {candidate.score.directness}/10</div>
            <div>Recency: {candidate.score.recency}/5</div>
            <div>Journal: {candidate.score.journal}/5</div>
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
            <button
              onClick={() => setShowSentences(!showSentences)}
              className="ml-2 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              {showSentences ? 'Hide' : 'Show'} Sentences
            </button>
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
