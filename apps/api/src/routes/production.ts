// src/routes/production.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

export async function registerProductionRoutes(
  app: FastifyInstance,
  prisma: PrismaClient
) {
  // ---------- TEST: GET /production ----------
  app.get('/production', async () => {
    return { ok: true, msg: 'Rutas de producción activas' };
  });

  // ---------- Schemas ----------
  const LineSchema = z.object({
    item_id: z.number().int().positive(),
    lot_id: z.number().int().positive(),
    cantidad: z.number().positive(),
  });

  const CreateBatchSchema = z.object({
    shift_id: z.number().int().positive().optional(),
    // puedes enviar "2025-11-09T15:30:00" o nada (usa now())
    fecha_hora: z.string().optional(),
    bidones_llenados: z.number().int().nonnegative(),
    observacion: z.string().max(255).optional(),
    consumptions: z.array(LineSchema).min(1),
  });

  // ---------- POST /production/batches ----------
  app.post('/production/batches', async (req, reply) => {
    const body = CreateBatchSchema.parse(req.body);

    const fecha = body.fecha_hora ? new Date(body.fecha_hora) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1) Batch de producción
      const batch = await tx.production_batches.create({
        data: {
          shift_id: body.shift_id ?? 1, // ajusta según tu lógica de turnos
          fecha_hora: fecha,
          bidones_llenados: body.bidones_llenados,
          observacion: body.observacion ?? null,
        },
      });

      // 2) Consumos + movimientos OUT
      for (const line of body.consumptions) {
        await tx.production_consumptions.create({
          data: {
            batch_id: batch.id,
            item_id: line.item_id,
            lot_id: line.lot_id,
            cantidad: line.cantidad,
          },
        });

        await tx.inventory_movements.create({
          data: {
            item_id: line.item_id,
            lot_id: line.lot_id,
            tipo: 'OUT',
            motivo: 'USO_PRODUCCION',
            cantidad: line.cantidad,
            ref_tipo: 'BATCH',
            ref_id: batch.id,
            turno_id: body.shift_id ?? null,
            fecha_hora: fecha,
            observacion: body.observacion ?? null,
          },
        });
      }

      return batch;
    });

    return reply.code(201).send(result);
  });
}
