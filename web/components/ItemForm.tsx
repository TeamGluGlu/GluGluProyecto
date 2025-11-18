'use client';
import { useState } from 'react';

export default function ItemForm() {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('TAPA');
  const [unidad, setUnidad] = useState('UND');
  const [cantidadInicial, setCantidadInicial] = useState(''); // NUEVO
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | undefined>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(undefined);

    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

    try {
      // 1) Crear item
      const resItem = await fetch(`${base}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          tipo,
          unidad,
          activo: true,
        }),
      });

      if (!resItem.ok) {
        throw new Error(await resItem.text());
      }

      const item = await resItem.json();

      // 2) Crear lote inicial si se indicó cantidad
      const qty = Number(cantidadInicial);
      if (!Number.isNaN(qty) && qty > 0) {
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const dd = String(hoy.getDate()).padStart(2, '0');
        const fecha = `${yyyy}-${mm}-${dd}`;
        const loteCodigo = `INIT-${item.id}-${yyyy}${mm}${dd}`;

        const resLot = await fetch(`${base}/item-lots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id: item.id,
            lote_codigo: loteCodigo,
            fecha_ingreso: fecha,
            costo_lote: 0,
            cantidad_inicial: qty,
          }),
        });

        if (!resLot.ok) {
          throw new Error(
            'Item creado pero error creando lote inicial: ' + (await resLot.text())
          );
        }
      }

      setMsg('✅ Item creado correctamente');
      setNombre('');
      setCantidadInicial('');
    } catch (err: any) {
      setMsg('❌ ' + (err?.message || 'Error al crear item'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border p-4 space-y-3 bg-black text-white"
    >
      <div className="text-sm font-medium">Nuevo Item</div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          className="border rounded-xl px-3 py-2 bg-black text-white"
        />

        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="border rounded-xl px-3 py-2 bg-black text-white"
        >
          <option value="TAPA">TAPA</option>
          <option value="PRECINTO">PRECINTO</option>
          <option value="ETIQUETA">ETIQUETA</option>
          <option value="CA_O">CAÑO</option>
          <option value="BIDON_NUEVO">BIDON_NUEVO</option>
          <option value="QUIMICO">QUIMICO</option>
        </select>

        <select
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          className="border rounded-xl px-3 py-2 bg-black text-white"
        >
          <option value="UND">UND</option>
          <option value="ML">ML</option>
          <option value="LT">LT</option>
          <option value="KG">KG</option>
        </select>

        {/* Cantidad inicial opcional */}
        <input
          type="number"
          min="0"
          step="0.01"
          value={cantidadInicial}
          onChange={(e) => setCantidadInicial(e.target.value)}
          placeholder="Cantidad inicial"
          className="border rounded-xl px-3 py-2 bg-black text-white"
        />
      </div>

      <button
        disabled={loading}
        className="px-4 py-2 rounded-xl bg-white text-black font-medium hover:bg-gray-200 transition"
      >
        {loading ? 'Guardando...' : 'Guardar Item'}
      </button>

      {msg && <div className="text-xs text-gray-300 mt-1">{msg}</div>}
    </form>
  );
}
