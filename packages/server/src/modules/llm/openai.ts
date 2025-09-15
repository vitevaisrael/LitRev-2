import OpenAI from 'openai';
import { z } from 'zod';
import { ScreeningProposalSchema } from '@the-scientist/schemas';
import { LLMProvider, LLMConfig } from './adapter';
import { env } from '../../config/env';

class LLMResponseError extends Error {
  constructor(public code: string, message: string, public raw: string) {
    super(message);
  }
}

const ExplorerResponseSchema = z.object({
  outline: z.array(z.string()).optional(),
  narrative: z.array(z.object({
    section: z.string(),
    text: z.string(),
    refs: z.array(z.object({
      doi: z.string().optional(),
      pmid: z.string().optional()
    })).optional()
  })).optional(),
  refs: z.array(z.object({
    title: z.string(),
    doi: z.string().optional(),
    pmid: z.string().optional(),
    journal: z.string(),
    year: z.number().int()
  })).optional()
}).strict();

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private config: LLMConfig;

  constructor(config: Partial<LLMConfig> = {}) {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });
    this.config = {
      model: config.model || env.OPENAI_MODEL || 'gpt-5',
      temperature: config.temperature ?? env.OPENAI_TEMPERATURE ?? 0,
      maxTokens: config.maxTokens
    };
  }

  async propose(candidateId: string, parsedText?: string): Promise<any> {
    const systemPrompt = `Screen this study for the profile: {ProblemProfile JSON}.
Use only the provided parsed text for quotes.
Output JSON: { action:"include|exclude|better|ask", justification, supports:[{quote, locator:{page, sentence}}], quickRob:{selection,performance,reporting}, confidence:0..1 }.
Do not invent quotes. If none found, set supports:[] and choose ask or better.`;

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Candidate ID: ${candidateId}\nParsed Text: ${parsedText || 'No parsed text available'}` }
      ],
      temperature: this.config.temperature,
      response_format: { type: 'json_object' }
    });

    const raw = response.choices[0].message.content || '{}';
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new LLMResponseError('INVALID_JSON', 'Failed to parse JSON response', raw);
    }
    const parsed = ScreeningProposalSchema.safeParse(json);
    if (!parsed.success) {
      throw new LLMResponseError('INVALID_SHAPE', parsed.error.message, raw);
    }
    return parsed.data;
  }

  async generateExplorer(profile: any): Promise<any> {
    const prompt = `Generate an unverified sectioned review outline + draft paragraphs and a reference list for ${profile.topic}.
Provide DOI or PMID for each reference; scholarly sources only.
Output JSON { outline:[...], narrative:[{section,text,refs:[{doi?,pmid?}]}], refs:[{title,doi?,pmid?,journal,year}] }.
Do not fabricate identifiers; omit if unknown.`;

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: this.config.temperature,
      response_format: { type: 'json_object' }
    });

    const raw = response.choices[0].message.content || '{}';
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new LLMResponseError('INVALID_JSON', 'Failed to parse JSON response', raw);
    }
    const parsed = ExplorerResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new LLMResponseError('INVALID_SHAPE', parsed.error.message, raw);
    }
    return parsed.data;
  }

  async tighten(text: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'user', content: `Tighten this text without adding new facts: ${text}` }
      ],
      temperature: this.config.temperature
    });

    return response.choices[0].message.content || text;
  }
}
