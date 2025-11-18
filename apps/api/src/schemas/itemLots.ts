// apps/api/src/schemas/itemLots.ts
import { z } from 'zod';
import { paginationQuery } from './common.js';

export const createItemLotSchema = z.object({
    item_id: z.number().int().positive(),
    lote_codigo: z.string().min(1).max(50),
    fecha_ingreso: z.coerce.date(),                 // acepta 'YYYY-MM-DD'
    costo_lote: z.coerce.number().nonnegative(),
    cantidad_inicial: z.coerce.number().positive(),
});

export const updateItemLotSchema = createItemLotSchema.partial();

export const listItemLotsQuery = paginationQuery.extend({
    item_id: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),           // busca por lote_codigo
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    orderBy: z.enum(['fecha_ingreso','lote_codigo','id']).default('fecha_ingreso'),
    orderDir: z.enum(['asc','desc']).default('desc'),
});

    
