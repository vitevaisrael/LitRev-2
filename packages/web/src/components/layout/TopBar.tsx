import { useState } from 'react';

interface TopBarProps {
  onRunExplorer: () => void;
  onExport: () => void;
}

export function TopBar({ onRunExplorer, onExport }: TopBarProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">The Scientist</h1>
        <span className="text-sm text-gray-500">Medical Literature Review</span>
      </div>
      
      <div className="flex items-center gap-4">
        <button
          onClick={onRunExplorer}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          AI Explorer
        </button>
        <button
          onClick={onExport}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Export
        </button>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="px-3 py-2 text-gray-600 hover:text-gray-900"
          title="Keyboard shortcuts"
        >
          ?
        </button>
      </div>
      
      {showHelp && (
        <div className="absolute top-16 right-6 bg-white border rounded-lg shadow-lg p-4 z-10">
          <h3 className="font-semibold mb-2">Keyboard Shortcuts</h3>
          <div className="text-sm space-y-1">
            <div><kbd className="bg-gray-100 px-1 rounded">1-5</kbd> Navigate steps</div>
            <div><kbd className="bg-gray-100 px-1 rounded">I</kbd> Include</div>
            <div><kbd className="bg-gray-100 px-1 rounded">X</kbd> Exclude</div>
            <div><kbd className="bg-gray-100 px-1 rounded">B</kbd> Better</div>
            <div><kbd className="bg-gray-100 px-1 rounded">A</kbd> Explorer</div>
            <div><kbd className="bg-gray-100 px-1 rounded">E</kbd> Export</div>
          </div>
        </div>
      )}
    </div>
  );
}
