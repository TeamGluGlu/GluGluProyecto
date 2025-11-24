// apps/api/src/routes/itemLots.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
    createItemLotJsonSchema, 
    listItemLotsQueryJsonSchema,
    itemLotBaseSchema,
    itemLotListResponseSchema,
    listItemLotsQuery
} from '../schemas/itemLots.js';
import { toSkipTake } from '../schemas/common.js';

const idParamJsonSchema = {
    type: 'object',
    properties: { id: { type: 'number', description: 'ID del lote' } },
    required: ['id']
};

export async function registerItemLotsRoutes(app: FastifyInstance, prisma: PrismaClient) {
    
    // ⚠️ CRÍTICO: Endpoint de Stock
    // HEMOS ELIMINADO 'response: { 200: ... }' AQUÍ PARA EVITAR EL ERROR 500
    app.get('/item-lots/stock', {
        schema: {
            description: 'OBTENER el stock actual de cada lote',
            tags: ['ItemLots', 'Stock'],
            querystring: listItemLotsQueryJsonSchema,
            // ¡OJO! No poner 'response' aquí para evitar errores de serialización con BigInt/Decimal
        }
    }, async (req, reply) => {
        try {
            const parsed = listItemLotsQuery.safeParse(req.query);
            if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
            const q = parsed.data;

            const { skip, take } = toSkipTake(q);

            let whereItemId = '';
            let whereSearch = '';
            
            if (q.item_id) {
                whereItemId = `AND il.item_id = ${q.item_id}`;
            }
            
            if (q.search) {
                const searchEscaped = q.search.replace(/'/g, "''");
                whereSearch = `AND il.lote_codigo ILIKE '%${searchEscaped}%'`;
            }

            // 1. Query principal
            const queryStr = `
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
              WHERE 1=1
                ${whereItemId}
                ${whereSearch}
              GROUP BY il.id, il.item_id, i.nombre, i.unidad, il.lote_codigo, il.fecha_ingreso
              HAVING COALESCE(SUM(
                  CASE WHEN im.tipo='IN' THEN im.cantidad
                       WHEN im.tipo='OUT' THEN -im.cantidad
                       ELSE 0 END
                ), 0) > 0
              ORDER BY il.fecha_ingreso DESC, il.lote_codigo ASC
              LIMIT ${take} OFFSET ${skip}
            `;

            const rawData = await prisma.$queryRawUnsafe<any[]>(queryStr);

            // 2. Calcular Total
            const countQueryStr = `
              SELECT COUNT(*) as total
              FROM (
                SELECT il.id
                FROM item_lots il
                JOIN items i ON i.id = il.item_id
                LEFT JOIN inventory_movements im ON im.lot_id = il.id AND im.item_id = il.item_id
                WHERE 1=1
                  ${whereItemId}
                  ${whereSearch}
                GROUP BY il.id
                HAVING COALESCE(SUM(
                    CASE WHEN im.tipo='IN' THEN im.cantidad
                         WHEN im.tipo='OUT' THEN -im.cantidad
                         ELSE 0 END
                  ), 0) > 0
              ) AS subquery
            `;
            
            const totalRows = await prisma.$queryRawUnsafe<any[]>(countQueryStr);
            const total = Number(totalRows?.[0]?.total || 0);

            // 3. Conversión segura
            const cleanData = rawData.map(row => ({
                item_id: Number(row.item_id),
                item_nombre: String(row.item_nombre || ''),
                item_unidad: String(row.item_unidad || 'UND'),
                lot_id: Number(row.lot_id),
                lote_codigo: String(row.lote_codigo || ''),
                fecha_ingreso: row.fecha_ingreso instanceof Date 
                    ? row.fecha_ingreso.toISOString()
                    : new Date(row.fecha_ingreso).toISOString(),
                stock_actual: Number(row.stock_actual) || 0 
            }));

            return reply.send({
                meta: {
                    page: q.page,
                    pageSize: q.pageSize,
                    total,
                    totalPages: Math.ceil(total / q.pageSize),
                },
                data: cleanData,
            });

        } catch (error) {
            app.log.error(error);
            return reply.code(500).send({ 
                message: "Error interno al obtener stock de lotes",
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });

    // Listar simple (items)
    app.get('/item-lots', {
        schema: {
            description: 'LISTAR lotes con stock, paginación y filtros',
            tags: ['ItemLots'],
            querystring: listItemLotsQueryJsonSchema,
            response: { 200: itemLotListResponseSchema }
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
                skip, take,
                include: { items: { select: { id: true, nombre: true, unidad: true, tipo: true } } }
            }),
        ]);
        return {
            meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) },
            data: rows,
        };
    });

    // Obtener uno por ID
    app.get('/item-lots/:id', {
        schema: {
            description: 'OBTENER un lote por ID',
            tags: ['ItemLots'],
            params: idParamJsonSchema,
            response: {
                200: { ...itemLotBaseSchema, properties: { ...itemLotBaseSchema.properties, items: { type: 'object', properties: { id: { type: 'number' }, nombre: { type: 'string' }, unidad: { type: 'string' }, tipo: { type: 'string' } } } } },
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

    // Crear Lote
    app.post('/item-lots', {
        schema: {
            description: 'CREAR un nuevo lote',
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
                const lot = await tx.item_lots.create({
                    data: {
                        item_id: parsed.data.item_id,
                        lote_codigo: parsed.data.lote_codigo,
                        fecha_ingreso: new Date(parsed.data.fecha_ingreso),
                        costo_lote: parsed.data.costo_lote,
                        cantidad_inicial: parsed.data.cantidad_inicial,
                    },
                });

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
}