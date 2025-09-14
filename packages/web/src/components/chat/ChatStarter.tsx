import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatApi } from '../../lib/chatApi';
import { useToast } from '../../hooks/useToast';
import { MessageCircle, Sparkles, Loader2 } from 'lucide-react';

interface ChatStarterProps {
  onSessionStarted: (sessionId: string) => void;
}

export function ChatStarter({ onSessionStarted }: ChatStarterProps) {
  const [topic, setTopic] = useState('');
  const [findings, setFindings] = useState('');
  const { showError } = useToast();

  const startSessionMutation = useMutation({
    mutationFn: (data: { topic: string; findings?: string }) => chatApi.startSession(data),
    onSuccess: (data) => {
      onSessionStarted(data.sessionId);
    },
    onError: (error: any) => {
      showError('Failed to start chat session', error.message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    await startSessionMutation.mutateAsync({
      topic: topic.trim(),
      findings: findings.trim() || undefined
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Review Generator
        </h1>
        <p className="text-lg text-gray-600">
          Generate a complete systematic review through conversation with our AI assistant
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
              Research Topic *
            </label>
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Effectiveness of cognitive behavioral therapy for anxiety disorders"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Describe the main focus of your systematic review
            </p>
          </div>

          <div>
            <label htmlFor="findings" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Context (Optional)
            </label>
            <textarea
              id="findings"
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="e.g., Focus on randomized controlled trials, adult populations, primary outcomes of symptom reduction"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              Any specific requirements, populations, or outcomes you want to focus on
            </p>
          </div>

          <button
            type="submit"
            disabled={!topic.trim() || startSessionMutation.isPending}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {startSessionMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Starting conversation...
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5 mr-2" />
                Start AI Conversation
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">How it works</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>1. <strong>Clarify your topic</strong> - The AI will ask questions to better understand your research focus</p>
            <p>2. <strong>Generate the review</strong> - AI searches scholarly sources and creates structured content</p>
            <p>3. <strong>Import or export</strong> - Use the generated references in your project or export the complete review</p>
          </div>
        </div>
      </div>
    </div>
  );
}
