// apps/api/src/routes/stock.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { buildTransport, sendMail } from '../lib/mailer.js';

export async function registerStockRoutes(app: FastifyInstance, prisma: PrismaClient) {
  // A) Verifica conexión SMTP (NO envía correo)
  app.get('/dev/mail-verify', async (_req, reply) => {
    try {
      const transporter = buildTransport();
      await transporter.verify();
      return reply.send({ ok: true });
    } catch (err: any) {
      return reply.code(500).send({ ok: false, error: err?.message || String(err) });
    }
  });

  // B) Envía un correo de prueba simple
  app.post('/dev/mail-test', async (req, reply) => {
    const schema = z.object({
      to: z.string().min(3),
      subject: z.string().default('Prueba de correo - GluGlu'),
      html: z.string().default('<b>Hola!</b> Este es un test de correo desde GluGlu.')
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

  // Stock total por ítem
  app.get('/stock/items', async (_req, reply) => {
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

    return reply.code(200).send({ data: result });
  });

  // Ítems por debajo de su mínimo (alertas)
  app.get('/stock/low', async (_req, reply) => {
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

    return reply.code(200).send({ data: result });
  });

  // =============== 1) KARDEX / LEDGER POR LOTE ===============
  app.get('/stock/ledger', async (req, reply) => {
    const schema = z.object({
      item_id: z.coerce.number().int().positive().optional(),
      lot_id: z.coerce.number().int().positive().optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(10),
    });
    const parsed = schema.safeParse(req.query);
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

    // Obtener movimientos con window function para saldo acumulado
    const rows = await prisma.$queryRaw<any[]>`
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
      WHERE ${item_id ? prisma.$queryRaw`im.item_id = ${item_id}` : prisma.$queryRaw`TRUE`}
        AND ${lot_id ? prisma.$queryRaw`im.lot_id = ${lot_id}` : prisma.$queryRaw`TRUE`}
        AND ${from ? prisma.$queryRaw`im.fecha_hora >= ${from}` : prisma.$queryRaw`TRUE`}
        AND ${to ? prisma.$queryRaw`im.fecha_hora <= ${to}` : prisma.$queryRaw`TRUE`}
      ORDER BY im.fecha_hora DESC, im.id DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const data = rows.map(r => ({ ...r, id: r.id?.toString?.() ?? r.id }));

    return reply.send({
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      data
    });
  });

  // =============== 2) STOCK A UNA FECHA ===============
  app.get('/stock/at-date', async (req, reply) => {
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

    return reply.send({
      as_of: `${date}T00:00:00.000Z`,
      data: rows,
    });
  });

  // ===================== LOTES POR ÍTEM =====================
  app.get('/stock/items/:id/lots', async (req, reply) => {
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

    // Stock por lote
    const rows = await prisma.$queryRaw<any[]>`
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
        ${search ? prisma.$queryRaw`AND il.lote_codigo ILIKE ${'%' + search + '%'}` : prisma.$queryRaw``}
      GROUP BY il.id, il.lote_codigo, il.fecha_ingreso
      ORDER BY il.fecha_ingreso DESC, il.lote_codigo ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    // Info del item
    const item = await prisma.items.findUnique({
      where: { id: item_id },
      select: { id: true, nombre: true, unidad: true }
    });
    if (!item) return reply.code(404).send({ message: 'Item no encontrado' });

    return reply.send({
      item,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      data: rows
    });
  });

  // ===================== EXPORTAR KARDEX EN CSV =====================
  app.get('/stock/ledger/export', async (req, reply) => {
    const schema = z.object({
      item_id: z.coerce.number().int().positive().optional(),
      lot_id: z.coerce.number().int().positive().optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
    const { item_id, lot_id, from, to } = parsed.data;

    const rows = await prisma.$queryRaw<any[]>`
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
      WHERE ${item_id ? prisma.$queryRaw`im.item_id = ${item_id}` : prisma.$queryRaw`TRUE`}
        AND ${lot_id ? prisma.$queryRaw`im.lot_id = ${lot_id}` : prisma.$queryRaw`TRUE`}
        AND ${from ? prisma.$queryRaw`im.fecha_hora >= ${from}` : prisma.$queryRaw`TRUE`}
        AND ${to ? prisma.$queryRaw`im.fecha_hora <= ${to}` : prisma.$queryRaw`TRUE`}
      ORDER BY im.fecha_hora ASC, im.id ASC
    `;

    // Generar CSV
    const header = [
      'id', 'fecha_hora', 'item_id', 'item_nombre', 'lot_id', 'lote_codigo',
      'tipo', 'motivo', 'cantidad_in', 'cantidad_out', 'saldo', 'observacion'
    ];
    const lines = [header.join(',')];

    for (const r of rows) {
      const cantidad_in = r.tipo === 'IN' ? r.cantidad : 0;
      const cantidad_out = r.tipo === 'OUT' ? r.cantidad : 0;
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
        toCsv(r.saldo),
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
  });

  // ===================== ENVIAR ALERTAS =====================
  app.post('/stock/alerts/send', async (req, reply) => {
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

    if (!low.length) {
      return reply.code(204).send();
    }

    if (channel === 'console') {
      app.log.warn({ low }, 'ALERTA STOCK BAJO (console)');
      return reply.send({ channel, sent: 1, preview: low });
    }

    if (channel === 'email') {
      const envTo = (process.env.ALERT_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
      const toList = to ? to.split(',').map(s => s.trim()).filter(Boolean) : envTo;
      if (!toList.length) {
        return reply.code(400).send({
          message: 'No hay destinatarios. Define ALERT_EMAILS en .env o envía { "to": "a@b.com,c@d.com" }.'
        });
      }

      const rowsHtml = low.map(r => `
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
          `🔔 ${low.length} item(s) con stock bajo - GluGlu`,
          html
        );

        return reply.send({
          channel,
          to: toList,
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
          sent: low.length
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
  });
}