import { useState } from 'react';

interface Claim {
  id: string;
  text: string;
  section?: string;
  supports: Support[];
}

interface Support {
  id: string;
  quote: string;
  locator: { page: number; sentence: number };
  candidateId: string;
}

interface ClaimDetailProps {
  claim: Claim;
  onAddSupport: (support: Omit<Support, 'id'>) => void;
}

export function ClaimDetail({ claim, onAddSupport }: ClaimDetailProps) {
  const [newSupport, setNewSupport] = useState({
    quote: '',
    locator: { page: 1, sentence: 1 },
    candidateId: ''
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Claim</h3>
        <p className="text-gray-700">{claim.text}</p>
        {claim.section && (
          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
            {claim.section}
          </span>
        )}
      </div>
      
      <div>
        <h4 className="font-medium mb-2">Supports ({claim.supports.length})</h4>
        <div className="space-y-2">
          {claim.supports.map((support) => (
            <div key={support.id} className="p-3 border rounded bg-gray-50">
              <p className="text-sm italic">"{support.quote}"</p>
              <p className="text-xs text-gray-500 mt-1">
                Page {support.locator.page}, Sentence {support.locator.sentence}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">Add Support</h4>
        <div className="space-y-2">
          <textarea
            value={newSupport.quote}
            onChange={(e) => setNewSupport({...newSupport, quote: e.target.value})}
            className="w-full p-2 border rounded"
            placeholder="Quote from parsed text..."
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={newSupport.locator.page}
              onChange={(e) => setNewSupport({
                ...newSupport, 
                locator: {...newSupport.locator, page: parseInt(e.target.value)}
              })}
              className="w-20 p-2 border rounded"
              placeholder="Page"
              min="1"
            />
            <input
              type="number"
              value={newSupport.locator.sentence}
              onChange={(e) => setNewSupport({
                ...newSupport, 
                locator: {...newSupport.locator, sentence: parseInt(e.target.value)}
              })}
              className="w-20 p-2 border rounded"
              placeholder="Sentence"
              min="1"
            />
          </div>
          <button
            onClick={() => onAddSupport(newSupport)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Add Support
          </button>
        </div>
      </div>
    </div>
  );
}
