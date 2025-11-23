// apps/api/src/routes/itemLots.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
    createItemLotSchema, 
    updateItemLotSchema, 
    listItemLotsQuery, 
    createItemLotJsonSchema, 
    updateItemLotJsonSchema, 
    listItemLotsQueryJsonSchema,
    itemLotBaseSchema,
    itemLotListResponseSchema
} from '../schemas/itemLots.js';
import { toSkipTake, paginationMetaSchema } from '../schemas/common.js';

const idParamSchema = z.object({
    id: z.coerce.number().int().positive()
});
const idParamJsonSchema = {
    type: 'object',
    properties: { id: { type: 'number', description: 'ID del lote' } },
    required: ['id']
};
// Schema de respuesta para la ruta de Stock por lote
const itemLotStockResponse = {
    type: 'object',
    properties: {
        meta: paginationMetaSchema,
        data: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    item_id: { type: 'number' },
                    item_nombre: { type: 'string' },
                    item_unidad: { type: 'string' },
                    lot_id: { type: 'number' },
                    lote_codigo: { type: 'string' },
                    fecha_ingreso: { type: 'string', format: 'date-time' },
                    stock_actual: { type: 'number', description: 'Stock calculado (BigInt serializado a string/number)' }
                }
            }
        }
    }
};

export async function registerItemLotsRoutes(app: FastifyInstance, prisma: PrismaClient) {
    // Listar con paginación y filtros
    app.get('/item-lots', {
        schema: {
            description: 'LISTAR lotes con stock, paginación y filtros',
            tags: ['ItemLots'],
            querystring: listItemLotsQueryJsonSchema,
            response: {
                200: itemLotListResponseSchema
            }
        }
    }, async (req, reply) => {
        const parsed = listItemLotsQuery.safeParse(req.query);
        if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
        const q = parsed.data;

        const where: any = {};
        if (q.item_id) where.item_id = q.item_id;
        if (q.search) where.lote_codigo = { contains: q.search, mode: 'insensitive' };
        if (q.from || q.to) {
            where.fecha_ingreso = {};
            if (q.from) (where.fecha_ingreso as any).gte = q.from;
            if (q.to) (where.fecha_ingreso as any).lte = q.to;
        }

        const { skip, take } = toSkipTake(q);
        const [total, rows] = await Promise.all([
            prisma.item_lots.count({ where }),
            prisma.item_lots.findMany({
                where,
                orderBy: { [q.orderBy]: q.orderDir },
                skip,
                take,
                include: {
                    items: { select: { id: true, nombre: true, unidad: true, tipo: true } }
                }
            }),
        ]);

        return {
            meta: {
                page: q.page,
                pageSize: q.pageSize,
                total,
                totalPages: Math.ceil(total / q.pageSize),
            },
            data: rows,
        };
    });

    // Obtener uno
    app.get('/item-lots/:id', {
        schema: {
            description: 'OBTENER un lote por ID',
            tags: ['ItemLots'],
            params: idParamJsonSchema,
            response: {
                200: {
                    ...itemLotBaseSchema,
                    properties: {
                        ...itemLotBaseSchema.properties,
                        items: { type: 'object', properties: { id: { type: 'number' }, nombre: { type: 'string' }, unidad: { type: 'string' }, tipo: { type: 'string' } } }
                    }
                },
                404: { type: 'object', properties: { message: { type: 'string' } } }
            }
        }
    }, async (req, reply) => {
        const id = z.coerce.number().int().positive().parse((req.params as any).id);
        const row = await prisma.item_lots.findUnique({
            where: { id },
            include: { items: { select: { id: true, nombre: true, unidad: true, tipo: true } } }
        });
        if (!row) return reply.code(404).send({ message: 'Lote no encontrado' });
        return row;
    });

    // Crear (respeta UNIQUE item_id + lote_codigo) + Movimiento IN inicial
    app.post('/item-lots', {
        schema: {
            description: 'CREAR un nuevo lote y su movimiento de inventario inicial',
            tags: ['ItemLots'],
            body: createItemLotJsonSchema,
            response: {
                201: itemLotBaseSchema,
                400: { type: 'object', properties: { message: { type: 'string' } } },
                409: { type: 'object', properties: { message: { type: 'string' } } },
            }
        }
    }, async (req, reply) => {
        const CreateLotSchema = z.object({
            item_id: z.number().int().positive(),
            lote_codigo: z.string().min(1).max(50),
            fecha_ingreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            costo_lote: z.number().min(0),
            cantidad_inicial: z.number().min(0),
        });

        const parsed = CreateLotSchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send(parsed.error.flatten());

        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1) Crear lote
                const lot = await tx.item_lots.create({
                    data: {
                        item_id: parsed.data.item_id,
                        lote_codigo: parsed.data.lote_codigo,
                        fecha_ingreso: new Date(parsed.data.fecha_ingreso),
                        costo_lote: parsed.data.costo_lote,
                        cantidad_inicial: parsed.data.cantidad_inicial,
                    },
                });

                // 2) Crear movimiento IN inicial sólo si hay cantidad > 0
                if (parsed.data.cantidad_inicial > 0) {
                    await tx.inventory_movements.create({
                        data: {
                            item_id: parsed.data.item_id,
                            lot_id: lot.id,
                            fecha_hora: new Date(parsed.data.fecha_ingreso),
                            tipo: 'IN',
                            motivo: 'COMPRA',
                            cantidad: parsed.data.cantidad_inicial,
                        },
                    });
                }

                return lot;
            });

            return reply.code(201).send(result);
        } catch (err: any) {
            if (err?.code === 'P2002') {
                return reply.code(409).send({ message: 'Lote duplicado (item_id + lote_codigo debe ser único)' });
            }
            throw err;
        }
    });

    // Actualizar
    app.put('/item-lots/:id', {
        schema: {
            description: 'ACTUALIZAR un lote existente por ID',
            tags: ['ItemLots'],
            params: idParamJsonSchema,
            body: updateItemLotJsonSchema,
            response: {
                200: itemLotBaseSchema,
                404: { type: 'object', properties: { message: { type: 'string' } } }
            }
        }
    }, async (req, reply) => {
        const id = z.coerce.number().int().positive().parse((req.params as any).id);
        const body = updateItemLotSchema.safeParse(req.body);
        if (!body.success) return reply.code(400).send(body.error.flatten());
        try {
            const updated = await prisma.item_lots.update({ where: { id }, data: body.data });
            return updated;
        } catch {
            return reply.code(404).send({ message: 'Lote no encontrado' });
        }
    });

    // Eliminar (bloquear si hay movimientos asociados)
    app.delete('/item-lots/:id', {
        schema: {
            description: 'ELIMINAR un lote por ID (sólo si no tiene movimientos asociados)',
            tags: ['ItemLots'],
            params: idParamJsonSchema,
            response: {
                204: { type: 'null' },
                404: { type: 'object', properties: { message: { type: 'string' } } },
                409: { type: 'object', properties: { message: { type: 'string' } } }
            }
        }
    }, async (req, reply) => {
        const id = z.coerce.number().int().positive().parse((req.params as any).id);
        const deps = await prisma.inventory_movements.count({ where: { lot_id: id } });
        if (deps > 0) {
            return reply.code(409).send({ message: 'No se puede eliminar: el lote tiene movimientos' });
        }
        try {
            await prisma.item_lots.delete({ where: { id } });
            return reply.code(204).send();
        } catch {
            return reply.code(404).send({ message: 'Lote no encontrado' });
        }
    });

    // Stock por lote (raw query optimizada para PostgreSQL)
    app.get('/item-lots/stock', {
        schema: {
            description: 'OBTENER el stock actual de cada lote (calculado por raw query)',
            tags: ['ItemLots', 'Stock'],
            querystring: listItemLotsQueryJsonSchema,
            response: {
                200: itemLotStockResponse
            }
        }
    }, async (req, reply) => {
        const parsed = listItemLotsQuery.safeParse(req.query);
        if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
        const q = parsed.data;

        const { skip, take } = toSkipTake(q);

        // Usar Prisma's tagged template para queries seguras
        const data = await prisma.$queryRaw<any[]>`
          SELECT
            il.item_id,
            i.nombre AS item_nombre,
            i.unidad AS item_unidad,
            il.id AS lot_id,
            il.lote_codigo,
            il.fecha_ingreso,
            COALESCE(SUM(
              CASE WHEN im.tipo='IN' THEN im.cantidad
                   WHEN im.tipo='OUT' THEN -im.cantidad
                   ELSE 0 END
            ), 0) AS stock_actual
          FROM item_lots il
          JOIN items i ON i.id = il.item_id
          LEFT JOIN inventory_movements im ON im.lot_id = il.id AND im.item_id = il.item_id
          WHERE ${q.item_id ? prisma.$queryRaw`il.item_id = ${q.item_id}` : prisma.$queryRaw`TRUE`}
            AND ${q.search ? prisma.$queryRaw`il.lote_codigo ILIKE ${'%' + q.search + '%'}` : prisma.$queryRaw`TRUE`}
          GROUP BY il.id, il.item_id, i.nombre, i.unidad, il.lote_codigo, il.fecha_ingreso
          ORDER BY il.fecha_ingreso DESC, il.lote_codigo ASC
          LIMIT ${take} OFFSET ${skip}
        `;

        const totalRows = await prisma.$queryRaw<any[]>`
          SELECT COUNT(DISTINCT il.id) AS total
          FROM item_lots il
          WHERE ${q.item_id ? prisma.$queryRaw`il.item_id = ${q.item_id}` : prisma.$queryRaw`TRUE`}
            AND ${q.search ? prisma.$queryRaw`il.lote_codigo ILIKE ${'%' + q.search + '%'}` : prisma.$queryRaw`TRUE`}
        `;

        const total = Number(totalRows?.[0]?.total || 0);

        return {
            meta: {
                page: q.page,
                pageSize: q.pageSize,
                total,
                totalPages: Math.ceil(total / q.pageSize),
            },
            data,
        };
    });
}