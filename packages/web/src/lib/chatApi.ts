import { api } from './api';
import { 
  StartChatRequest, 
  SendMessageRequest, 
  ChatSession, 
  ReviewArtifact 
} from '@the-scientist/schemas';

export interface ChatStatus {
  status: string;
  runId?: string;
  artifact?: ReviewArtifact;
}

export const chatApi = {
  // Start a new chat session
  async startSession(data: StartChatRequest): Promise<{ sessionId: string }> {
    const response = await api.post('/chat/sessions', data);
    return response.data as { sessionId: string };
  },

  // Get a chat session with messages
  async getSession(sessionId: string): Promise<{ session: ChatSession }> {
    const response = await api.get(`/chat/sessions/${sessionId}`);
    return response.data as { session: ChatSession };
  },

  // Send a message to a chat session
  async sendMessage(sessionId: string, data: SendMessageRequest): Promise<{ session: ChatSession }> {
    const response = await api.post(`/chat/sessions/${sessionId}/messages`, data);
    return response.data as { session: ChatSession };
  },

  // Check job status for a session
  async checkStatus(sessionId: string): Promise<{ status: ChatStatus }> {
    const response = await api.get(`/chat/sessions/${sessionId}/status`);
    return response.data as { status: ChatStatus };
  },

  // Import review to a project
  async importToProject(sessionId: string, projectId: string): Promise<{ importedCount: number }> {
    const response = await api.post(`/chat/sessions/${sessionId}/import`, { projectId });
    return response.data as { importedCount: number };
  },

  // List user's chat sessions
  async listSessions(): Promise<{ sessions: ChatSession[] }> {
    const response = await api.get('/chat/sessions');
    return response.data as { sessions: ChatSession[] };
  }
};
