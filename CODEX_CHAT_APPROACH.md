# Message for Codex: Chat Interface Implementation Strategy

## Context

We've decided to implement AI review generation in two phases:

1. **Phase 1 (Current)**: You're implementing the backend foundation with real PubMed integration, BullMQ job queues, and proper LLM integration
2. **Phase 2 (Future)**: I'll implement a conversational chat interface on top of your backend

## What We Want You to Prepare For

When implementing the backend foundation, please design it with the future chat interface in mind:

### 1. **Flexible Input Handling**
- Make the Explorer system accept both structured input (ProblemProfile) AND free-form topic strings
- Design the LLM prompts to handle both detailed PICO profiles and simple topic descriptions
- Ensure the system can ask clarifying questions and refine topics iteratively

### 2. **Session-Based Architecture**
- Consider how your ExplorerRun model could be extended to support chat sessions
- Design the job status system to handle multi-step conversations (not just single runs)
- Think about how to store intermediate results and conversation context

### 3. **Tool Integration Pattern**
- Design your review generation as a "tool" that can be called by a chat orchestrator
- Make the LLM integration modular so it can be called from both direct API calls and chat flows
- Ensure error handling and retry logic works in both contexts

### 4. **State Management**
- Design your job status system to handle states like "waiting_for_user_input" or "clarification_needed"
- Consider how to pause and resume jobs based on user responses
- Plan for storing conversation history and context

## Specific Implementation Notes

### Backend Design Considerations:
```typescript
// Make your Explorer service flexible for both direct and chat use
interface ExplorerService {
  generateReview(input: ExplorerInput): Promise<ExplorerResult>;
  // Future: generateReviewWithChat(sessionId: string, input: ChatInput): Promise<ChatResult>;
}

// Design job status to support chat states
interface JobStatus {
  status: 'pending' | 'running' | 'waiting_user' | 'completed' | 'failed';
  // Future: conversationContext?: ChatContext;
}
```

### API Design:
- Keep your current endpoints as-is
- Design them to be easily extended with chat-specific versions later
- Consider adding optional parameters for conversation context

### Database Schema:
- Your current ExplorerRun model is good
- Consider adding optional fields for chat session references
- Design indexes to support both direct runs and chat-based runs

## What I'll Implement Later

The chat interface will add:
- Conversational UI for topic refinement
- AI assistant that asks clarifying questions
- Session management and message history
- Integration with your existing Explorer backend
- Seamless import to project workflow

## Key Benefits of This Approach

1. **Solid Foundation**: Your backend work provides robust PubMed integration and LLM handling
2. **Incremental Enhancement**: Chat interface builds on proven backend without disruption
3. **Reusable Components**: Your Explorer service can be used by both direct API and chat interface
4. **Future-Proof**: Design decisions now support both use cases

## Questions for You

1. How are you handling topic refinement in your current implementation?
2. Are you planning to support multi-step review generation (planning → browsing → drafting)?
3. How will you handle cases where the topic is too vague or needs clarification?

Please proceed with your backend implementation, keeping these chat interface considerations in mind. The chat interface will be a natural extension of your work, not a replacement.
