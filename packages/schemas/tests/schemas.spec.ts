import { describe, it, expect } from 'vitest';
import {
  evidenceDecisionCard,
  sourceCitation,
  alignmentPacket,
  prismaRecord,
  searchPlan,
  modelRouting,
} from '../src/zod/index.js';
import decisionCards from '../src/fixtures/evidence-decision-card.sample.json';
import alignmentFixture from '../src/fixtures/alignment-packet.sample.json';
import prismaFixture from '../src/fixtures/prisma-record.sample.json';
import searchPlanFixture from '../src/fixtures/search-plan.sample.json';
import modelRoutingFixture from '../src/fixtures/model-routing.sample.json';

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
  it('alignment-packet: topAnchors capped at 5', () => {
    const invalid = { ...alignmentFixture, topAnchors: ['a','b','c','d','e','f'] };
    expect(() => alignmentPacket.parse(invalid)).toThrow();
  });
  it('prisma-record: included + excluded <= afterFilters', () => {
    const invalid = { ...prismaFixture, included: 60, excluded: 30, afterFilters: 80 };
    expect(() => prismaRecord.parse(invalid)).toThrow();
  });
  it('search-plan: from <= to', () => {
    const invalid = { ...searchPlanFixture, dateRange: { from: '2025-01-02', to: '2025-01-01' } };
    expect(() => searchPlan.parse(invalid)).toThrow();
  });
  it('model-routing: confidence in [0,1]', () => {
    const invalid = { ...modelRoutingFixture, confidence: 1.5 };
    expect(() => modelRouting.parse(invalid)).toThrow();
  });
});

describe('new fixtures pass Zod parse', () => {
  it('alignment-packet fixture is valid', () => {
    alignmentPacket.parse(alignmentFixture);
  });
  it('prisma-record fixture is valid', () => {
    prismaRecord.parse(prismaFixture);
  });
  it('search-plan fixture is valid', () => {
    searchPlan.parse(searchPlanFixture);
  });
  it('model-routing fixture is valid', () => {
    modelRouting.parse(modelRoutingFixture);
  });
});
