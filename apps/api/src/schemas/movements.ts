// apps/api/src/schemas/movements.ts
import { z } from 'zod';
import { paginationQuery } from './common.js';


export const createMovementSchema = z.object({
    item_id: z.number().int().positive(),
    lot_id: z.number().int().positive(),
    tipo: z.enum(['IN','OUT']),
    cantidad: z.number().positive(),
    motivo: z.enum(['COMPRA','USO_PRODUCCION','MERMA','AJUSTE','DEVOLUCION']),
    ref_tipo: z.string().max(50).optional(),
    ref_id: z.number().int().optional(),
    turno_id: z.number().int().optional(),
    observacion: z.string().max(255).optional(),
});

export const listMovementsQuery = paginationQuery.extend({
    item_id: z.coerce.number().int().positive().optional(),
    lot_id: z.coerce.number().int().positive().optional(),
    tipo: z.enum(['IN','OUT']).optional(),
    motivo: z.enum(['COMPRA','USO_PRODUCCION','MERMA','AJUSTE','DEVOLUCION']).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    orderBy: z.enum(['fecha_hora','id']).default('fecha_hora'),
    orderDir: z.enum(['asc','desc']).default('desc'),
});
