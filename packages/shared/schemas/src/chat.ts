import { z } from 'zod';

// Chat session schemas
export const StartChatSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  findings: z.string().optional()
}).strict();

export const SendMessageSchema = z.object({
  message: z.string().min(1, 'Message is required')
}).strict();

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'tool', 'system']),
  content: z.string(),
  payload: z.any().optional(),
  createdAt: z.string().datetime()
}).strict();

export const ChatSessionSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  topic: z.string(),
  findings: z.string().optional(),
  status: z.enum(['pending', 'waiting_user', 'running', 'completed', 'failed']),
  runId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  messages: z.array(ChatMessageSchema)
}).strict();

// Review artifact schema (reused from explorer)
export const ReviewArtifactSchema = z.object({
  outline: z.array(z.string()),
  narrative: z.array(z.object({
    section: z.string(),
    text: z.string(),
    refs: z.array(z.object({
      doi: z.string().optional(),
      pmid: z.string().optional()
    }))
  })),
  refs: z.array(z.object({
    title: z.string(),
    doi: z.string().optional(),
    pmid: z.string().optional(),
    journal: z.string(),
    year: z.number().int()
  }))
}).strict();

export type StartChatRequest = z.infer<typeof StartChatSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatSession = z.infer<typeof ChatSessionSchema>;
export type ReviewArtifact = z.infer<typeof ReviewArtifactSchema>;
