import { z } from 'zod';

export const ExportRequestSchema = z.object({
  format: z.enum(["docx", "bibtex", "prisma", "ledger"])
}).strict();

export type ExportRequest = z.infer<typeof ExportRequestSchema>;
