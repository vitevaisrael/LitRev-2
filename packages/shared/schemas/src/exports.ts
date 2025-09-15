import { z } from 'zod';

export const ExportRequestSchema = z.object({
  format: z.enum(["docx", "bibtex", "prisma", "ledger"])
}).strict();

export type ExportRequest = z.infer<typeof ExportRequestSchema>;

// DOCX Export Options
export const ExportDocxOptionsSchema = z.object({
  includeSupports: z.boolean().optional().default(true),
  includePrisma: z.boolean().optional().default(true),
  includeProfile: z.boolean().optional().default(true),
  format: z.enum(["academic", "clinical", "summary"]).optional().default("academic")
}).strict();

// Export params (reusable for all export types)
export const ExportParamsSchema = z.object({
  id: z.string().uuid()
}).strict();

// Response schema for export status
export const ExportResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    filename: z.string(),
    size: z.number(),
    format: z.string()
  })
});

export type ExportDocxOptions = z.infer<typeof ExportDocxOptionsSchema>;
export type ExportParams = z.infer<typeof ExportParamsSchema>;
export type ExportResponse = z.infer<typeof ExportResponseSchema>;
