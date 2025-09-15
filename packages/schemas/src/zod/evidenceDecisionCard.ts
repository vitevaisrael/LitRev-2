import { z } from "zod";
import { sourceCitation } from "./sourceCitation";

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

