export class LLMResponseError extends Error {
  constructor(public code: string, message: string, public raw: string) {
    super(message);
  }
}
