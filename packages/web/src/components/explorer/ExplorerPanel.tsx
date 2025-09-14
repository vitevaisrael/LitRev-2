import { useState } from 'react';

interface ExplorerRun {
  runId: string;
  outline?: string[];
  narrative?: Array<{
    section: string;
    text: string;
    refs: Array<{ doi?: string; pmid?: string }>;
  }>;
  refs: Array<{
    title: string;
    doi?: string;
    pmid?: string;
    journal: string;
    year: number;
  }>;
}

interface ExplorerPanelProps {
  run?: ExplorerRun;
  onImportSelected: (refs: any[]) => void;
  onCreateClaimFromParagraph: (text: string) => void;
}

export function ExplorerPanel({ 
  run, 
  onImportSelected, 
  onCreateClaimFromParagraph 
}: ExplorerPanelProps) {
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());

  const toggleRefSelection = (refIndex: number) => {
    const newSelected = new Set(selectedRefs);
    if (newSelected.has(refIndex.toString())) {
      newSelected.delete(refIndex.toString());
    } else {
      newSelected.add(refIndex.toString());
    }
    setSelectedRefs(newSelected);
  };

  const handleImport = () => {
    if (!run) return;
    const refsToImport = run.refs.filter((_, index) => 
      selectedRefs.has(index.toString())
    );
    onImportSelected(refsToImport);
    setSelectedRefs(new Set());
  };

  if (!run) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No AI Explorer run available.</p>
        <p className="text-sm mt-2">Run the AI Explorer to generate unverified content.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">AI Explorer (Unverified)</h2>
        <div className="text-sm text-gray-500">
          Run ID: {run.runId.slice(0, 8)}...
        </div>
      </div>

      {run.outline && (
        <div>
          <h3 className="font-medium mb-2">Outline</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            {run.outline.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ol>
        </div>
      )}

      {run.narrative && (
        <div>
          <h3 className="font-medium mb-2">Narrative</h3>
          <div className="space-y-4">
            {run.narrative.map((section, index) => (
              <div key={index} className="border rounded p-3">
                <h4 className="font-medium text-sm mb-2">{section.section}</h4>
                <p className="text-sm text-gray-700 mb-2">{section.text}</p>
                <button
                  onClick={() => onCreateClaimFromParagraph(section.text)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Create Claim from Paragraph
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">References ({run.refs.length})</h3>
          {selectedRefs.size > 0 && (
            <button
              onClick={handleImport}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
            >
              Import Selected ({selectedRefs.size})
            </button>
          )}
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {run.refs.map((ref, index) => (
            <div
              key={index}
              className={`p-2 border rounded cursor-pointer transition-colors ${
                selectedRefs.has(index.toString())
                  ? 'bg-blue-50 border-blue-200'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => toggleRefSelection(index)}
            >
              <div className="text-sm font-medium">{ref.title}</div>
              <div className="text-xs text-gray-600">
                {ref.journal} ({ref.year})
              </div>
              {ref.doi && <div className="text-xs text-gray-500">DOI: {ref.doi}</div>}
              {ref.pmid && <div className="text-xs text-gray-500">PMID: {ref.pmid}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500 border-t pt-4">
        <p><strong>Note:</strong> This content is unverified and must go through the normal screening process.</p>
        <p>Imported references will appear as candidates in the screening queue.</p>
      </div>
    </div>
  );
}
