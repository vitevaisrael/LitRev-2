import { z } from 'zod';

export const UUIDSchema = z.string().uuid();
// DOI must start with 10. and include a slash with non-empty suffix
export const DOISchema = z.string().regex(/^10\.\S+\/\S+$/);
// PMID: 1 to 8 digits
export const PMIDSchema = z.string().regex(/^\d{1,8}$/);

export const LocatorSchema = z.object({
  page: z.number().int().min(1),
  sentence: z.number().int().min(1)
}).strict();

export const ActionSchema = z.enum(["include", "exclude", "better", "ask"]);
export const StageSchema = z.enum(["title_abstract", "full_text"]);

export const TimestampSchema = z.union([z.string().datetime(), z.date()]);

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional()
}).strict();

export const PaginatedResponseSchema = <T>(itemSchema: z.ZodType<T>) =>
  z.object({
    ok: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      total: z.number(),
      page: z.number(),
      pageSize: z.number()
    })
  });
