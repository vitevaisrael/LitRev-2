import { LLMProvider } from '../llm/adapter';
import { OpenAIProvider } from '../llm/openai';
import { MockProvider } from '../llm/mock';
import { env } from '../../config/env';

export class Screener {
  private llmProvider: LLMProvider;

  constructor() {
    // Use OpenAI if API key is available, otherwise fall back to mock
    this.llmProvider = env.OPENAI_API_KEY 
      ? new OpenAIProvider() 
      : new MockProvider();
  }

  async propose(candidateId: string, parsedText?: string): Promise<any> {
    return this.llmProvider.propose(candidateId, parsedText);
  }
}

export const screener = new Screener();
