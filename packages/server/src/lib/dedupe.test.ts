import { describe, it, expect } from 'vitest';
import { dedupe, validateDedupeResult, getDedupeStats } from './dedupe';
import { ProviderRecord } from '@the-scientist/schemas';

describe('dedupe', () => {
  const createTestRecord = (overrides: Partial<ProviderRecord> = {}): ProviderRecord => ({
    title: 'Test Title',
    source: 'pubmed',
    ...overrides
  });

  describe('dedupe', () => {
    it('should handle empty array', () => {
      const result = dedupe([]);
      expect(result.unique).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
      expect(result.stats.total).toBe(0);
    });

    it('should deduplicate by DOI', () => {
      const records = [
        createTestRecord({ doi: '10.1000/182', title: 'Title 1' }),
        createTestRecord({ doi: '10.1000/182', title: 'Title 2' }),
        createTestRecord({ doi: '10.1000/183', title: 'Title 3' })
      ];

      const result = dedupe(records);
      expect(result.unique).toHaveLength(2);
      expect(result.duplicates).toHaveLength(1);
      expect(result.stats.total).toBe(3);
      expect(result.stats.unique).toBe(2);
      expect(result.stats.duplicates).toBe(1);
    });

    it('should deduplicate by PMID', () => {
      const records = [
        createTestRecord({ pmid: '12345678', title: 'Title 1' }),
        createTestRecord({ pmid: '12345678', title: 'Title 2' }),
        createTestRecord({ pmid: '87654321', title: 'Title 3' })
      ];

      const result = dedupe(records);
      expect(result.unique).toHaveLength(2);
      expect(result.duplicates).toHaveLength(1);
    });

    it('should pick richer record when deduplicating', () => {
      const records = [
        createTestRecord({ 
          doi: '10.1000/182', 
          title: 'Title 1',
          abstract: 'This is an abstract'
        }),
        createTestRecord({ 
          doi: '10.1000/182', 
          title: 'Title 2'
        })
      ];

      const result = dedupe(records);
      expect(result.unique).toHaveLength(1);
      expect(result.unique[0].title).toBe('Title 1'); // Richer record
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].duplicates[0].title).toBe('Title 2');
    });

    it('should handle records without IDs', () => {
      const records = [
        createTestRecord({ title: 'Title 1' }),
        createTestRecord({ title: 'Title 2' }),
        createTestRecord({ title: 'Title 3' })
      ];

      const result = dedupe(records);
      expect(result.unique).toHaveLength(3);
      expect(result.duplicates).toHaveLength(0);
    });

    it('should deduplicate by canonical hash', () => {
      const records = [
        createTestRecord({ 
          title: 'COVID-19: A Global Pandemic',
          year: 2023
        }),
        createTestRecord({ 
          title: 'COVID-19: A Global Pandemic', // Same normalized title
          year: 2023
        }),
        createTestRecord({ 
          title: 'Different Title',
          year: 2023
        })
      ];

      const result = dedupe(records);
      expect(result.unique).toHaveLength(2);
      expect(result.duplicates).toHaveLength(1);
    });
  });

  describe('validateDedupeResult', () => {
    it('should validate correct result', () => {
      const records = [
        createTestRecord({ doi: '10.1000/182' }),
        createTestRecord({ doi: '10.1000/183' })
      ];

      const result = dedupe(records);
      expect(validateDedupeResult(result)).toBe(true);
    });

    it('should detect invalid result', () => {
      const invalidResult = {
        unique: [createTestRecord({ doi: '10.1000/182' })],
        duplicates: [],
        stats: {
          total: 1,
          unique: 1,
          duplicates: 0,
          duplicateGroups: 0
        }
      };

      // This should be valid, but let's test with a truly invalid one
      const trulyInvalidResult = {
        unique: [createTestRecord({ doi: '10.1000/182' })],
        duplicates: [],
        stats: {
          total: 2, // Wrong total
          unique: 1,
          duplicates: 0,
          duplicateGroups: 0
        }
      };

      expect(validateDedupeResult(trulyInvalidResult)).toBe(false);
    });
  });

  describe('getDedupeStats', () => {
    it('should calculate stats correctly', () => {
      const records = [
        createTestRecord({ doi: '10.1000/182' }),
        createTestRecord({ doi: '10.1000/182' }), // Duplicate
        createTestRecord({ doi: '10.1000/183' })
      ];

      const result = dedupe(records);
      const stats = getDedupeStats(result);

      expect(stats.totalRecords).toBe(3);
      expect(stats.uniqueRecords).toBe(2);
      expect(stats.duplicateRecords).toBe(1);
      expect(stats.duplicateGroups).toBe(1);
      expect(stats.deduplicationRate).toBe(33.33);
    });

    it('should handle zero total records', () => {
      const result = dedupe([]);
      const stats = getDedupeStats(result);

      expect(stats.deduplicationRate).toBe(0);
    });
  });
});
