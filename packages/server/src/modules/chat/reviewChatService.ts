import { prisma } from '../../lib/prisma';
import { OpenAIProvider } from '../llm/openai';
import { MockProvider } from '../llm/mock';
import { env } from '../../config/env';
import { getExplorerQueue } from '../explorer/queue';
import { ReviewArtifact } from '@the-scientist/schemas';

export interface ChatContext {
  topic: string;
  findings?: string;
  conversationHistory: Array<{ role: string; content: string }>;
  currentStatus: string;
}

export class ReviewChatService {
  private llmProvider: OpenAIProvider | MockProvider;

  constructor() {
    this.llmProvider = env.OPENAI_API_KEY ? new OpenAIProvider() : new MockProvider();
  }

  async startSession(topic: string, findings?: string): Promise<string> {
    // Create chat session
    const session = await prisma.chatSession.create({
      data: {
        topic,
        findings,
        status: 'pending'
      }
    });

    // Add initial system and assistant messages
    await prisma.chatMessage.createMany({
      data: [
        {
          sessionId: session.id,
          role: 'system',
          content: 'You are an AI assistant that helps researchers generate systematic reviews. You can ask clarifying questions about their research topic and then generate a complete review.'
        },
        {
          sessionId: session.id,
          role: 'assistant',
          content: `I'll help you generate a systematic review for: **${topic}**\n\n${findings ? `You mentioned: ${findings}\n\n` : ''}Let me ask a few clarifying questions to ensure I create the most relevant review for your needs.`
        }
      ]
    });

    // Check if topic needs clarification
    const needsClarification = this.needsClarification(topic, findings);
    
    if (needsClarification) {
      await this.askClarifyingQuestions(session.id, topic, findings);
    } else {
      await this.proceedWithReview(session.id, topic, findings);
    }

    return session.id;
  }

  async handleUserMessage(sessionId: string, message: string): Promise<void> {
    // Add user message
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: message
      }
    });

    // Get session and conversation history
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // If we were waiting for user input, try to proceed
    if (session.status === 'waiting_user') {
      const updatedTopic = this.extractUpdatedTopic(session.topic, session.findings, message);
      await this.proceedWithReview(sessionId, updatedTopic, session.findings || undefined);
    } else {
      // Handle as refinement or additional question
      await this.handleRefinement(sessionId, message, session);
    }
  }

  private needsClarification(topic: string, findings?: string): boolean {
    // Simple heuristic: if topic is very short or generic, ask for clarification
    const words = topic.split(' ').length;
    const isGeneric = ['research', 'study', 'review', 'analysis'].some(word => 
      topic.toLowerCase().includes(word)
    );
    
    return words < 4 || (words < 8 && isGeneric) || !findings;
  }

  private async askClarifyingQuestions(sessionId: string, topic: string, findings?: string): Promise<void> {
    const questions = this.generateClarifyingQuestions(topic, findings);
    
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'waiting_user' }
    });

    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: questions
      }
    });
  }

  private generateClarifyingQuestions(topic: string, findings?: string): string {
    const questions = [
      "**Population**: Who are the target participants? (e.g., adults with diabetes, children with ADHD)",
      "**Intervention**: What treatment or intervention are you studying? (e.g., medication, therapy, lifestyle changes)",
      "**Comparison**: What are you comparing it to? (e.g., placebo, standard care, another treatment)",
      "**Outcomes**: What outcomes are you most interested in? (e.g., mortality, quality of life, side effects)"
    ];

    return `To create the most relevant systematic review, I need a bit more detail about your research focus. Could you help me understand:

${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Please provide as much detail as you can for each of these areas. This will help me generate a more targeted and useful review.`;
  }

  private async proceedWithReview(sessionId: string, topic: string, findings?: string): Promise<void> {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'running' }
    });

    // Add assistant message about starting the review
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: `Perfect! I'll now generate a systematic review for your topic. This will involve:

1. **Planning** the review structure
2. **Searching** scholarly sources
3. **Drafting** the review content
4. **Finalizing** the complete review

This may take a few minutes. I'll keep you updated on the progress.`
      }
    });

    // Start the Explorer job (reuse existing backend)
    try {
      const queue = getExplorerQueue();
      const job = await queue.add('run', { 
        projectId: null, // Standalone review
        prompt: `${topic}${findings ? ` - ${findings}` : ''}`,
        model: env.OPENAI_API_KEY ? 'openai' : 'mock'
      });

      // Update session with job info
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { 
          status: 'running',
          // Store job ID in findings field temporarily
          findings: `job:${job.id}`
        }
      });

    } catch (error) {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { status: 'failed' }
      });

      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: `I encountered an error while starting the review generation: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
        }
      });
    }
  }

  private async handleRefinement(sessionId: string, message: string, session: any): Promise<void> {
    // Handle user refinements or additional questions
    const response = await this.generateRefinementResponse(message, session);
    
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: response
      }
    });
  }

  private async generateRefinementResponse(message: string, session: any): Promise<string> {
    // Simple response generation for refinements
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('import') || lowerMessage.includes('project')) {
      return `Once your review is complete, you'll be able to import the generated references into a project for further screening and analysis. The review will provide you with a structured outline and reference list that you can use as a starting point for your systematic review.`;
    }
    
    if (lowerMessage.includes('export') || lowerMessage.includes('download')) {
      return `After the review is generated, you'll be able to export it in various formats including markdown, PDF, and structured data. You can also import the references into your existing projects for further analysis.`;
    }
    
    if (lowerMessage.includes('status') || lowerMessage.includes('progress')) {
      return `The review generation is currently in progress. You can check the status by looking at the progress indicators. The process typically takes a few minutes to complete.`;
    }
    
    return `I understand you'd like to know more about: ${message}. Once the review generation is complete, I'll be able to provide more detailed information and help you with next steps.`;
  }

  private extractUpdatedTopic(originalTopic: string, findings: string | null, userMessage: string): string {
    // Simple extraction of updated topic from user response
    // In a more sophisticated implementation, this would use NLP
    return `${originalTopic} - ${userMessage}`;
  }

  async checkJobStatus(sessionId: string): Promise<{ status: string; runId?: string; artifact?: ReviewArtifact }> {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'running' && session.findings?.startsWith('job:')) {
      const jobId = session.findings.replace('job:', '');
      
      // Check job status
      const jobStatus = await prisma.jobStatus.findUnique({
        where: { jobId }
      });

      if (jobStatus?.status === 'completed' && jobStatus.progress && typeof jobStatus.progress === 'object' && 'runId' in jobStatus.progress) {
        // Get the ExplorerRun artifact
        const explorerRun = await prisma.explorerRun.findUnique({
          where: { runId: jobStatus.progress.runId as string }
        });

        if (explorerRun) {
          // Update session with completed status and runId
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { 
              status: 'completed',
              runId: explorerRun.runId,
              findings: null // Clear job reference
            }
          });

          // Add completion message
          await prisma.chatMessage.create({
            data: {
              sessionId,
              role: 'assistant',
              content: `🎉 **Review Complete!**\n\nI've successfully generated your systematic review. Here's what I've created:\n\n- **Structured outline** with key sections\n- **Narrative content** for each section\n- **Reference list** with scholarly sources\n\nYou can now import these references into a project for further screening, or export the complete review. Would you like me to help you with the next steps?`
            }
          });

          return {
            status: 'completed',
            runId: explorerRun.runId,
            artifact: explorerRun.output as ReviewArtifact
          };
        }
      }

      if (jobStatus?.status === 'failed') {
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { status: 'failed' }
        });

        await prisma.chatMessage.create({
          data: {
            sessionId,
            role: 'assistant',
            content: `I encountered an error while generating the review: ${jobStatus.error}. Please try again or let me know if you'd like to modify your topic.`
          }
        });

        return { status: 'failed' };
      }
    }

    return { status: session.status };
  }

  async importToProject(sessionId: string, projectId: string): Promise<void> {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || !session.runId) {
      throw new Error('Session not found or no review generated');
    }

    // Get the ExplorerRun
    const explorerRun = await prisma.explorerRun.findUnique({
      where: { runId: session.runId }
    });

    if (!explorerRun) {
      throw new Error('Review artifact not found');
    }

    // Update the ExplorerRun to be associated with the project
    await prisma.explorerRun.update({
      where: { runId: session.runId },
      data: { projectId }
    });

    // Update the chat session
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { projectId }
    });

    // Add success message
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: `✅ **Review imported successfully!**\n\nYour systematic review has been imported into the project. You can now:\n\n- Screen the imported references\n- Add evidence to your ledger\n- Continue with your systematic review workflow\n\nThe review is now part of your project and ready for further analysis.`
      }
    });
  }
}
