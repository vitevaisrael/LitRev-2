import { useState } from 'react';

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
  onInclude: (reason?: string, justification?: string) => void;
  onExclude: (reason: string, justification?: string) => void;
  onBetter: (reason?: string) => void;
  onAsk: (question?: string) => void;
}

export function DecisionCard({ 
  candidate, 
  parsedDoc, 
  onInclude, 
  onExclude, 
  onBetter, 
  onAsk 
}: DecisionCardProps) {
  const [reason, setReason] = useState('');
  const [justification, setJustification] = useState('');

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
