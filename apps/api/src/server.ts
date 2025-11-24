// apps/api/src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import './utils/bigint-json.js';

// Rutas modulares
import { registerItemLotsRoutes } from './routes/itemLots.js';
import { registerMovementRoutes } from './routes/movements.js';
import { registerStockRoutes } from './routes/stock.js';
import { registerProductionRoutes } from './routes/production.js'; 

const app = Fastify({ logger: true });
const prisma = new PrismaClient();

// ---------------------- Plugins ----------------------
await app.register(cors, { origin: true });
await app.register(swagger, {
    openapi: {
        info: { title: 'GluGlu API', version: '1.0.0' },
        tags: [
            { name: 'Items', description: 'Gestión de ítems' },
            { name: 'ItemLots', description: 'Gestión de lotes de ítems' },
            { name: 'Movements', description: 'Gestión de movimientos de inventario (Kardex)' },
            { name: 'Stock', description: 'Consultas de Stock' },
            { name: 'Production', description: 'Gestión de producción/consumos' },
            { name: 'Dev', description: 'Rutas de desarrollo y prueba' },
        ],
    }
});
await app.register(swaggerUI, { routePrefix: '/docs' });

// ---------------------- Schemas (Zod y JSON Schema) ----------------------
const idParamSchema = z.object({
    id: z.coerce.number().int().positive()
});
// JSON Schema para parámetros de ID
const idParamJsonSchema = {
    type: 'object',
    properties: { id: { type: 'number', description: 'ID del ítem' } },
    required: ['id']
};

const itemBaseSchema = {
    type: 'object',
    properties: {
        id: { type: 'number' },
        nombre: { type: 'string' },
        tipo: { type: 'string', enum: ['TAPA', 'PRECINTO', 'ETIQUETA', 'CA_O', 'BIDON_NUEVO', 'QUIMICO'] },
        unidad: { type: 'string', enum: ['UND', 'ML', 'LT', 'KG'] },
        activo: { type: 'boolean' },
        // Agregamos esto para que se vea en la respuesta si se desea
        minimo_alerta: { type: 'number', nullable: true } 
    }
};

// --- MODIFICACIÓN 1: Agregar 'minimo' al schema de creación ---
const createItemSchema = z.object({
    nombre: z.string().min(2).max(100),
    tipo: z.enum(['TAPA', 'PRECINTO', 'ETIQUETA', 'CA_O', 'BIDON_NUEVO', 'QUIMICO']),
    unidad: z.enum(['UND', 'ML', 'LT', 'KG']).default('UND'),
    activo: z.boolean().default(true),
    minimo: z.number().nonnegative().optional() // <--- NUEVO CAMPO
});

// JSON Schema para Item (Request Body)
const createItemJsonSchema = {
    type: 'object',
    properties: {
        nombre: { type: 'string', description: 'Nombre del ítem (mín. 2, máx. 100)' },
        tipo: { type: 'string', enum: ['TAPA', 'PRECINTO', 'ETIQUETA', 'CA_O', 'BIDON_NUEVO', 'QUIMICO'], description: 'Tipo de ítem' },
        unidad: { type: 'string', enum: ['UND', 'ML', 'LT', 'KG'], default: 'UND', description: 'Unidad de medida' },
        activo: { type: 'boolean', default: true, description: 'Estado del ítem' },
        minimo: { type: 'number', description: 'Stock mínimo para alerta' } // <--- Documentación
    },
    required: ['nombre', 'tipo'],
    additionalProperties: false
};

const updateItemSchema = createItemSchema.partial();
// JSON Schema para Item (Partial Request Body)
const updateItemJsonSchema = {
    type: 'object',
    properties: createItemJsonSchema.properties,
    additionalProperties: false
};

// ---------------------- Rutas básicas ----------------------
app.get('/health', { schema: { tags: ['Dev'], description: 'Verifica el estado de la API' } }, async () => ({ ok: true }));

// LISTAR items
app.get('/items', {
    schema: {
        description: 'LISTAR todos los ítems',
        tags: ['Items'],
        response: {
            200: {
                type: 'array',
                items: itemBaseSchema,
            }
        }
    }
}, async () => {
    // Incluimos la relación thresholds para ver el mínimo actual
    const items = await prisma.items.findMany({ 
        orderBy: { nombre: 'asc' },
        include: { thresholds: true } 
    });
    
    // Aplanamos la respuesta para que 'minimo_alerta' parezca parte del ítem
    return items.map(i => ({
        ...i,
        minimo_alerta: i.thresholds?.minimo_alerta ? Number(i.thresholds.minimo_alerta) : 0
    }));
});

// OBTENER item por id
app.get('/items/:id', {
    schema: {
        description: 'OBTENER un ítem por ID',
        tags: ['Items'],
        params: idParamJsonSchema,
        response: {
            200: itemBaseSchema,
            404: { type: 'object', properties: { message: { type: 'string' } } }
        }
    }
}, async (req, reply) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());

    const item = await prisma.items.findUnique({ 
        where: { id: parsed.data.id },
        include: { thresholds: true }
    });
    if (!item) return reply.code(404).send({ message: 'Item no encontrado' });

    return {
        ...item,
        minimo_alerta: item.thresholds?.minimo_alerta ? Number(item.thresholds.minimo_alerta) : 0
    };
});

// CREAR item (CORREGIDO)
app.post('/items', {
    schema: {
        description: 'CREAR un nuevo ítem',
        tags: ['Items'],
        body: createItemJsonSchema,
        response: {
            201: itemBaseSchema,
            400: { type: 'object', properties: { message: { type: 'string' } } },
            409: { type: 'object', properties: { message: { type: 'string' } } }, 
        }
    }
}, async (req, reply) => {
    const parsed = createItemSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());

    const { minimo, ...itemData } = parsed.data;

    // --- MODIFICACIÓN 2: Transacción para crear Item + Threshold ---
    const created = await prisma.items.create({
        data: {
            ...itemData,
            // Si viene 'minimo', creamos la relación con la tabla thresholds
            thresholds: minimo !== undefined ? {
                create: { minimo_alerta: minimo }
            } : undefined
        },
        include: { thresholds: true }
    });

    return reply.code(201).send({
        ...created,
        minimo_alerta: created.thresholds?.minimo_alerta ? Number(created.thresholds.minimo_alerta) : 0
    });
});

// ACTUALIZAR item (CORREGIDO)
app.put('/items/:id', {
    schema: {
        description: 'ACTUALIZAR un ítem existente por ID',
        tags: ['Items'],
        params: idParamJsonSchema,
        body: updateItemJsonSchema,
        response: {
            200: itemBaseSchema,
            400: { type: 'object', properties: { message: { type: 'string' } } },
            404: { type: 'object', properties: { message: { type: 'string' } } }
        }
    }
}, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return reply.code(400).send(params.error.flatten());

    const body = updateItemSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send(body.error.flatten());

    const { minimo, ...itemData } = body.data;

    try {
        // --- MODIFICACIÓN 3: Actualizar Item y Threshold (Upsert) ---
        const updated = await prisma.items.update({
            where: { id: params.data.id },
            data: {
                ...itemData,
                thresholds: minimo !== undefined ? {
                    upsert: {
                        create: { minimo_alerta: minimo },
                        update: { minimo_alerta: minimo }
                    }
                } : undefined
            },
            include: { thresholds: true }
        });

        return {
            ...updated,
            minimo_alerta: updated.thresholds?.minimo_alerta ? Number(updated.thresholds.minimo_alerta) : 0
        };
    } catch (e) {
        req.log.error(e);
        return reply.code(404).send({ message: 'Item no encontrado o error al actualizar' });
    }
});

// ELIMINAR item (soft-delete)
app.delete('/items/:id', {
    schema: {
        description: 'ELIMINAR (soft-delete) un ítem por ID',
        tags: ['Items'],
        params: idParamJsonSchema,
        response: {
            204: { type: 'null' },
            404: { type: 'object', properties: { message: { type: 'string' } } }
        }
    }
}, async (req, reply) => {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) return reply.code(400).send(params.error.flatten());

  try {
    await prisma.items.update({
      where: { id: params.data.id },
      data: { activo: false },
    });
    return reply.code(204).send();
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return reply.code(404).send({ message: 'Item no encontrado' });
    }
    req.log.error(e, 'Error al eliminar item');
    return reply.code(500).send({ message: 'Error eliminando item', error: e?.message });
  }
});

// ---------------------- Registro de rutas modulares ----------------------
app.log.info('Registrando rutas: item-lots');
await registerItemLotsRoutes(app, prisma);

app.log.info('Registrando rutas: movements');
await registerMovementRoutes(app, prisma);

app.log.info('Registrando rutas: stock');
await registerStockRoutes(app, prisma);

app.log.info('Registrando rutas: production'); 
await registerProductionRoutes(app, prisma); 

// ---------------------- Error handler global ----------------------
app.setErrorHandler((err, _req, reply) => {
        app.log.error(err);
        if ((err as any).code === 'P2002') {
        return reply.code(409).send({ message: 'Registro duplicado (unique constraint)' });
    }
    return reply.code(500).send({ message: 'Error interno' });
});

// ---------------------- Arranque ----------------------
const PORT = Number(process.env.PORT || 3001);
app
    .listen({ port: PORT, host: '0.0.0.0' })
    .then(() => app.log.info(`API escuchando en http://localhost:${PORT}  |  Docs: /docs`))
    .catch((err) => {
    app.log.error(err);
    process.exit(1);
});