import { useState } from 'react';

interface DraftEditorProps {
  section: string;
  content: string;
  citations?: Array<{
    offset: number;
    length: number;
    candidateId: string;
  }>;
  onChange: (content: string) => void;
  onInsertCitation: (offset: number, candidateId: string) => void;
}

export function DraftEditor({ 
  section, 
  content, 
  citations = [], 
  onChange, 
  onInsertCitation: _onInsertCitation 
}: DraftEditorProps) {
  const [selectedText, setSelectedText] = useState('');

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
    }
  };

  const handleInsertCitation = (candidateId: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const offset = range.startOffset;
      onChange(content.slice(0, offset) + `[${candidateId}]` + content.slice(offset));
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{section}</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">
            Suggest Citations
          </button>
          <button className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">
            Tighten
          </button>
          <button className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
            Coverage Check
          </button>
        </div>
      </div>

      <div className="border rounded-lg">
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onMouseUp={handleTextSelection}
          className="w-full h-96 p-4 border-0 resize-none focus:outline-none"
          placeholder={`Write your ${section.toLowerCase()} here...`}
        />
      </div>

      {selectedText && (
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-sm text-blue-800 mb-2">Selected: "{selectedText}"</p>
          <button
            onClick={() => handleInsertCitation('mock-candidate-id')}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
          >
            Insert Citation
          </button>
        </div>
      )}

      <div className="text-sm text-gray-600">
        Citations: {citations.length} | 
        Words: {content.split(/\s+/).length} | 
        Characters: {content.length}
      </div>
    </div>
  );
}
