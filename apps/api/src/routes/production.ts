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
      description: 'REGISTRAR un nuevo batch de producción',
      tags: ['Production', 'Movements'],
      body: CreateBatchJsonSchema,
      response: {
        201: BatchResponseSchema,
        400: { type: 'object', properties: { message: { type: 'string' } } },
        500: { type: 'object', properties: { message: { type: 'string' }, error: { type: 'string' } } },
      },
    },
  },
  async (req, reply) => {
    try {
      const body = CreateBatchSchema.parse(req.body);
      const fecha = body.fecha_hora ? new Date(body.fecha_hora) : new Date();

      console.log('📦 Intentando crear batch con:', JSON.stringify(body, null, 2));

      // 1. BUSCAR TURNO ACTIVO
      let currentShiftId = body.shift_id;

      if (!currentShiftId) {
        console.log('🔍 Buscando turno activo...');
        const activeShift = await prisma.shifts.findFirst({
          where: { estado: 'ABIERTO' },
          orderBy: { id: 'desc' },
        });

        console.log('🔍 Resultado búsqueda turno:', activeShift);

        if (!activeShift) {
          console.log('❌ No hay turno abierto');
          return reply.code(400).send({
            message: 'No hay un turno abierto actualmente. Inicia un turno primero.',
          });
        }
        currentShiftId = activeShift.id;
        console.log('✅ Turno encontrado:', currentShiftId);
      }

      console.log(`📝 Creating batch for Shift ID: ${currentShiftId}`);

      const result = await prisma.$transaction(async (tx) => {
        // 2. Verificar que el shift existe
        const shiftExists = await tx.shifts.findUnique({
          where: { id: currentShiftId! },
        });

        if (!shiftExists) {
          throw new Error(`Shift con ID ${currentShiftId} no existe en la base de datos`);
        }

        console.log('✅ Shift validado:', shiftExists);

        // 3. Verificar que el item de bidón existe
        const bidonItem = await tx.items.findUnique({
          where: { id: body.bidon_item_id },
        });

        if (!bidonItem) {
          throw new Error(`Item de bidón con ID ${body.bidon_item_id} no encontrado`);
        }

        console.log('✅ Item de bidón validado:', bidonItem.nombre);

        // 4. Crear o buscar el lote para los bidones producidos
        const fechaIngreso = new Date(fecha);
        fechaIngreso.setHours(0, 0, 0, 0); // Solo fecha, sin hora

        let bidonLot = await tx.item_lots.findFirst({
          where: {
            item_id: body.bidon_item_id,
            lote_codigo: body.bidon_lote_codigo,
          },
        });

        if (!bidonLot) {
          console.log('📦 Creando nuevo lote para bidones...');
          bidonLot = await tx.item_lots.create({
            data: {
              item_id: body.bidon_item_id,
              lote_codigo: body.bidon_lote_codigo,
              fecha_ingreso: fechaIngreso,
              costo_lote: 0, // Podrías calcularlo basado en los consumos
              cantidad_inicial: body.bidones_llenados,
            },
          });
          console.log('✅ Lote de bidones creado:', bidonLot.id);
        }

        // 5. Crear Batch
        console.log('📝 Creando batch...');
        const batch = await tx.production_batches.create({
          data: {
            shift_id: currentShiftId!,
            fecha_hora: fecha,
            bidones_llenados: body.bidones_llenados,
            observacion: body.observacion ?? null,
          },
        });

        console.log('✅ Batch creado:', batch.id);

        // 6. Procesar CONSUMOS (materias primas) - SALEN del inventario
        for (const line of body.consumptions) {
          console.log(`📦 Procesando consumo: item ${line.item_id}, lot ${line.lot_id}, cantidad ${line.cantidad}`);

          // Validar que el lote existe y pertenece al item correcto
          const lot = await tx.item_lots.findUnique({
            where: { id: line.lot_id },
          });

          if (!lot) {
            throw new Error(`Lote ${line.lot_id} no encontrado`);
          }

          if (lot.item_id !== line.item_id) {
            throw new Error(`Lote ${line.lot_id} no pertenece al item ${line.item_id}`);
          }

          console.log(`✅ Lote validado: ${lot.lote_codigo}`);

          // A) Registrar Consumo (SIN turno_id)
          await tx.production_consumptions.create({
            data: {
              batch_id: batch.id,
              item_id: line.item_id,
              lot_id: line.lot_id,
              cantidad: line.cantidad,
            },
          });

          console.log(`✅ Consumo registrado para item ${line.item_id}`);

          // B) Registrar Movimiento OUT (CON turno_id) - RESTA del stock
          await tx.inventory_movements.create({
            data: {
              item_id: line.item_id,
              lot_id: line.lot_id,
              tipo: 'OUT',
              motivo: 'USO_PRODUCCION',
              cantidad: line.cantidad,
              ref_tipo: 'BATCH',
              ref_id: batch.id,
              turno_id: currentShiftId,
              fecha_hora: fecha,
              observacion: body.observacion ?? null,
            },
          });

          console.log(`✅ Movimiento OUT registrado para item ${line.item_id}`);
        }

        // 7. Registrar ENTRADA de bidones producidos - SUMA al stock
        console.log(`🏭 Registrando entrada de ${body.bidones_llenados} bidones...`);
        
        await tx.inventory_movements.create({
          data: {
            item_id: body.bidon_item_id,
            lot_id: bidonLot.id,
            tipo: 'IN',
            motivo: 'PRODUCCION',
            cantidad: body.bidones_llenados,
            ref_tipo: 'BATCH',
            ref_id: batch.id,
            turno_id: currentShiftId,
            fecha_hora: fecha,
            observacion: `Producción de batch #${batch.id}`,
          },
        });

        console.log('✅ Entrada de bidones registrada');
        console.log('✅ Todos los consumos y movimientos procesados');

        return {
          ...batch,
          bidon_lot_id: bidonLot.id,
        };
      });

      console.log('🎉 Batch creado exitosamente:', result.id);
      return reply.code(201).send(result);

    } catch (error: any) {
      console.error('❌ ERROR AL CREAR BATCH:', error);
      console.error('Stack trace:', error.stack);

      // Distinguir tipos de error
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Datos de entrada inválidos',
          error: JSON.stringify(error.errors),
        });
      }

      if (error.code === 'P2003') {
        return reply.code(400).send({
          message: 'Referencia inválida: uno de los IDs no existe en la base de datos',
          error: error.meta?.field_name || error.message,
        });
      }

      if (error.code === 'P2002') {
        return reply.code(400).send({
          message: 'Violación de constraint único',
          error: error.message,
        });
      }

      return reply.code(500).send({
        message: 'Error interno al procesar el batch',
        error: error.message,
      });
    }
  }
);}