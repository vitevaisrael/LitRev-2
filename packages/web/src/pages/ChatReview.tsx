import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatStarter } from '../components/chat/ChatStarter';
import { ChatInterface } from '../components/chat/ChatInterface';
import { ArrowLeft, Plus } from 'lucide-react';

export function ChatReview() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSessionStarted = (newSessionId: string) => {
    setSessionId(newSessionId);
  };

  const handleStartNew = () => {
    setSessionId(null);
  };

  const handleImportToProject = (_sessionId: string) => {
    // For now, just show a message. In a real implementation, this would
    // open a project selection modal or redirect to project creation
    alert('Import to project functionality would be implemented here');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/projects')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Projects
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">
                AI Review Generator
              </h1>
            </div>
            
            {sessionId && (
              <button
                onClick={handleStartNew}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Review
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sessionId ? (
          <div className="max-w-4xl mx-auto">
            <ChatInterface 
              sessionId={sessionId} 
              onImportToProject={handleImportToProject}
            />
          </div>
        ) : (
          <ChatStarter onSessionStarted={handleSessionStarted} />
        )}
      </div>
    </div>
  );
}
