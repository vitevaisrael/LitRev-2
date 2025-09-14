import { useState } from 'react';
import { notifyError } from '../../lib/notify';

interface ExportCenterProps {
  projectId: string;
}

export function ExportCenter({ projectId }: ExportCenterProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = async (type: 'markdown' | 'bibtex' | 'prisma' | 'ledger') => {
    setIsExporting(type);
    
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/exports/${type}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `export.${type === 'prisma' ? 'svg' : type === 'ledger' ? 'json' : type}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error(`Failed to export ${type}:`, error);
      notifyError(`Failed to export ${type}. Please try again.`);
    } finally {
      setIsExporting(null);
    }
  };

  const exportButtons = [
    {
      type: 'markdown' as const,
      title: 'Markdown Report',
      description: 'Complete systematic review report in Markdown format with draft sections and references',
      icon: '📝',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      type: 'bibtex' as const,
      title: 'BibTeX References',
      description: 'Bibliography file with all included studies in BibTeX format',
      icon: '📚',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      type: 'prisma' as const,
      title: 'PRISMA Diagram',
      description: 'PRISMA flow diagram showing screening process and study counts',
      icon: '📊',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      type: 'ledger' as const,
      title: 'Evidence Ledger',
      description: 'Complete evidence ledger with claims, supports, and candidate metadata in JSON format',
      icon: '📋',
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Center</h2>
        <p className="text-gray-600">
          Export your systematic review data in various formats for further analysis or publication.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportButtons.map((button) => (
          <div
            key={button.type}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start space-x-4">
              <div className="text-3xl">{button.icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {button.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {button.description}
                </p>
                <button
                  onClick={() => handleExport(button.type)}
                  disabled={isExporting === button.type}
                  className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${button.color} ${
                    isExporting === button.type ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isExporting === button.type ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Exporting...
                    </span>
                  ) : (
                    `Export ${button.title}`
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Export Information</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Markdown:</strong> Includes problem profile, draft sections, and formatted references</li>
          <li>• <strong>BibTeX:</strong> Contains all included studies with DOI and PMID information</li>
          <li>• <strong>PRISMA:</strong> Visual flow diagram showing current screening statistics</li>
          <li>• <strong>Ledger:</strong> Complete evidence structure with claims, supports, and candidate details</li>
        </ul>
      </div>
    </div>
  );
}
