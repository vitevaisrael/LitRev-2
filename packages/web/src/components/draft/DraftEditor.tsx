import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DraftEditorProps {
  projectId: string;
  section: string;
}

interface Support {
  id: string;
  quote: string;
  locator: string;
  claimId: string;
}

export function DraftEditor({ projectId, section }: DraftEditorProps) {
  const [content, setContent] = useState('');
  const [citations, setCitations] = useState<string[]>([]);
  const [showCitationPanel, setShowCitationPanel] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedOffset, setSelectedOffset] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const autosaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load draft section on mount
  const { data: draftData, isLoading } = useQuery({
    queryKey: ['draft', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/projects/${projectId}/draft`);
      const data = await response.json();
      return data.data;
    },
    enabled: !!projectId
  });

  // Find current section data
  const currentSection = draftData?.sections?.find((s: any) => s.section === section);

  // Initialize content when section data loads
  useEffect(() => {
    if (currentSection) {
      setContent(currentSection.content || '');
      setCitations(currentSection.citations || []);
    }
  }, [currentSection]);

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (data: { section: string; content: string; citations: string[] }) => {
      const response = await fetch(`/api/v1/projects/${projectId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Request failed');
      }
      
      return result;
    },
    onSuccess: () => {
      // Refetch draft data
      queryClient.invalidateQueries({ queryKey: ['draft', projectId] });
    },
    onError: (error: any) => {
      console.error('Failed to save draft:', error.message);
    }
  });

  // Autosave with debounce
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    
    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    
    // Set new timeout for autosave
    autosaveTimeoutRef.current = setTimeout(() => {
      saveDraftMutation.mutate({
        section,
        content: newContent,
        citations
      });
    }, 800);
  };

  // Handle text selection
  const handleTextSelection = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.substring(start, end);
      
      if (selected.trim()) {
        setSelectedText(selected);
        setSelectedOffset(start);
        setShowCitationPanel(true);
      }
    }
  };

  // Insert citation
  const handleInsertCitation = (supportId: string) => {
    const citationText = `[SUPPORT:${supportId}]`;
    const newContent = content.slice(0, selectedOffset) + citationText + content.slice(selectedOffset);
    
    setContent(newContent);
    setCitations([...citations, supportId]);
    setShowCitationPanel(false);
    setSelectedText('');
    
    // Trigger autosave
    handleContentChange(newContent);
  };

  // Fetch supports for citation panel
  const { data: supportsData } = useQuery({
    queryKey: ['supports', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/projects/${projectId}/ledger/supports`);
      const data = await response.json();
      return data.data;
    },
    enabled: showCitationPanel && !!projectId
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading draft...</div>
      </div>
    );
  }

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
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onMouseUp={handleTextSelection}
          className="w-full h-96 p-4 border-0 resize-none focus:outline-none"
          placeholder={`Write your ${section.toLowerCase()} here...`}
        />
      </div>

      {/* Citation Panel */}
      {showCitationPanel && (
        <div className="bg-blue-50 p-4 rounded-lg border">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-blue-900">Insert Citation</h3>
            <button
              onClick={() => setShowCitationPanel(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </div>
          
          <p className="text-sm text-blue-800 mb-3">
            Selected: "{selectedText}"
          </p>
          
          <div className="max-h-48 overflow-y-auto space-y-2">
            {supportsData?.supports?.map((support: Support) => (
              <div
                key={support.id}
                className="p-2 bg-white rounded border cursor-pointer hover:bg-gray-50"
                onClick={() => handleInsertCitation(support.id)}
              >
                <div className="text-sm font-medium text-gray-900">
                  {support.quote.length > 100 
                    ? `${support.quote.substring(0, 100)}...` 
                    : support.quote}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {support.locator}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          Citations: {citations.length} | 
          Words: {content.split(/\s+/).length} | 
          Characters: {content.length}
        </div>
        {saveDraftMutation.isPending && (
          <div className="text-blue-600">Saving...</div>
        )}
      </div>
    </div>
  );
}
