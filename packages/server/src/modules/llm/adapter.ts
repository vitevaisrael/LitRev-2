export interface LLMProvider {
  propose(candidateId: string, parsedText?: string): Promise<any>;
  generateExplorer(profile: any): Promise<any>;
  tighten(text: string): Promise<string>;
}

export interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens?: number;
}
