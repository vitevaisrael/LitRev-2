import { z } from 'zod';

export const PrismaCountersSchema = z.object({
  projectId: z.string().uuid(),
  identified: z.number().int().min(0),
  duplicates: z.number().int().min(0),
  screened: z.number().int().min(0),
  included: z.number().int().min(0),
  excluded: z.number().int().min(0)
}).strict();

export type PrismaCounters = z.infer<typeof PrismaCountersSchema>;
