import { z } from "zod";

export const sourceCitation = z
  .object({
    doi: z.string().regex(/^10\.\d{4,9}\/[\-._;()/:A-Za-z0-9]+$/).optional(),
    pmid: z.string().regex(/^\d+$/).optional(),
    url: z.string().url().optional(),
    openAccess: z.boolean(),
    license: z.string().optional(),
    title: z.string().min(1),
    journal: z.string().min(1),
    year: z.number().int().min(1900).max(2100),
    authors: z.array(z.string().min(1)).min(1),
  })
  .superRefine((val, ctx) => {
    if (!val.doi && !val.pmid && !val.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of doi, pmid, or url is required",
      });
    }
  });
export type SourceCitation = z.infer<typeof sourceCitation>;

export const evidenceDecisionCard = z.object({
  sourceCitation: sourceCitation,
  decision: z.enum(["Keep", "Exclude", "Ask", "BetterOption"]),
  rationale: z.string().min(1).max(2000),
  journalSignal: z.number().int().min(0).max(3),
  studyType: z.string().optional(),
  outcomes: z.array(z.string()).optional(),
  biasNotes: z.string().optional(),
  strengthGrade: z.string().optional(),
  nextAction: z.string().optional(),
});
export type EvidenceDecisionCard = z.infer<typeof evidenceDecisionCard>;

export const schemas = {
  evidenceDecisionCard,
  sourceCitation,
};
export type Schemas = typeof schemas;
