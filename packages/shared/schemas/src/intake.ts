import { z } from 'zod';
import { UUIDSchema, TimestampSchema } from './common';

export const ProblemProfileSchema = z.object({
  id: UUIDSchema,
  projectId: UUIDSchema,
  version: z.string(),
  population: z.any(), // Json
  exposure: z.any(), // Json
  comparator: z.any(), // Json
  outcomes: z.any(), // Json
  timeframe: z.object({
    from: z.number().int(),
    to: z.number().int()
  }),
  mesh: z.any(), // Json
  include: z.any(), // Json
  exclude: z.any(), // Json
  notes: z.string().optional(),
  createdAt: TimestampSchema
}).strict();

export type ProblemProfile = z.infer<typeof ProblemProfileSchema>;
