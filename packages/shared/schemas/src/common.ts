import { z } from 'zod';

export const UUIDSchema = z.string().uuid();
export const DOISchema = z.string().regex(/^10\.\S+$/);
export const PMIDSchema = z.string().regex(/^[0-9]+$/);

export const LocatorSchema = z.object({
  page: z.number().int().min(1),
  sentence: z.number().int().min(1)
}).strict();

export const ActionSchema = z.enum(["include", "exclude", "better", "ask"]);
export const StageSchema = z.enum(["title_abstract", "full_text"]);

export const TimestampSchema = z.string().datetime();

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
