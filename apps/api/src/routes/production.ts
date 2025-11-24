// apps/api/src/routes/production.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  inventory_movements_motivo,
  inventory_movements_tipo
} from '@prisma/client';

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
  // NUEVA RUTA: GET /production/today — Total producido hoy
  // ============================================================
  app.get('/production/today', {
    schema: {
      description: 'Obtiene el total de bidones producidos en el día actual',
      tags: ['Production'],
      response: {
        200: {
          type: 'object',
          properties: {
            total: { type: 'number' }
          }
        }
      }
    }
  }, async (_req, reply) => {
    const now = new Date();
    // Definir inicio y fin del día actual (00:00:00 a 23:59:59)
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const result = await prisma.production_batches.aggregate({
      _sum: {
        bidones_llenados: true
      },
      where: {
        fecha_hora: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    // Si es null (no hubo producción), devolvemos 0
    return { total: result._sum.bidones_llenados || 0 };
  });
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
  bidon_item_id: z
    .number()
    .int()
    .positive()
    .describe('ID del ítem que representa el bidón lleno'),
  bidon_lote_codigo: z
    .string()
    .max(50)
    .describe('Código del lote para los bidones producidos'),
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
      description: 'Fecha y hora del batch (opcional, usa `now()` si no se provee)',
    },
    bidones_llenados: {
      type: 'number',
      description: 'Número de bidones producidos en el batch',
    },
    bidon_item_id: {
      type: 'number',
      description: 'ID del ítem que representa el bidón lleno',
    },
    bidon_lote_codigo: {
      type: 'string',
      description: 'Código del lote para los bidones producidos',
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
  required: ['bidones_llenados', 'bidon_item_id', 'bidon_lote_codigo', 'consumptions'],
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
    bidon_lot_id: { type: 'number', description: 'ID del lote de bidones creado' },
  },
};

// ============================================================
  // POST /production/batches — Registrar batch completo
  // ============================================================
  app.post(
    '/production/batches',
    {
      schema: {
        body: CreateBatchJsonSchema,
      },
    },
    async (req, reply) => {
      try {
        const body = CreateBatchSchema.parse(req.body);
        const fecha = body.fecha_hora ? new Date(body.fecha_hora) : new Date();

        console.log('📦 Creando batch:', { ...body, fecha });

        // 1. BUSCAR TURNO ACTIVO
        let currentShiftId = body.shift_id;
        if (!currentShiftId) {
          const activeShift = await prisma.shifts.findFirst({
            where: { estado: 'ABIERTO' },
            orderBy: { id: 'desc' },
          });

          if (!activeShift) {
            return reply.code(400).send({
              message: 'No hay turno abierto. Abre un turno en /shifts primero.',
            });
          }
          currentShiftId = activeShift.id;
        }

        const result = await prisma.$transaction(async (tx) => {
          // 2. Validar existencias
          const shiftExists = await tx.shifts.findUnique({ where: { id: currentShiftId! } });
          if (!shiftExists) throw new Error(`Turno ID ${currentShiftId} no existe`);

          const bidonItem = await tx.items.findUnique({ where: { id: body.bidon_item_id } });
          if (!bidonItem) throw new Error(`Item Bidón ID ${body.bidon_item_id} no existe`);

          // 3. Crear/Buscar Lote de Bidones
          // Usamos findFirst para evitar error unique constraint si ya existe
          let bidonLot = await tx.item_lots.findFirst({
            where: { item_id: body.bidon_item_id, lote_codigo: body.bidon_lote_codigo },
          });

          if (!bidonLot) {
            const fechaIngreso = new Date(fecha);
            fechaIngreso.setHours(0, 0, 0, 0);
            
            bidonLot = await tx.item_lots.create({
              data: {
                item_id: body.bidon_item_id,
                lote_codigo: body.bidon_lote_codigo,
                fecha_ingreso: fechaIngreso,
                costo_lote: 0, 
                cantidad_inicial: body.bidones_llenados,
              },
            });
          }

          // 4. Crear Batch
          const batch = await tx.production_batches.create({
            data: {
              shift_id: currentShiftId!,
              fecha_hora: fecha,
              bidones_llenados: body.bidones_llenados,
              observacion: body.observacion ?? null,
            },
          });

          // 5. Procesar Consumos
          for (const line of body.consumptions) {
            const lot = await tx.item_lots.findUnique({ where: { id: line.lot_id } });
            if (!lot) throw new Error(`Lote origen ID ${line.lot_id} no encontrado`);
            if (lot.item_id !== line.item_id) throw new Error(`Lote ${lot.lote_codigo} no es del item ${line.item_id}`);

            // Registrar consumo
            await tx.production_consumptions.create({
              data: {
                batch_id: batch.id,
                item_id: line.item_id,
                lot_id: line.lot_id,
                cantidad: line.cantidad,
              },
            });

            // Registrar Movimiento OUT
            await tx.inventory_movements.create({
              data: {
                item_id: line.item_id,
                lot_id: line.lot_id,
                motivo: inventory_movements_motivo.USO_PRODUCCION,
                tipo: inventory_movements_tipo.OUT,
                cantidad: line.cantidad,
                ref_tipo: 'BATCH',
                ref_id: batch.id,
                turno_id: currentShiftId,
                fecha_hora: fecha,
                observacion: body.observacion ?? null,
              },
            });
          }

          // 6. Registrar Entrada de Bidones (IN)
          await tx.inventory_movements.create({
            data: {
              item_id: body.bidon_item_id,
              lot_id: bidonLot!.id,
              motivo: inventory_movements_motivo.PRODUCCION,
              tipo: inventory_movements_tipo.IN,
              cantidad: body.bidones_llenados,
              ref_tipo: 'BATCH',
              ref_id: batch.id,
              turno_id: currentShiftId,
              fecha_hora: fecha,
              observacion: `Producción Batch #${batch.id}`,
            },
          });

          return { ...batch, bidon_lot_id: bidonLot!.id };
        });

        console.log('✅ Batch creado ID:', result.id);
        return reply.code(201).send(result);

      } catch (error: any) {
        console.error('❌ ERROR AL CREAR BATCH:', error);
        
        // CORRECCIÓN CLAVE: Enviamos el detalle del error en 'message' para que el frontend lo muestre
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Datos inválidos', error: error.errors });
        }
        
        // Devolvemos 500 pero con el mensaje específico
        return reply.code(500).send({ 
            message: `Error interno: ${errorMsg}`, 
            error: errorMsg 
        });
      }
    }
  );
}