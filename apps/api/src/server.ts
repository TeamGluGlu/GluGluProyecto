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
import { registerProductionRoutes } from './routes/production.js'; // 👈 Agregar este import

const app = Fastify({ logger: true });
const prisma = new PrismaClient();

// ---------------------- Plugins ----------------------
await app.register(cors, { origin: true });
await app.register(swagger, {
    openapi: {
    info: { title: 'GluGlu API', version: '1.0.0' }
    }
});
await app.register(swaggerUI, { routePrefix: '/docs' });

// ---------------------- Schemas (Zod) ----------------------
const idParamSchema = z.object({
    id: z.coerce.number().int().positive()
});

const createItemSchema = z.object({
    nombre: z.string().min(2).max(100),
    tipo: z.enum(['TAPA', 'PRECINTO', 'ETIQUETA', 'CA_O', 'BIDON_NUEVO', 'QUIMICO']),
    unidad: z.enum(['UND', 'ML', 'LT', 'KG']).default('UND'),
    activo: z.boolean().default(true)
});

const updateItemSchema = createItemSchema.partial();

// ---------------------- Rutas básicas ----------------------
app.get('/health', async () => ({ ok: true }));

// LISTAR items
app.get('/items', async () => {
    return prisma.items.findMany({ orderBy: { nombre: 'asc' } });
});

// OBTENER item por id
app.get('/items/:id', async (req, reply) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());

    const item = await prisma.items.findUnique({ where: { id: parsed.data.id } });
    if (!item) return reply.code(404).send({ message: 'Item no encontrado' });

    return item;
});

// CREAR item
app.post('/items', async (req, reply) => {
    const parsed = createItemSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());

    const created = await prisma.items.create({ data: parsed.data });
    return reply.code(201).send(created);
});

// ACTUALIZAR item
app.put('/items/:id', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return reply.code(400).send(params.error.flatten());

    const body = updateItemSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send(body.error.flatten());

    try {
        const updated = await prisma.items.update({
        where: { id: params.data.id },
        data: body.data
    });
        return updated;
    } catch {
    return reply.code(404).send({ message: 'Item no encontrado' });
    }
});

// ELIMINAR item (soft-delete)
app.delete('/items/:id', async (req, reply) => {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) return reply.code(400).send(params.error.flatten());

  try {
    const updated = await prisma.items.update({
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

app.log.info('Registrando rutas: production'); // 👈 Agregar este log
await registerProductionRoutes(app, prisma); // 👈 Agregar este registro

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