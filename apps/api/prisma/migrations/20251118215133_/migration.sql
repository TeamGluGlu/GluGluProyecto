-- CreateEnum
CREATE TYPE "items_tipo" AS ENUM ('TAPA', 'PRECINTO', 'ETIQUETA', 'CAÑO', 'BIDON_NUEVO', 'QUIMICO');

-- CreateEnum
CREATE TYPE "inventory_movements_tipo" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "items_unidad" AS ENUM ('UND', 'ML', 'LT', 'KG');

-- CreateEnum
CREATE TYPE "inventory_movements_motivo" AS ENUM ('COMPRA', 'USO_PRODUCCION', 'MERMA', 'AJUSTE', 'DEVOLUCION');

-- CreateEnum
CREATE TYPE "production_wastes_razon" AS ENUM ('DEFECTO', 'CONTAMINADO', 'DOBLADO', 'MAL_CORTE', 'IMPRESO_MAL', 'OTRO');

-- CreateEnum
CREATE TYPE "shifts_estado" AS ENUM ('ABIERTO', 'CERRADO');

-- CreateTable
CREATE TABLE "dispatches" (
    "id" SERIAL NOT NULL,
    "fecha_hora_salida" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bidones_llevados" INTEGER NOT NULL DEFAULT 0,
    "chofer" VARCHAR(100),
    "placa" VARCHAR(20),
    "observacion" VARCHAR(255),

    CONSTRAINT "dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" BIGSERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "lot_id" INTEGER NOT NULL,
    "tipo" "inventory_movements_tipo" NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "motivo" "inventory_movements_motivo" NOT NULL,
    "ref_tipo" VARCHAR(50),
    "ref_id" INTEGER,
    "turno_id" INTEGER,
    "fecha_hora" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" VARCHAR(255),

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_lots" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "lote_codigo" VARCHAR(50) NOT NULL,
    "fecha_ingreso" DATE NOT NULL,
    "costo_lote" DECIMAL(10,2) NOT NULL,
    "cantidad_inicial" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "item_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "tipo" "items_tipo" NOT NULL,
    "unidad" "items_unidad" NOT NULL DEFAULT 'UND',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_batches" (
    "id" SERIAL NOT NULL,
    "shift_id" INTEGER NOT NULL,
    "fecha_hora" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bidones_llenados" INTEGER NOT NULL DEFAULT 0,
    "observacion" VARCHAR(255),

    CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_consumptions" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "lot_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "production_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_wastes" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "lot_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "razon" "production_wastes_razon" NOT NULL DEFAULT 'OTRO',

    CONSTRAINT "production_wastes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "returns_log" (
    "id" SERIAL NOT NULL,
    "dispatch_id" INTEGER NOT NULL,
    "fecha_hora_retorno" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vacios_regresan" INTEGER NOT NULL DEFAULT 0,
    "nota" VARCHAR(255),

    CONSTRAINT "returns_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "numero" SMALLINT NOT NULL,
    "hora_inicio" TIME(0) NOT NULL,
    "hora_fin" TIME(0),
    "supervisor" VARCHAR(100),
    "estado" "shifts_estado" NOT NULL DEFAULT 'ABIERTO',
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thresholds" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "minimo_alerta" DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_dispatches_fecha" ON "dispatches"("fecha_hora_salida");

-- CreateIndex
CREATE INDEX "idx_im_fecha" ON "inventory_movements"("fecha_hora");

-- CreateIndex
CREATE INDEX "idx_im_item" ON "inventory_movements"("item_id");

-- CreateIndex
CREATE INDEX "idx_im_lot" ON "inventory_movements"("lot_id");

-- CreateIndex
CREATE INDEX "idx_im_tipo_motivo" ON "inventory_movements"("tipo", "motivo");

-- CreateIndex
CREATE INDEX "idx_im_turno" ON "inventory_movements"("turno_id");

-- CreateIndex
CREATE INDEX "idx_item_lots_fecha" ON "item_lots"("fecha_ingreso");

-- CreateIndex
CREATE UNIQUE INDEX "uq_item_lots_item_lote" ON "item_lots"("item_id", "lote_codigo");

-- CreateIndex
CREATE UNIQUE INDEX "uq_items_nombre" ON "items"("nombre");

-- CreateIndex
CREATE INDEX "idx_items_tipo" ON "items"("tipo");

-- CreateIndex
CREATE INDEX "idx_batches_fecha" ON "production_batches"("fecha_hora");

-- CreateIndex
CREATE INDEX "idx_batches_shift_fecha" ON "production_batches"("shift_id", "fecha_hora");

-- CreateIndex
CREATE INDEX "idx_pcons_batch" ON "production_consumptions"("batch_id");

-- CreateIndex
CREATE INDEX "idx_pcons_item" ON "production_consumptions"("item_id");

-- CreateIndex
CREATE INDEX "idx_pcons_lot" ON "production_consumptions"("lot_id");

-- CreateIndex
CREATE INDEX "idx_pwaste_batch" ON "production_wastes"("batch_id");

-- CreateIndex
CREATE INDEX "idx_pwaste_item" ON "production_wastes"("item_id");

-- CreateIndex
CREATE INDEX "idx_pwaste_lot" ON "production_wastes"("lot_id");

-- CreateIndex
CREATE INDEX "idx_returns_dispatch" ON "returns_log"("dispatch_id");

-- CreateIndex
CREATE INDEX "idx_returns_fecha" ON "returns_log"("fecha_hora_retorno");

-- CreateIndex
CREATE UNIQUE INDEX "uq_shifts_fecha_numero" ON "shifts"("fecha", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "uq_threshold_item" ON "thresholds"("item_id");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "fk_im_item" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "fk_im_lot" FOREIGN KEY ("lot_id") REFERENCES "item_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "fk_im_shift" FOREIGN KEY ("turno_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_lots" ADD CONSTRAINT "fk_item_lots_item" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "fk_batches_shift" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_consumptions" ADD CONSTRAINT "fk_pcons_batch" FOREIGN KEY ("batch_id") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_consumptions" ADD CONSTRAINT "fk_pcons_item" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_consumptions" ADD CONSTRAINT "fk_pcons_lot" FOREIGN KEY ("lot_id") REFERENCES "item_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_wastes" ADD CONSTRAINT "fk_pwaste_batch" FOREIGN KEY ("batch_id") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_wastes" ADD CONSTRAINT "fk_pwaste_item" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_wastes" ADD CONSTRAINT "fk_pwaste_lot" FOREIGN KEY ("lot_id") REFERENCES "item_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns_log" ADD CONSTRAINT "fk_returns_dispatch" FOREIGN KEY ("dispatch_id") REFERENCES "dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thresholds" ADD CONSTRAINT "fk_threshold_item" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
