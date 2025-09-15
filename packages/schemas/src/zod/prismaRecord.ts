import { z } from "zod";

const dbEnum = z.enum([
  "PubMed",
  "OpenAlex",
  "Crossref",
  "ClinicalTrials.gov",
  "Europe PMC",
  "Unpaywall",
]);

export const prismaRecord = z
  .object({
    database: dbEnum,
    queryString: z.string().min(1),
    hits: z.number().int().min(0),
    afterFilters: z.number().int().min(0),
    included: z.number().int().min(0),
    excluded: z.number().int().min(0),
    excludedReasonCodes: z.array(z.string()).optional(),
    inclusionReason: z.string().optional(),
    dateRun: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.included + val.excluded > val.afterFilters) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "included + excluded must be <= afterFilters",
        path: ["included"],
      });
    }
    if (val.afterFilters > val.hits) {
      // afterFilters typically <= hits
      // not strictly required, but flag if inverted
      // We treat it as a soft error for guardrail purposes
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "afterFilters should be <= hits",
        path: ["afterFilters"],
      });
    }
  });
export type PrismaRecord = z.infer<typeof prismaRecord>;

