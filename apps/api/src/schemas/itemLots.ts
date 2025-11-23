// apps/api/src/schemas/itemLots.ts
import { z } from 'zod';
import { paginationQuery, paginationMetaSchema } from './common.js';

export const itemLotBaseSchema = {
    type: 'object',
    properties: {
        id: { type: 'number', description: 'ID del lote' },
        item_id: { type: 'number', description: 'ID del ítem' },
        lote_codigo: { type: 'string', description: 'Código del lote' },
        fecha_ingreso: { type: 'string', format: 'date-time', description: 'Fecha de ingreso' },
        costo_lote: { type: 'number', description: 'Costo total del lote' },
        cantidad_inicial: { type: 'number', description: 'Cantidad inicial' },
        stock_actual: { type: 'number', description: 'Stock actual (sólo en rutas de stock)' },
    }
};

export const createItemLotSchema = z.object({
    item_id: z.number().int().positive().describe('ID del ítem al que pertenece el lote'),
    lote_codigo: z.string().min(1).max(50).describe('Código único del lote'),
    fecha_ingreso: z.coerce.date().describe('Fecha de ingreso (ej: YYYY-MM-DD)'),
    costo_lote: z.coerce.number().nonnegative().describe('Costo total del lote'),
    cantidad_inicial: z.coerce.number().positive().describe('Cantidad inicial del lote'),
});
// JSON Schema para Request Body
export const createItemLotJsonSchema = {
    type: 'object',
    properties: {
        item_id: { type: 'number', description: 'ID del ítem al que pertenece el lote' },
        lote_codigo: { type: 'string', description: 'Código único del lote' },
        fecha_ingreso: { type: 'string', format: 'date', description: 'Fecha de ingreso (ej: YYYY-MM-DD)' },
        costo_lote: { type: 'number', format: 'double', description: 'Costo total del lote' },
        cantidad_inicial: { type: 'number', format: 'double', description: 'Cantidad inicial del lote' },
    },
    required: ['item_id', 'lote_codigo', 'fecha_ingreso', 'costo_lote', 'cantidad_inicial'],
    additionalProperties: false
};


export const updateItemLotSchema = createItemLotSchema.partial();
// JSON Schema para Partial Request Body
export const updateItemLotJsonSchema = {
    type: 'object',
    properties: createItemLotJsonSchema.properties,
    additionalProperties: false
};


export const listItemLotsQuery = paginationQuery.extend({
    item_id: z.coerce.number().int().positive().optional().describe('Filtro por ID de ítem'),
    search: z.string().trim().optional().describe('Búsqueda por lote_codigo (case-insensitive)'),
    from: z.coerce.date().optional().describe('Filtro: Fecha de ingreso DESDE (YYYY-MM-DD)'),
    to: z.coerce.date().optional().describe('Filtro: Fecha de ingreso HASTA (YYYY-MM-DD)'),
    orderBy: z.enum(['fecha_ingreso','lote_codigo','id']).default('fecha_ingreso').describe('Campo para ordenar'),
    orderDir: z.enum(['asc','desc']).default('desc').describe('Dirección de ordenamiento'),
});
// JSON Schema para Query Params
export const listItemLotsQueryJsonSchema = {
    type: 'object',
    properties: {
        item_id: { type: 'number', description: 'Filtro por ID de ítem' },
        search: { type: 'string', description: 'Búsqueda por lote_codigo' },
        from: { type: 'string', format: 'date', description: 'Fecha de ingreso DESDE' },
        to: { type: 'string', format: 'date', description: 'Fecha de ingreso HASTA' },
        orderBy: { type: 'string', enum: ['fecha_ingreso','lote_codigo','id'], default: 'fecha_ingreso' },
        orderDir: { type: 'string', enum: ['asc','desc'], default: 'desc' },
        page: { type: 'number', default: 1 },
        pageSize: { type: 'number', default: 10, minimum: 1, maximum: 100 },
    }
};

export const itemLotListResponseSchema = {
    type: 'object',
    properties: {
        meta: paginationMetaSchema,
        data: {
            type: 'array',
            items: {
                ...itemLotBaseSchema,
                properties: {
                    ...itemLotBaseSchema.properties,
                    items: { type: 'object', properties: { id: { type: 'number' }, nombre: { type: 'string' }, unidad: { type: 'string' }, tipo: { type: 'string' } } }
                }
            }
        }
    }
};