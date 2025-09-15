import { z } from "zod";

export const alignmentPacket = z.object({
  researchQuestion: z.string().optional(),
  miniAbstract: z.string().min(1).max(1200),
  outline: z.array(z.string()).min(1),
  topAnchors: z.array(z.string()).min(1).max(5),
  inclusionCriteria: z.array(z.string()),
  exclusionCriteria: z.array(z.string()),
  oaSources: z
    .array(
      z.enum([
        "PubMed",
        "OpenAlex",
        "Crossref",
        "ClinicalTrials.gov",
        "Europe PMC",
        "Unpaywall",
      ])
    )
    .min(1),
  searchPlanSummary: z.string(),
});
export type AlignmentPacket = z.infer<typeof alignmentPacket>;

