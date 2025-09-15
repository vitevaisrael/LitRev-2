import { describe, it, expect } from 'vitest';
import { UUIDSchema, DOISchema, PMIDSchema, TimestampSchema } from './common';

describe('common schemas', () => {
  describe('UUIDSchema', () => {
    it('should validate valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ];

      for (const uuid of validUUIDs) {
        expect(() => UUIDSchema.parse(uuid)).not.toThrow();
      }
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-42661417400g',
        '',
        null,
        undefined
      ];

      for (const uuid of invalidUUIDs) {
        expect(() => UUIDSchema.parse(uuid)).toThrow();
      }
    });
  });

  describe('DOISchema', () => {
    it('should validate valid DOIs', () => {
      const validDOIs = [
        '10.1000/182',
        '10.1038/nature12373',
        '10.1371/journal.pone.0123456',
        '10.1000/182.123'
      ];

      for (const doi of validDOIs) {
        expect(() => DOISchema.parse(doi)).not.toThrow();
      }
    });

    it('should reject invalid DOIs', () => {
      const invalidDOIs = [
        'not-a-doi',
        '10.1000',
        '10.1000/',
        '/182',
        '',
        null,
        undefined
      ];

      for (const doi of invalidDOIs) {
        expect(() => DOISchema.parse(doi)).toThrow();
      }
    });
  });

  describe('PMIDSchema', () => {
    it('should validate valid PMIDs', () => {
      const validPMIDs = [
        '12345678',
        '98765432',
        '1',
        '99999999'
      ];

      for (const pmid of validPMIDs) {
        expect(() => PMIDSchema.parse(pmid)).not.toThrow();
      }
    });

    it('should reject invalid PMIDs', () => {
      const invalidPMIDs = [
        'not-a-pmid',
        '12345678a',
        '123456789', // Too long
        '',
        null,
        undefined
      ];

      for (const pmid of invalidPMIDs) {
        expect(() => PMIDSchema.parse(pmid)).toThrow();
      }
    });
  });

  describe('TimestampSchema', () => {
    it('should validate valid timestamps', () => {
      const validTimestamps = [
        new Date(),
        new Date('2023-01-01T00:00:00Z'),
        new Date('2023-12-31T23:59:59Z')
      ];

      for (const timestamp of validTimestamps) {
        expect(() => TimestampSchema.parse(timestamp)).not.toThrow();
      }
    });

    it('should reject invalid timestamps', () => {
      const invalidTimestamps = [
        'not-a-date',
        '2023-13-01', // Invalid month
        '2023-01-32', // Invalid day
        '',
        null,
        undefined
      ];

      for (const timestamp of invalidTimestamps) {
        expect(() => TimestampSchema.parse(timestamp)).toThrow();
      }
    });
  });
});
