// apps/api/src/schemas/common.ts
import { z } from 'zod';

export const paginationQuery = z.object({
    page: z.coerce.number().int().positive().default(1).describe('Número de página'),
    pageSize: z.coerce.number().int().min(1).max(100).default(10).describe('Tamaño de página'),
});

// JSON Schema para la metadata de paginación (útil para las respuestas)
export const paginationMetaSchema = {
    type: 'object',
    properties: {
        page: { type: 'number' },
        pageSize: { type: 'number' },
        total: { type: 'number' },
        totalPages: { type: 'number' },
    },
    required: ['page', 'pageSize', 'total', 'totalPages']
};

export type PaginationQuery = z.infer<typeof paginationQuery>;

export function toSkipTake(p: PaginationQuery) {
    const skip = (p.page - 1) * p.pageSize;
    const take = p.pageSize;
    return { skip, take };
}