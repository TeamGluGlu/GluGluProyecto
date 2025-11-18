// apps/api/src/routes/movements.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { createMovementSchema, listMovementsQuery } from '../schemas/movements';
import { toSkipTake } from '../schemas/common';

async function getStockByLot(prisma: PrismaClient, item_id: number, lot_id: number) {
  const rows = await prisma.$queryRaw<{ stock: bigint }[]>`
    SELECT COALESCE(SUM(CASE WHEN tipo = 'IN' THEN cantidad ELSE -cantidad END), 0) AS stock
    FROM inventory_movements
    WHERE item_id = ${item_id} AND lot_id = ${lot_id}
  `;
  return Number(rows?.[0]?.stock ?? 0);
}

export async function registerMovementRoutes(app: FastifyInstance, prisma: PrismaClient) {
  // Listado con filtros + paginación
  app.get('/movements', async (req, reply) => {
    const parsed = listMovementsQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
    const q = parsed.data;

    const where: any = {};
    if (q.item_id) where.item_id = q.item_id;
    if (q.lot_id) where.lot_id = q.lot_id;
    if (q.tipo) where.tipo = q.tipo;
    if (q.motivo) where.motivo = q.motivo;
    if (q.from || q.to) {
      where.fecha_hora = {};
      if (q.from) (where.fecha_hora as any).gte = q.from;
      if (q.to) (where.fecha_hora as any).lte = q.to;
    }

    const { skip, take } = toSkipTake(q);
    const [total, rows] = await Promise.all([
      prisma.inventory_movements.count({ where }),
      prisma.inventory_movements.findMany({
        where,
        orderBy: { [q.orderBy]: q.orderDir },
        skip,
        take,
        include: {
          items: { select: { id: true, nombre: true, unidad: true } },
          item_lots: { select: { id: true, lote_codigo: true, fecha_ingreso: true } },
          shifts: { select: { id: true, fecha: true, numero: true } },
        }
      }),
    ]);

    // BigInt -> string para JSON seguro
    const data = rows.map(r => ({ ...r, id: r.id.toString() }));

    return {
      meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) },
      data
    };
  });

  // Crear movimiento (valida pertenencia de lote y stock en OUT)
  app.post('/movements', async (req, reply) => {
    const parsed = createMovementSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
    const m = parsed.data;

    // Validar existencia y correspondencia lote ↔ item
    const [item, lot] = await Promise.all([
      prisma.items.findUnique({ where: { id: m.item_id }, select: { id: true } }),
      prisma.item_lots.findUnique({ where: { id: m.lot_id }, select: { id: true, item_id: true } }),
    ]);
    if (!item) return reply.code(404).send({ message: 'Item no existe' });
    if (!lot) return reply.code(404).send({ message: 'Lote no existe' });
    if (lot.item_id !== m.item_id) {
      return reply.code(400).send({ message: 'El lote no pertenece al item indicado' });
    }

    // Validar stock en salidas
    if (m.tipo === 'OUT') {
      const stock = await getStockByLot(prisma, m.item_id, m.lot_id);
      if (m.cantidad > stock) {
        return reply.code(409).send({
          message: 'Stock insuficiente para salida',
          detalles: { disponible: stock, solicitado: m.cantidad }
        });
      }
    }

    const created = await prisma.inventory_movements.create({
      data: {
        item_id: m.item_id,
        lot_id: m.lot_id,
        tipo: m.tipo,
        cantidad: m.cantidad,
        motivo: m.motivo,
        ref_tipo: m.ref_tipo,
        ref_id: m.ref_id,
        turno_id: m.turno_id,
        observacion: m.observacion
      }
    });

    return reply.code(201).send({ ...created, id: created.id.toString() });
  });
}