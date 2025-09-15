import { z } from "zod";

const sourceEnum = z.enum([
  "PubMed",
  "OpenAlex",
  "Crossref",
  "ClinicalTrials.gov",
  "Europe PMC",
  "Unpaywall",
]);

export const searchPlan = z
  .object({
    sources: z.array(sourceEnum).min(1).refine((items) => new Set(items).size === items.length, { message: 'Sources must be unique.' }),
    queries: z.array(z.string().min(1)).min(1),
    dateRange: z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
    inclusionCriteria: z.array(z.string()),
    exclusionCriteria: z.array(z.string()),
  })
  .superRefine((val, ctx) => {
    if (val.dateRange.from > val.dateRange.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dateRange.from must be <= dateRange.to",
        path: ["dateRange", "from"],
      });
    }
  });
export type SearchPlan = z.infer<typeof searchPlan>;

