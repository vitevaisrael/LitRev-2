import { z } from "zod";

export const modelRouting = z.object({
  chosenModel: z.enum(["general-small", "general-large", "domain-expert"]),
  confidence: z.number().min(0).max(1),
  escalate: z.boolean(),
  notes: z.string().optional(),
});
export type ModelRouting = z.infer<typeof modelRouting>;

