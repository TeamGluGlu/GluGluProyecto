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
    
    // ⚠️ CRÍTICO: Endpoint de Stock con DEBUGGING MEJORADO
    app.get('/item-lots/stock', {
        schema: {
            description: 'OBTENER el stock actual de cada lote',
            tags: ['ItemLots', 'Stock'],
            querystring: listItemLotsQueryJsonSchema,
        }
    }, async (req, reply) => {
        try {
            // 1. VALIDAR QUERY PARAMS
            const parsed = listItemLotsQuery.safeParse(req.query);
            if (!parsed.success) {
                app.log.error({ error: parsed.error }, '❌ Error validando query params');
                return reply.code(400).send({ 
                    message: 'Parámetros inválidos',
                    errors: parsed.error.flatten() 
                });
            }
            const q = parsed.data;

            const { skip, take } = toSkipTake(q);
            app.log.info(`📊 Consultando stock - skip: ${skip}, take: ${take}`);

            // 2. CONSTRUIR CONDICIONES WHERE
            let whereItemId = '';
            let whereSearch = '';
            
            if (q.item_id) {
                whereItemId = `AND il.item_id = ${q.item_id}`;
            }
            
            if (q.search) {
                const searchEscaped = q.search.replace(/'/g, "''");
                whereSearch = `AND il.lote_codigo ILIKE '%${searchEscaped}%'`;
            }

            // 3. EJECUTAR QUERY PRINCIPAL
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

            app.log.info('🔍 Ejecutando query SQL...');
            const rawData = await prisma.$queryRawUnsafe<any[]>(queryStr);
            app.log.info(`✅ Query exitosa - ${rawData.length} registros encontrados`);

            // 4. CALCULAR TOTAL
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
            app.log.info(`📊 Total de lotes con stock: ${total}`);

            // 5. CONVERSIÓN SEGURA DE DATOS
            const cleanData = rawData.map((row, index) => {
                try {
                    // Convertir stock_actual (puede ser Decimal, BigInt, o número)
                    let stockValue = 0;
                    if (row.stock_actual !== null && row.stock_actual !== undefined) {
                        // Si es un objeto Decimal de Prisma
                        if (typeof row.stock_actual === 'object' && 'toNumber' in row.stock_actual) {
                            stockValue = row.stock_actual.toNumber();
                        } 
                        // Si es BigInt
                        else if (typeof row.stock_actual === 'bigint') {
                            stockValue = Number(row.stock_actual);
                        }
                        // Si es string o número
                        else {
                            stockValue = Number(row.stock_actual);
                        }
                    }

                    // Convertir fecha de manera segura
                    let fechaStr = '';
                    try {
                        if (row.fecha_ingreso instanceof Date) {
                            fechaStr = row.fecha_ingreso.toISOString();
                        } else if (row.fecha_ingreso) {
                            fechaStr = new Date(row.fecha_ingreso).toISOString();
                        } else {
                            fechaStr = new Date().toISOString();
                        }
                    } catch (dateError) {
                        app.log.warn({ error: dateError }, `⚠️ Error convirtiendo fecha en fila ${index}`);
                        fechaStr = new Date().toISOString();
                    }

                    return {
                        item_id: Number(row.item_id) || 0,
                        item_nombre: String(row.item_nombre || ''),
                        item_unidad: String(row.item_unidad || 'UND'),
                        lot_id: Number(row.lot_id) || 0,
                        lote_codigo: String(row.lote_codigo || ''),
                        fecha_ingreso: fechaStr,
                        stock_actual: stockValue
                    };
                } catch (rowError) {
                    app.log.error({ error: rowError, row }, `❌ Error procesando fila ${index}`);
                    throw rowError;
                }
            });

            app.log.info('✅ Datos procesados correctamente');

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
            // LOGGING DETALLADO DEL ERROR
            const errorInfo = {
                type: error?.constructor?.name || 'Unknown',
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                code: error && typeof error === 'object' && 'code' in error ? (error as any).code : undefined,
                meta: error && typeof error === 'object' && 'meta' in error ? (error as any).meta : undefined,
            };

            app.log.error({ error: errorInfo }, '❌❌❌ ERROR EN /item-lots/stock ❌❌❌');

            return reply.code(500).send({ 
                message: "Error interno al obtener stock de lotes",
                error: errorInfo.message,
                type: errorInfo.type,
                // Solo en desarrollo:
                stack: process.env.NODE_ENV === 'development' ? errorInfo.stack : undefined
            });
        }
    });

    // ... resto de endpoints (sin cambios)

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