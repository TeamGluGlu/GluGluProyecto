// apps/api/src/schemas/movements.ts
import { z } from 'zod';
import { paginationQuery, paginationMetaSchema } from './common.js';


const movementTypes = ['IN','OUT'] as const;
const movementReasons = ['COMPRA','USO_PRODUCCION','MERMA','AJUSTE','DEVOLUCION'] as const;

export const createMovementSchema = z.object({
    item_id: z.number().int().positive(),
    lot_id: z.number().int().positive(),
    tipo: z.enum(movementTypes),
    cantidad: z.number().positive(),
    motivo: z.enum(movementReasons),
    ref_tipo: z.string().max(50).optional(),
    ref_id: z.number().int().optional(),
    turno_id: z.number().int().optional(),
    observacion: z.string().max(255).optional(),
});
// JSON Schema para Request Body
export const createMovementJsonSchema = {
    type: 'object',
    properties: {
        item_id: { type: 'number', description: 'ID del ítem' },
        lot_id: { type: 'number', description: 'ID del lote' },
        tipo: { type: 'string', enum: movementTypes, description: 'Tipo de movimiento' },
        cantidad: { type: 'number', description: 'Cantidad del movimiento' },
        motivo: { type: 'string', enum: movementReasons, description: 'Motivo del movimiento' },
        ref_tipo: { type: 'string', description: 'Tipo de referencia (opcional)' },
        ref_id: { type: 'number', description: 'ID de referencia (opcional)' },
        turno_id: { type: 'number', description: 'ID del turno (opcional)' },
        observacion: { type: 'string', description: 'Observación (opcional)' },
    },
    required: ['item_id', 'lot_id', 'tipo', 'cantidad', 'motivo'],
    additionalProperties: false
};


export const listMovementsQuery = paginationQuery.extend({
    item_id: z.coerce.number().int().positive().optional(),
    lot_id: z.coerce.number().int().positive().optional(),
    tipo: z.enum(movementTypes).optional(),
    motivo: z.enum(movementReasons).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    orderBy: z.enum(['fecha_hora','id']).default('fecha_hora'),
    orderDir: z.enum(['asc','desc']).default('desc'),
});
// JSON Schema para Query Params
export const listMovementsQueryJsonSchema = {
    type: 'object',
    properties: {
        item_id: { type: 'number', description: 'Filtro por ID de ítem' },
        lot_id: { type: 'number', description: 'Filtro por ID de lote' },
        tipo: { type: 'string', enum: movementTypes, description: 'Filtro por tipo' },
        motivo: { type: 'string', enum: movementReasons, description: 'Filtro por motivo' },
        from: { type: 'string', format: 'date', description: 'Fecha DESDE' },
        to: { type: 'string', format: 'date', description: 'Fecha HASTA' },
        orderBy: { type: 'string', enum: ['fecha_hora','id'], default: 'fecha_hora' },
        orderDir: { type: 'string', enum: ['asc','desc'], default: 'desc' },
        page: { type: 'number', default: 1 },
        pageSize: { type: 'number', default: 10, minimum: 1, maximum: 100 },
    }
};

export const movementBaseSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', description: 'ID del movimiento (BigInt serializado)' },
        item_id: { type: 'number' },
        lot_id: { type: 'number' },
        tipo: { type: 'string', enum: movementTypes },
        cantidad: { type: 'number' },
        motivo: { type: 'string', enum: movementReasons },
        ref_tipo: { type: 'string', nullable: true },
        ref_id: { type: 'number', nullable: true },
        turno_id: { type: 'number', nullable: true },
        observacion: { type: 'string', nullable: true },
        fecha_hora: { type: 'string', format: 'date-time' },
    }
};

export const movementListResponseSchema = {
    type: 'object',
    properties: {
        meta: paginationMetaSchema,
        data: {
            type: 'array',
            items: {
                ...movementBaseSchema,
                properties: {
                    ...movementBaseSchema.properties,
                    items: { type: 'object', properties: { id: { type: 'number' }, nombre: { type: 'string' }, unidad: { type: 'string' } } },
                    item_lots: { type: 'object', properties: { id: { type: 'number' }, lote_codigo: { type: 'string' }, fecha_ingreso: { type: 'string', format: 'date-time' } } },
                    shifts: { type: 'object', properties: { id: { type: 'number' }, fecha: { type: 'string', format: 'date' }, numero: { type: 'number' } } },
                }
            }
        }
    }
};