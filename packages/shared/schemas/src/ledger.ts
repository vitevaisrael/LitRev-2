import { z } from 'zod';
import { UUIDSchema, LocatorSchema, TimestampSchema } from './common';

export const ClaimSchema = z.object({
  id: UUIDSchema,
  projectId: UUIDSchema,
  text: z.string().min(1),
  section: z.string().optional(),
  createdAt: TimestampSchema
}).strict();

export const SupportSchema = z.object({
  id: UUIDSchema,
  projectId: UUIDSchema,
  claimId: UUIDSchema,
  candidateId: UUIDSchema,
  quote: z.string().min(1),
  locator: LocatorSchema, // REQUIRED: {page: int ≥1, sentence: int ≥1}
  evidenceType: z.string().optional(),
  createdAt: TimestampSchema
}).strict();

export type Claim = z.infer<typeof ClaimSchema>;
export type Support = z.infer<typeof SupportSchema>;
