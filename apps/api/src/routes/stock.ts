// apps/api/src/routes/stock.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { buildTransport, sendMail } from '../lib/mailer.js';
import { paginationMetaSchema } from '../schemas/common.js';

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const idParamJsonSchema = {
    type: 'object',
    properties: { id: { type: 'number', description: 'ID del ítem' } },
    required: ['id']
};

export async function registerStockRoutes(app: FastifyInstance, prisma: PrismaClient) {
    
    // Schemas de Respuesta Comunes
    const stockItemResponse = {
        type: 'object',
        properties: {
            item_id: { type: 'number' },
            item_nombre: { type: 'string' },
            unidad: { type: 'string' },
            stock_total: { type: 'number', description: 'Stock total' },
        }
    };
    
    // MODIFICADO: Hacemos 'minimo_alerta' siempre número (0 si es null) para evitar errores de serialización
    const lowStockItemResponse = {
        ...stockItemResponse,
        properties: {
            ...stockItemResponse.properties,
            minimo_alerta: { type: 'number' }, 
        }
    };

  // A) Verifica conexión SMTP
  app.get('/dev/mail-verify', {
        schema: {
            description: 'Verifica la conexión con el servidor SMTP',
            tags: ['Dev'],
            response: {
                200: { type: 'object', properties: { ok: { type: 'boolean' } } },
                500: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } } },
            }
        }
    }, async (_req, reply) => {
    try {
      const transporter = buildTransport();
      await transporter.verify();
      return reply.send({ ok: true });
    } catch (err: any) {
      return reply.code(500).send({ ok: false, error: err?.message || String(err) });
    }
  });

  // B) Envía un correo de prueba
  app.post('/dev/mail-test', {
        schema: {
            description: 'Envía un correo de prueba simple',
            tags: ['Dev'],
            body: {
                type: 'object',
                properties: {
                    to: { type: 'string' },
                    subject: { type: 'string', default: 'Prueba de correo - GluGlu' },
                    html: { type: 'string', default: '<b>Hola!</b> Este es un test.' }
                },
                required: ['to']
            },
            response: {
                200: { type: 'object', properties: { ok: { type: 'boolean' }, messageId: { type: 'string' }, accepted: { type: 'array', items: { type: 'string' } }, rejected: { type: 'array', items: { type: 'string' } } } },
                400: { type: 'object', properties: { message: { type: 'string' } } },
                500: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } } }
            }
        }
    }, async (req, reply) => {
    const schema = z.object({
      to: z.string().min(3),
      subject: z.string().default('Prueba de correo - GluGlu'),
      html: z.string().default('<b>Hola!</b> Este es un test.')
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());

    const { to, subject, html } = parsed.data;
    const toList = to.split(',').map((s: string) => s.trim()).filter(Boolean);

    try {
      const info = await sendMail(toList, subject, html);
      return reply.send({ ok: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected });
    } catch (err: any) {
      return reply.code(500).send({ ok: false, error: err?.message || String(err) });
    }
  });

  // ✅ Stock total por ítem
  app.get('/stock/items', {
        schema: {
            description: 'OBTENER el stock total consolidado por ítem',
            tags: ['Stock'],
            response: {
                200: {
                    type: 'object',
                    properties: { data: { type: 'array', items: stockItemResponse } }
                }
            }
        }
    }, async (_req, reply) => {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT
          i.id AS item_id,
          i.nombre AS item_nombre,
          i.unidad AS unidad,
          COALESCE(SUM(
            CASE WHEN im.tipo = 'IN' THEN im.cantidad
                 WHEN im.tipo = 'OUT' THEN -im.cantidad
                 ELSE 0 END
          ), 0) AS stock_total
        FROM items i
        LEFT JOIN inventory_movements im ON im.item_id = i.id
        GROUP BY i.id, i.nombre, i.unidad
        ORDER BY i.nombre ASC
      `;

      const cleanData = result.map(row => ({
        item_id: Number(row.item_id),
        item_nombre: String(row.item_nombre || ''),
        unidad: String(row.unidad || 'UND'),
        stock_total: Number(row.stock_total) || 0
      }));

      return reply.code(200).send({ data: cleanData });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ 
        message: 'Error interno al obtener stock',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ✅ Ítems por debajo de su mínimo (alertas) - CORREGIDO
  app.get('/stock/low', {
        schema: {
            description: 'LISTAR ítems cuyo stock total está por debajo de su mínimo de alerta',
            tags: ['Stock', 'Alerts'],
            response: {
                200: {
                    type: 'object',
                    properties: { data: { type: 'array', items: lowStockItemResponse } }
                }
            }
        }
    }, async (_req, reply) => {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT
          i.id AS item_id,
          i.nombre AS item_nombre,
          i.unidad AS unidad,
          t.minimo_alerta AS minimo_alerta,
          COALESCE(SUM(
            CASE WHEN im.tipo = 'IN' THEN im.cantidad
                 WHEN im.tipo = 'OUT' THEN -im.cantidad
                 ELSE 0 END
          ), 0) AS stock_total
        FROM items i
        LEFT JOIN thresholds t ON t.item_id = i.id
        LEFT JOIN inventory_movements im ON im.item_id = i.id
        GROUP BY i.id, i.nombre, i.unidad, t.minimo_alerta
        HAVING COALESCE(SUM(
          CASE WHEN im.tipo = 'IN' THEN im.cantidad
               WHEN im.tipo = 'OUT' THEN -im.cantidad
               ELSE 0 END
        ), 0) < COALESCE(t.minimo_alerta, 0)
      `;

      // ✨ Conversión segura: Si es null, enviamos 0 para cumplir con el schema 'number'
      const cleanData = result.map(row => ({
        item_id: Number(row.item_id),
        item_nombre: String(row.item_nombre || ''),
        unidad: String(row.unidad || 'UND'),
        minimo_alerta: row.minimo_alerta ? Number(row.minimo_alerta) : 0,
        stock_total: Number(row.stock_total) || 0
      }));

      return reply.code(200).send({ data: cleanData });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ 
        message: 'Error interno al obtener alertas de stock',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // =============== 1) KARDEX / LEDGER POR LOTE - CORREGIDO ===============
    const ledgerQuerySchema = z.object({
        item_id: z.coerce.number().int().positive().optional(),
        lot_id: z.coerce.number().int().positive().optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
    });
    const ledgerQueryJsonSchema = {
        type: 'object',
        properties: {
            item_id: { type: 'number', description: 'Filtro por ID de ítem' },
            lot_id: { type: 'number', description: 'Filtro por ID de lote' },
            from: { type: 'string', format: 'date-time', description: 'Filtro: Fecha y hora DESDE' },
            to: { type: 'string', format: 'date-time', description: 'Filtro: Fecha y hora HASTA' },
            page: { type: 'number', default: 1 },
            pageSize: { type: 'number', default: 10, minimum: 1, maximum: 100 },
        }
    };
    const ledgerResponseSchema = {
        type: 'object',
        properties: {
            meta: paginationMetaSchema,
            data: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'ID del movimiento (BigInt serializado)' },
                        item_id: { type: 'number' },
                        item_nombre: { type: 'string' },
                        lot_id: { type: 'number' },
                        lote_codigo: { type: 'string' },
                        fecha_hora: { type: 'string', format: 'date-time' },
                        tipo: { type: 'string', enum: ['IN', 'OUT'] },
                        cantidad: { type: 'number' },
                        motivo: { type: 'string' },
                        observacion: { type: 'string', nullable: true },
                        saldo: { type: 'number', description: 'Saldo acumulado al momento del movimiento' },
                    }
                }
            }
        }
    };

  app.get('/stock/ledger', {
        schema: {
            description: 'OBTENER el Kardex o Ledger de movimientos de inventario con saldo acumulado, filtros y paginación',
            tags: ['Stock', 'Movements'],
            querystring: ledgerQueryJsonSchema,
            response: {
                200: ledgerResponseSchema
            }
        }
    }, async (req, reply) => {
    try {
      const parsed = ledgerQuerySchema.safeParse(req.query);
      if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
      const { item_id, lot_id, from, to, page, pageSize } = parsed.data;

      const offset = (page - 1) * pageSize;

      // Construir condiciones WHERE
      let whereConditions: any = {};
      if (item_id) whereConditions.item_id = item_id;
      if (lot_id) whereConditions.lot_id = lot_id;
      if (from || to) {
        whereConditions.fecha_hora = {};
        if (from) whereConditions.fecha_hora.gte = from;
        if (to) whereConditions.fecha_hora.lte = to;
      }

      // Total filas
      const total = await prisma.inventory_movements.count({ where: whereConditions });

      // Construir condiciones SQL
      let whereItemId = item_id ? `AND im.item_id = ${item_id}` : '';
      let whereLotId = lot_id ? `AND im.lot_id = ${lot_id}` : '';
      let whereFrom = from ? `AND im.fecha_hora >= '${from.toISOString()}'` : '';
      let whereTo = to ? `AND im.fecha_hora <= '${to.toISOString()}'` : '';

      // Obtener movimientos con window function para saldo acumulado
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT
          im.id,
          im.item_id,
          i.nombre AS item_nombre,
          im.lot_id,
          il.lote_codigo,
          im.fecha_hora,
          im.tipo,
          im.cantidad,
          im.motivo,
          im.observacion,
          SUM(CASE WHEN im.tipo='IN' THEN im.cantidad ELSE -im.cantidad END)
            OVER (PARTITION BY im.lot_id ORDER BY im.fecha_hora, im.id) AS saldo
        FROM inventory_movements im
        JOIN items i ON i.id = im.item_id
        JOIN item_lots il ON il.id = im.lot_id
        WHERE 1=1
          ${whereItemId}
          ${whereLotId}
          ${whereFrom}
          ${whereTo}
        ORDER BY im.fecha_hora DESC, im.id DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `);

      const data = rows.map(r => ({ 
        ...r, 
        id: r.id?.toString?.() ?? r.id,
        cantidad: Number(r.cantidad),
        saldo: Number(r.saldo)
      }));

      return reply.send({
        meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        data
      });
    } catch (error) {
      console.error('❌ Error en /stock/ledger:', error);
      return reply.code(500).send({ 
        message: 'Error interno al obtener kardex',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // =============== 2) STOCK A UNA FECHA - CORREGIDO ===============
    const stockAtDateQuerySchema = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha límite (YYYY-MM-DD)')
    });
    const stockAtDateQueryJsonSchema = {
        type: 'object',
        properties: {
            date: { type: 'string', format: 'date', description: 'Fecha límite (YYYY-MM-DD)' }
        },
        required: ['date']
    };
    const stockAtDateResponseSchema = {
        type: 'object',
        properties: {
            as_of: { type: 'string', format: 'date-time' },
            data: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        item_id: { type: 'number' },
                        item_nombre: { type: 'string' },
                        item_unidad: { type: 'string' },
                        stock_a_fecha: { type: 'number', description: 'Stock calculado a la fecha indicada' },
                    }
                }
            }
        }
    };

  app.get('/stock/at-date', {
        schema: {
            description: 'OBTENER el stock total consolidado por ítem a una fecha específica',
            tags: ['Stock'],
            querystring: stockAtDateQueryJsonSchema,
            response: {
                200: stockAtDateResponseSchema
            }
        }
    }, async (req, reply) => {
    try {
      const schema = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      });
      const parsed = schema.safeParse(req.query);
      if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
      const { date } = parsed.data;

      const rows = await prisma.$queryRaw<any[]>`
        SELECT
          i.id AS item_id,
          i.nombre AS item_nombre,
          i.unidad AS item_unidad,
          COALESCE(SUM(
            CASE
              WHEN im.fecha_hora <= ${date}::timestamp AND im.tipo = 'IN' THEN im.cantidad
              WHEN im.fecha_hora <= ${date}::timestamp AND im.tipo = 'OUT' THEN -im.cantidad
              ELSE 0
            END
          ), 0) AS stock_a_fecha
        FROM items i
        LEFT JOIN inventory_movements im ON im.item_id = i.id
        GROUP BY i.id, i.nombre, i.unidad
        ORDER BY i.nombre ASC
      `;

      const cleanData = rows.map(row => ({
        item_id: Number(row.item_id),
        item_nombre: String(row.item_nombre),
        item_unidad: String(row.item_unidad),
        stock_a_fecha: Number(row.stock_a_fecha)
      }));

      return reply.send({
        as_of: `${date}T00:00:00.000Z`,
        data: cleanData,
      });
    } catch (error) {
      console.error('❌ Error en /stock/at-date:', error);
      return reply.code(500).send({ 
        message: 'Error interno',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ===================== LOTES POR ÍTEM - CORREGIDO =====================
    const lotsByItemQuerySchema = z.object({
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
        search: z.string().trim().optional()
    });
    const lotsByItemQueryJsonSchema = {
        type: 'object',
        properties: {
            page: { type: 'number', default: 1 },
            pageSize: { type: 'number', default: 10, minimum: 1, maximum: 100 },
            search: { type: 'string', description: 'Búsqueda por lote_codigo' }
        }
    };
    const lotsByItemResponseSchema = {
        type: 'object',
        properties: {
            item: { type: 'object', properties: { id: { type: 'number' }, nombre: { type: 'string' }, unidad: { type: 'string' } } },
            meta: paginationMetaSchema,
            data: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        lot_id: { type: 'number' },
                        lote_codigo: { type: 'string' },
                        fecha_ingreso: { type: 'string', format: 'date-time' },
                        stock_actual: { type: 'number', description: 'Stock actual (BigInt serializado a number)' }
                    }
                }
            }
        }
    };

  app.get('/stock/items/:id/lots', {
        schema: {
            description: 'OBTENER el stock por lote de un ítem específico',
            tags: ['Stock', 'ItemLots'],
            params: idParamJsonSchema,
            querystring: lotsByItemQueryJsonSchema,
            response: {
                200: lotsByItemResponseSchema,
                404: { type: 'object', properties: { message: { type: 'string' } } }
            }
        }
    }, async (req, reply) => {
    try {
      const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
      const querySchema = z.object({
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
        search: z.string().trim().optional()
      });

      const params = paramsSchema.safeParse(req.params);
      if (!params.success) return reply.code(400).send(params.error.flatten());
      const q = querySchema.safeParse(req.query);
      if (!q.success) return reply.code(400).send(q.error.flatten());

      const { id: item_id } = params.data;
      const { page, pageSize, search } = q.data;
      const offset = (page - 1) * pageSize;

      // Condiciones WHERE
      let whereConditions: any = { item_id };
      if (search) {
        whereConditions.lote_codigo = { contains: search, mode: 'insensitive' };
      }

      // Total de lotes
      const total = await prisma.item_lots.count({ where: whereConditions });

      // Construir WHERE para SQL
      let whereSearch = search ? `AND il.lote_codigo ILIKE '%${search.replace(/'/g, "''")}%'` : '';

      // Stock por lote
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT
          il.id AS lot_id,
          il.lote_codigo,
          il.fecha_ingreso,
          COALESCE(SUM(
            CASE WHEN im.tipo='IN' THEN im.cantidad
                 WHEN im.tipo='OUT' THEN -im.cantidad
                 ELSE 0 END
          ), 0) AS stock_actual
        FROM item_lots il
        LEFT JOIN inventory_movements im ON im.lot_id = il.id AND im.item_id = il.item_id
        WHERE il.item_id = ${item_id}
          ${whereSearch}
        GROUP BY il.id, il.lote_codigo, il.fecha_ingreso
        ORDER BY il.fecha_ingreso DESC, il.lote_codigo ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `);

      const cleanData = rows.map(row => ({
        lot_id: Number(row.lot_id),
        lote_codigo: String(row.lote_codigo),
        fecha_ingreso: row.fecha_ingreso instanceof Date 
          ? row.fecha_ingreso.toISOString()
          : new Date(row.fecha_ingreso).toISOString(),
        stock_actual: Number(row.stock_actual)
      }));

      // Info del item
      const item = await prisma.items.findUnique({
        where: { id: item_id },
        select: { id: true, nombre: true, unidad: true }
      });
      if (!item) return reply.code(404).send({ message: 'Item no encontrado' });

      return reply.send({
        item,
        meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        data: cleanData
      });
    } catch (error) {
      console.error('❌ Error en /stock/items/:id/lots:', error);
      return reply.code(500).send({ 
        message: 'Error interno',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ===================== EXPORTAR KARDEX EN CSV - CORREGIDO =====================
    const ledgerExportQueryJsonSchema = {
        type: 'object',
        properties: {
            item_id: { type: 'number', description: 'Filtro por ID de ítem' },
            lot_id: { type: 'number', description: 'Filtro por ID de lote' },
            from: { type: 'string', format: 'date-time', description: 'Filtro: Fecha y hora DESDE' },
            to: { type: 'string', format: 'date-time', description: 'Filtro: Fecha y hora HASTA' },
        }
    };

  app.get('/stock/ledger/export', {
        schema: {
            description: 'EXPORTAR el Kardex/Ledger completo en formato CSV',
            tags: ['Stock', 'Movements'],
            querystring: ledgerExportQueryJsonSchema,
            response: {
                200: { type: 'string', format: 'binary', description: 'Archivo CSV' }
            }
        }
    }, async (req, reply) => {
    try {
      const schema = z.object({
        item_id: z.coerce.number().int().positive().optional(),
        lot_id: z.coerce.number().int().positive().optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      });
      const parsed = schema.safeParse(req.query);
      if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
      const { item_id, lot_id, from, to } = parsed.data;

      // Construir condiciones SQL
      let whereItemId = item_id ? `AND im.item_id = ${item_id}` : '';
      let whereLotId = lot_id ? `AND im.lot_id = ${lot_id}` : '';
      let whereFrom = from ? `AND im.fecha_hora >= '${from.toISOString()}'` : '';
      let whereTo = to ? `AND im.fecha_hora <= '${to.toISOString()}'` : '';

      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT
          im.id,
          im.fecha_hora,
          i.nombre AS item_nombre,
          im.item_id,
          il.lote_codigo,
          im.lot_id,
          im.tipo,
          im.motivo,
          im.cantidad,
          im.observacion,
          SUM(CASE WHEN im.tipo='IN' THEN im.cantidad ELSE -im.cantidad END)
            OVER (PARTITION BY im.lot_id ORDER BY im.fecha_hora, im.id) AS saldo
        FROM inventory_movements im
        JOIN items i ON i.id = im.item_id
        JOIN item_lots il ON il.id = im.lot_id
        WHERE 1=1
          ${whereItemId}
          ${whereLotId}
          ${whereFrom}
          ${whereTo}
        ORDER BY im.fecha_hora ASC, im.id ASC
      `);

      // Generar CSV
      const header = [
        'id', 'fecha_hora', 'item_id', 'item_nombre', 'lot_id', 'lote_codigo',
        'tipo', 'motivo', 'cantidad_in', 'cantidad_out', 'saldo', 'observacion'
      ];
      const lines = [header.join(',')];

      for (const r of rows) {
        const cantidad_in = r.tipo === 'IN' ? Number(r.cantidad) : 0;
        const cantidad_out = r.tipo === 'OUT' ? Number(r.cantidad) : 0;
        const toCsv = (v: any) => {
          if (v === null || v === undefined) return '';
          const s = String(v).replace(/"/g, '""');
          return /[",\n]/.test(s) ? `"${s}"` : s;
        };
        lines.push([
          toCsv(r.id?.toString?.() ?? r.id),
          toCsv(new Date(r.fecha_hora).toISOString()),
          toCsv(r.item_id),
          toCsv(r.item_nombre),
          toCsv(r.lot_id),
          toCsv(r.lote_codigo),
          toCsv(r.tipo),
          toCsv(r.motivo),
          toCsv(cantidad_in),
          toCsv(cantidad_out),
          toCsv(Number(r.saldo)),
          toCsv(r.observacion)
        ].join(','));
      }

      const csv = lines.join('\n');
      const fnameParts = [
        'kardex',
        item_id ? `item${item_id}` : null,
        lot_id ? `lot${lot_id}` : null,
        from ? `from${new Date(from).toISOString().slice(0, 10)}` : null,
        to ? `to${new Date(to).toISOString().slice(0, 10)}` : null
      ].filter(Boolean);
      const filename = `${fnameParts.join('_') || 'kardex'}.csv`;

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(csv);
    } catch (error) {
      console.error('❌ Error en /stock/ledger/export:', error);
      return reply.code(500).send({ 
        message: 'Error interno',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ===================== ENVIAR ALERTAS - CORREGIDO =====================
    const alertsBodySchema = z.object({
        channel: z.enum(['console', 'email', 'webhook']).default('email'),
        to: z.string().optional()
    });
    const alertsBodyJsonSchema = {
        type: 'object',
        properties: {
            channel: { type: 'string', enum: ['console', 'email', 'webhook'], default: 'email' },
            to: { type: 'string', description: 'Destinatario(s) de email (opcional)' }
        }
    };
    const alertsResponseSchema = {
        type: 'object',
        properties: {
            channel: { type: 'string' },
            sent: { type: 'number' },
            preview: { type: 'array', items: lowStockItemResponse, description: 'Solo si channel es "console"' },
            to: { type: 'array', items: { type: 'string' }, description: 'Solo si channel es "email"' },
            messageId: { type: 'string', description: 'Solo si channel es "email"' },
            accepted: { type: 'array', items: { type: 'string' }, description: 'Solo si channel es "email"' },
            rejected: { type: 'array', items: { type: 'string' }, description: 'Solo si channel es "email"' },
        }
    };

  app.post('/stock/alerts/send', {
        schema: {
            description: 'Envía alertas de stock bajo al canal configurado (email por defecto)',
            tags: ['Stock', 'Alerts'],
            body: alertsBodyJsonSchema,
            response: {
                200: alertsResponseSchema,
                204: { type: 'null', description: 'No hay ítems con stock bajo' },
                400: { type: 'object', properties: { message: { type: 'string' } } },
                500: { type: 'object', properties: { message: { type: 'string' } } },
                501: { type: 'object', properties: { message: { type: 'string' } } }
            }
        }
    }, async (req, reply) => {
    try {
      const schema = z.object({
        channel: z.enum(['console', 'email', 'webhook']).default('email'),
        to: z.string().optional()
      });
      const parsed = schema.safeParse(req.body || {});
      if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
      const { channel, to } = parsed.data;

      // Cargar ítems bajo mínimo
      const low = await prisma.$queryRaw<any[]>`
        SELECT
          i.id AS item_id,
          i.nombre AS item_nombre,
          i.unidad AS unidad,
          t.minimo_alerta AS minimo_alerta,
          COALESCE(SUM(
            CASE WHEN im.tipo = 'IN' THEN im.cantidad
                 WHEN im.tipo = 'OUT' THEN -im.cantidad
                 ELSE 0 END
          ), 0) AS stock_total
        FROM items i
        LEFT JOIN thresholds t ON t.item_id = i.id
        LEFT JOIN inventory_movements im ON im.item_id = i.id
        GROUP BY i.id, i.nombre, i.unidad, t.minimo_alerta
        HAVING COALESCE(SUM(
          CASE WHEN im.tipo = 'IN' THEN im.cantidad
               WHEN im.tipo = 'OUT' THEN -im.cantidad
               ELSE 0 END
        ), 0) < COALESCE(t.minimo_alerta, 0)
      `;

      // Conversión de tipos
      const cleanLow = low.map(row => ({
        item_id: Number(row.item_id),
        item_nombre: String(row.item_nombre),
        unidad: String(row.unidad),
        minimo_alerta: row.minimo_alerta ? Number(row.minimo_alerta) : null,
        stock_total: Number(row.stock_total)
      }));

      if (!cleanLow.length) {
        return reply.code(204).send();
      }

      if (channel === 'console') {
        app.log.warn({ low: cleanLow }, 'ALERTA STOCK BAJO (console)');
        return reply.send({ channel, sent: 1, preview: cleanLow });
      }

      if (channel === 'email') {
        const envTo = (process.env.ALERT_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
        const toList = to ? to.split(',').map(s => s.trim()).filter(Boolean) : envTo;
        if (!toList.length) {
          return reply.code(400).send({
            message: 'No hay destinatarios. Define ALERT_EMAILS en .env o envía { "to": "a@b.com,c@d.com" }.'
          });
        }

        const rowsHtml = cleanLow.map(r => `
          <tr>
            <td style="padding:8px;border:1px solid #eee;">${r.item_id}</td>
            <td style="padding:8px;border:1px solid #eee;">${r.item_nombre}</td>
            <td style="padding:8px;border:1px solid #eee;text-align:right;">${r.stock_total}</td>
            <td style="padding:8px;border:1px solid #eee;text-align:right;">${r.minimo_alerta ?? '-'}</td>
            <td style="padding:8px;border:1px solid #eee;">${r.unidad}</td>
          </tr>
        `).join('');

        const html = `
          <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif">
            <h2>🔔 Alerta de Stock Bajo</h2>
            <p>Estos ítems están por debajo del mínimo configurado:</p>
            <table style="border-collapse:collapse;border:1px solid #eee;">
              <thead>
                <tr style="background:#f7f7f7;">
                  <th style="padding:8px;border:1px solid #eee;">ID</th>
                  <th style="padding:8px;border:1px solid #eee;">Item</th>
                  <th style="padding:8px;border:1px solid #eee;">Stock</th>
                  <th style="padding:8px;border:1px solid #eee;">Mínimo</th>
                  <th style="padding:8px;border:1px solid #eee;">Unidad</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <p style="color:#888;font-size:12px;margin-top:16px;">Enviado automáticamente por GluGlu.</p>
          </div>
        `;

        try {
          const info = await sendMail(
            toList,
            `🔔 ${cleanLow.length} item(s) con stock bajo - GluGlu`,
            html
          );

          return reply.send({
            channel,
            to: toList,
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
            sent: cleanLow.length
          });
        } catch (err) {
          app.log.error({ err }, 'Fallo al enviar email de alertas');
          return reply.code(500).send({
            message: 'No se pudo enviar el correo de alertas',
            error: (err as any)?.message
          });
        }
      }

      if (channel === 'webhook') {
        return reply.code(501).send({ message: 'Webhook no implementado aún' });
      }
    } catch (error) {
      console.error('❌ Error en /stock/alerts/send:', error);
      return reply.code(500).send({ 
        message: 'Error interno',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}