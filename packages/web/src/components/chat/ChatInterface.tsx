import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../../lib/chatApi';
import { ChatMessage } from '@the-scientist/schemas';
import { useToast } from '../../hooks/useToast';
import { MessageCircle, Send, Loader2, CheckCircle, AlertCircle, Download, FolderPlus } from 'lucide-react';

interface ChatInterfaceProps {
  sessionId: string;
  onImportToProject?: (sessionId: string) => void;
}

export function ChatInterface({ sessionId, onImportToProject }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showError } = useToast();
  const queryClient = useQueryClient();

  // Fetch chat session
  const { data: sessionData, isLoading, error } = useQuery({
    queryKey: ['chat-session', sessionId],
    queryFn: () => chatApi.getSession(sessionId),
    refetchInterval: 2000 // Poll every 2 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => chatApi.sendMessage(sessionId, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-session', sessionId] });
      setMessage('');
    },
    onError: (error: any) => {
      showError('Failed to send message', error.message);
    }
  });




  const session = sessionData?.session;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;

    setIsTyping(true);
    try {
      await sendMessageMutation.mutateAsync(message);
    } finally {
      setIsTyping(false);
    }
  };

  const handleImportToProject = () => {
    if (onImportToProject) {
      onImportToProject(sessionId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <MessageCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Getting started...';
      case 'waiting_user':
        return 'Waiting for your input';
      case 'running':
        return 'Generating your review...';
      case 'completed':
        return 'Review complete!';
      case 'failed':
        return 'Something went wrong';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading chat...</span>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <AlertCircle className="w-8 h-8 mr-2" />
        <span>Failed to load chat session</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          {getStatusIcon(session.status)}
          <div>
            <h3 className="font-medium text-gray-900">AI Review Assistant</h3>
            <p className="text-sm text-gray-500">{getStatusText(session.status)}</p>
          </div>
        </div>
        
        {session.status === 'completed' && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleImportToProject()}
              className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              Import to Project
            </button>
            <button className="flex items-center px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
              <Download className="w-4 h-4 mr-1" />
              Export
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {session.messages.map((msg: ChatMessage) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.role === 'system'
                  ? 'bg-gray-100 text-gray-700 text-sm'
                  : 'bg-gray-50 text-gray-900 border border-gray-200'
              }`}
            >
              <div className="prose prose-sm max-w-none">
                {msg.content.split('\n').map((line, i) => (
                  <p key={i} className={i === 0 ? 'mt-0' : ''}>
                    {line}
                  </p>
                ))}
              </div>
              <div className="text-xs opacity-70 mt-1">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                <span className="text-sm text-gray-600">Sending message...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {session.status !== 'completed' && session.status !== 'failed' && (
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sendMessageMutation.isPending}
            />
            <button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
