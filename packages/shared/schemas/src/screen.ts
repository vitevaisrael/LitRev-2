import { z } from 'zod';
import { ActionSchema, LocatorSchema, UUIDSchema, StageSchema } from './common';

export const ScreeningProposalSchema = z.object({
  action: ActionSchema,
  justification: z.string(),
  supports: z.array(z.object({
    quote: z.string(),
    locator: LocatorSchema
  })),
  quickRob: z.object({
    selection: z.string(),
    performance: z.string(),
    reporting: z.string()
  }),
  confidence: z.number().min(0).max(1)
}).strict();

export const DecideBodySchema = z.object({
  candidateId: UUIDSchema,
  action: ActionSchema,
  reason: z.string().optional(),
  justification: z.string().optional(),
  stage: StageSchema.optional()
}).refine((data) => {
  // Exclude requires reason
  if (data.action === "exclude" && !data.reason) {
    return false;
  }
  return true;
}, {
  message: "Reason is required when action is 'exclude'",
  path: ["reason"]
}).strict();

export const SupportCreateSchema = z.object({
  claimId: UUIDSchema,
  candidateId: UUIDSchema,
  quote: z.string().min(1),
  locator: LocatorSchema, // REQUIRED
  evidenceType: z.string().optional()
}).strict();

export type ScreeningProposal = z.infer<typeof ScreeningProposalSchema>;
export type DecideBody = z.infer<typeof DecideBodySchema>;
export type SupportCreate = z.infer<typeof SupportCreateSchema>;
