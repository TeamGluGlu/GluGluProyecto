// apps/api/src/routes/production.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

export async function registerProductionRoutes(
  app: FastifyInstance,
  prisma: PrismaClient
) {
  // ============================================================
  // GET /production — Test de activación
  // ============================================================
  app.get(
    '/production',
    {
      schema: {
        description: 'Verifica la activación de las rutas de producción',
        tags: ['Production'],
      },
    },
    async () => {
      return { ok: true, msg: 'Rutas de producción activas' };
    }
  );

  // ============================================================
  // Schemas Zod y JSON Schema
  // ============================================================
  const LineSchema = z.object({
    item_id: z.number().int().positive().describe('ID del ítem consumido'),
    lot_id: z.number().int().positive().describe('ID del lote consumido'),
    cantidad: z.number().positive().describe('Cantidad consumida'),
  });

  const LineJsonSchema = {
    type: 'object',
    properties: {
      item_id: { type: 'number', description: 'ID del ítem consumido' },
      lot_id: { type: 'number', description: 'ID del lote consumido' },
      cantidad: { type: 'number', description: 'Cantidad consumida' },
    },
    required: ['item_id', 'lot_id', 'cantidad'],
    additionalProperties: false,
  };

  const CreateBatchSchema = z.object({
    shift_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('ID del turno asociado'),
    fecha_hora: z
      .string()
      .optional()
      .describe('Fecha y hora del batch (ISO 8601 o nada para usar now())'),
    bidones_llenados: z
      .number()
      .int()
      .nonnegative()
      .describe('Número de bidones producidos en el batch'),
    observacion: z
      .string()
      .max(255)
      .optional()
      .describe('Observación del batch'),
    consumptions: z
      .array(LineSchema)
      .min(1)
      .describe('Lista de ítems y cantidades consumidas'),
  });

  const CreateBatchJsonSchema = {
    type: 'object',
    properties: {
      shift_id: {
        type: 'number',
        description: 'ID del turno asociado (opcional)',
      },
      fecha_hora: {
        type: 'string',
        format: 'date-time',
        description:
          'Fecha y hora del batch (opcional, usa `now()` si no se provee)',
      },
      bidones_llenados: {
        type: 'number',
        description: 'Número de bidones producidos en el batch',
      },
      observacion: {
        type: 'string',
        description: 'Observación del batch (opcional)',
      },
      consumptions: {
        type: 'array',
        description: 'Lista de ítems y cantidades consumidas',
        items: LineJsonSchema,
      },
    },
    required: ['bidones_llenados', 'consumptions'],
    additionalProperties: false,
  };

  const BatchResponseSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'ID del batch creado' },
      shift_id: { type: 'number' },
      fecha_hora: { type: 'string', format: 'date-time' },
      bidones_llenados: { type: 'number' },
      observacion: { type: 'string', nullable: true },
    },
  };

  // ============================================================
  // POST /production/batches — Registrar batch completo
  // ============================================================
  app.post(
    '/production/batches',
    {
      schema: {
        description:
          'REGISTRAR un nuevo batch de producción (crea un batch, consumos y movimientos OUT)',
        tags: ['Production', 'Movements'],
        body: CreateBatchJsonSchema,
        response: {
          201: BatchResponseSchema,
          400: {
            type: 'object',
            properties: { message: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const body = CreateBatchSchema.parse(req.body);

      const fecha = body.fecha_hora ? new Date(body.fecha_hora) : new Date();

      const result = await prisma.$transaction(async (tx) => {
        // 1) Crear batch de producción
        const batch = await tx.production_batches.create({
          data: {
            shift_id: body.shift_id ?? 1, // Ajusta según lógica real
            fecha_hora: fecha,
            bidones_llenados: body.bidones_llenados,
            observacion: body.observacion ?? null,
          },
        });

        // 2) Registrar consumos + movimientos OUT
        for (const line of body.consumptions) {
          // Registrar consumo
          await tx.production_consumptions.create({
            data: {
              batch_id: batch.id,
              item_id: line.item_id,
              lot_id: line.lot_id,
              cantidad: line.cantidad,
            },
          });

          // Registrar movimiento de inventario (OUT)
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
    }
  );
}
