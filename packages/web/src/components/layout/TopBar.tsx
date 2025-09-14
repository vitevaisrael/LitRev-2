import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface TopBarProps {
  onRunExplorer: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function TopBar({ onRunExplorer, onExport, onImport }: TopBarProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">The Scientist</h1>
        <span className="text-sm text-gray-500">Medical Literature Review</span>
      </div>
      
      <div className="flex items-center gap-4">
        <button
          onClick={onImport}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Import
        </button>
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
        
        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-sm">{user?.name || user?.email}</span>
          </button>
          
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
              <div className="px-4 py-2 text-sm text-gray-700 border-b">
                <div className="font-medium">{user?.name || 'User'}</div>
                <div className="text-gray-500">{user?.email}</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
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
