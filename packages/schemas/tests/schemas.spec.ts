import { describe, it, expect } from 'vitest';
import { evidenceDecisionCard, sourceCitation } from '../src/zod/index.js';
import decisionCards from '../src/fixtures/evidence-decision-card.sample.json';

describe('fixtures pass Zod parse', () => {
  it('Keep & Exclude samples validate', () => {
    for (const card of decisionCards as any[]) {
      evidenceDecisionCard.parse(card);
    }
  });
});

describe('guardrails', () => {
  it('journalSignal capped at 3', () => {
    const invalid = { ...(decisionCards as any)[0], journalSignal: 99 };
    expect(() => evidenceDecisionCard.parse(invalid)).toThrow();
  });
  it('source-citation requires doi|pmid|url', () => {
    const invalid = { openAccess: true, title: 'X', journal: 'Y', year: 2020, authors: ['Z'] };
    expect(() => sourceCitation.parse(invalid)).toThrow();
  });
});
