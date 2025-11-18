// apps/api/src/schemas/common.ts
import { z } from 'zod';

export const paginationQuery = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;

export function toSkipTake(p: PaginationQuery) {
    const skip = (p.page - 1) * p.pageSize;
    const take = p.pageSize;
    return { skip, take };
}
