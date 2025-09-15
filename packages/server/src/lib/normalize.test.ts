import { describe, it, expect } from 'vitest';
import { 
  normalizeTitle, 
  normalizeDOI, 
  normalizePMID, 
  canonicalKey, 
  generateCanonicalHash,
  isDuplicateRecord,
  calculateRecordRichness
} from './normalize';
import { ProviderRecord } from '@the-scientist/schemas';

describe('normalize', () => {
  describe('normalizeTitle', () => {
    it('should normalize title correctly', () => {
      expect(normalizeTitle('COVID-19: A Global Pandemic')).toBe('covid19 a global pandemic');
      expect(normalizeTitle('  Multiple   Spaces  ')).toBe('multiple spaces');
      expect(normalizeTitle('Title with "quotes" and (parentheses)')).toBe('title with quotes and parentheses');
      expect(normalizeTitle('')).toBe('');
    });
  });

  describe('normalizeDOI', () => {
    it('should normalize DOI correctly', () => {
      expect(normalizeDOI('10.1000/182')).toBe('10.1000/182');
      expect(normalizeDOI('doi:10.1000/182')).toBe('10.1000/182');
      expect(normalizeDOI('https://doi.org/10.1000/182')).toBe('10.1000/182');
      expect(normalizeDOI('DOI:10.1000/182')).toBe('10.1000/182');
      expect(normalizeDOI('')).toBe('');
    });
  });

  describe('normalizePMID', () => {
    it('should normalize PMID correctly', () => {
      expect(normalizePMID('12345678')).toBe('12345678');
      expect(normalizePMID('  12345678  ')).toBe('12345678');
      expect(normalizePMID('')).toBe('');
    });
  });

  describe('canonicalKey', () => {
    it('should generate canonical key with DOI', () => {
      const record: ProviderRecord = {
        title: 'Test Title',
        year: 2023,
        doi: '10.1000/182',
        source: 'pubmed'
      };
      expect(canonicalKey(record)).toBe('doi:10.1000/182|year:2023');
    });

    it('should generate canonical key with PMID', () => {
      const record: ProviderRecord = {
        title: 'Test Title',
        year: 2023,
        pmid: '12345678',
        source: 'pubmed'
      };
      expect(canonicalKey(record)).toBe('pmid:12345678|year:2023');
    });

    it('should generate canonical key with title only', () => {
      const record: ProviderRecord = {
        title: 'Test Title',
        source: 'pubmed'
      };
      expect(canonicalKey(record)).toBe('title:test title');
    });
  });

  describe('generateCanonicalHash', () => {
    it('should generate consistent hash', () => {
      const record: ProviderRecord = {
        title: 'Test Title',
        year: 2023,
        doi: '10.1000/182',
        source: 'pubmed'
      };
      const hash1 = generateCanonicalHash(record);
      const hash2 = generateCanonicalHash(record);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });
  });

  describe('isDuplicateRecord', () => {
    it('should detect DOI duplicates', () => {
      const record1: ProviderRecord = {
        title: 'Title 1',
        doi: '10.1000/182',
        source: 'pubmed'
      };
      const record2: ProviderRecord = {
        title: 'Title 2',
        doi: '10.1000/182',
        source: 'crossref'
      };
      expect(isDuplicateRecord(record1, record2)).toBe(true);
    });

    it('should detect PMID duplicates', () => {
      const record1: ProviderRecord = {
        title: 'Title 1',
        pmid: '12345678',
        source: 'pubmed'
      };
      const record2: ProviderRecord = {
        title: 'Title 2',
        pmid: '12345678',
        source: 'pubmed'
      };
      expect(isDuplicateRecord(record1, record2)).toBe(true);
    });

    it('should not detect non-duplicates', () => {
      const record1: ProviderRecord = {
        title: 'Title 1',
        doi: '10.1000/182',
        source: 'pubmed'
      };
      const record2: ProviderRecord = {
        title: 'Title 2',
        doi: '10.1000/183',
        source: 'pubmed'
      };
      expect(isDuplicateRecord(record1, record2)).toBe(false);
    });
  });

  describe('calculateRecordRichness', () => {
    it('should calculate richness score correctly', () => {
      const minimalRecord: ProviderRecord = {
        title: 'Test Title',
        source: 'pubmed'
      };
      expect(calculateRecordRichness(minimalRecord)).toBe(10); // title only

      const richRecord: ProviderRecord = {
        title: 'Test Title',
        year: 2023,
        doi: '10.1000/182',
        pmid: '12345678',
        pmcid: 'PMC123456',
        abstract: 'This is an abstract',
        authors: ['Author 1', 'Author 2'],
        journal: 'Test Journal',
        meshTerms: [{ ui: 'D001', name: 'Test Term' }],
        source: 'pubmed'
      };
      expect(calculateRecordRichness(richRecord)).toBe(85); // 10+20+15+10+15+10+5+5+5
    });
  });
});
