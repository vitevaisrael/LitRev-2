import { describe, it, expect } from 'vitest';
import { evidenceDecisionCard, sourceCitation } from '../src/zod/index.js';
// Fixtures (JSON modules resolved by tsconfig when running tests; not compiled by tsc build)
import decisionCards from '../src/fixtures/evidence-decision-card.sample.json';

describe('fixtures pass Zod parse', () => {
  it('evidence-decision-card fixtures are valid (Keep & Exclude)', () => {
    for (const card of decisionCards as unknown as Array<unknown>) {
      const parsed = evidenceDecisionCard.parse(card);
      expect(["Keep", "Exclude", "Ask", "BetterOption"]).toContain(parsed.decision);
    }
  });
});

describe('guardrails (failing cases)', () => {
  it('evidence-decision-card: journalSignal capped at 3', () => {
    const invalid = {
      ...(decisionCards as any)[0],
      journalSignal: 99
    };
    expect(() => evidenceDecisionCard.parse(invalid)).toThrow();
  });

  it('source-citation: requires at least one identifier (doi|pmid|url)', () => {
    const invalid = {
      openAccess: true,
      title: 'X',
      journal: 'Y',
      year: 2020,
      authors: ['Z']
    };
    expect(() => sourceCitation.parse(invalid)).toThrow();
  });
});
