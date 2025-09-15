import { describe, it, expect } from 'vitest';
import { alignmentPacket, evidenceDecisionCard, sourceCitation } from '../src/zod/index.js';
// Fixtures (JSON modules resolved by tsconfig when running tests; not compiled by tsc build)
import alignmentFixture from '../src/fixtures/alignment-packet.sample.json';
import decisionCards from '../src/fixtures/evidence-decision-card.sample.json';

describe('fixtures pass Zod parse', () => {
  it('alignment-packet fixture is valid', () => {
    const parsed = alignmentPacket.parse(alignmentFixture);
    expect(parsed.miniAbstract.length).toBeGreaterThan(0);
  });

  it('evidence-decision-card fixtures are valid (Keep & Exclude)', () => {
    for (const card of decisionCards as unknown as Array<unknown>) {
      const parsed = evidenceDecisionCard.parse(card);
      expect(["Keep", "Exclude", "Ask", "BetterOption"]).toContain(parsed.decision);
    }
  });
});

describe('guardrails (failing cases)', () => {
  it('alignment-packet: topAnchors capped at 5', () => {
    const tooManyAnchors = {
      ...alignmentFixture,
      topAnchors: ['a','b','c','d','e','f']
    };
    expect(() => alignmentPacket.parse(tooManyAnchors)).toThrow();
  });

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
      authors: [{ full: 'Z' }]
    };
    expect(() => sourceCitation.parse(invalid)).toThrow();
  });
});

