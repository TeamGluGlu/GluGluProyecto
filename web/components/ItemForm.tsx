'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ItemForm() {
  const router = useRouter();
  
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('TAPA');
  const [unidad, setUnidad] = useState('UND');
  const [minimo, setMinimo] = useState(''); // <-- NUEVO ESTADO
  const [cantidadInicial, setCantidadInicial] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | undefined>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(undefined);

    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      // 1) Crear item (Ahora enviamos 'minimo')
      const resItem = await fetch(`${base}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          tipo,
          unidad,
          minimo: Number(minimo) || 0, // <-- ENVIAMOS EL MÍNIMO AL BACKEND
          activo: true,
        }),
      });

      if (!resItem.ok) throw new Error(await resItem.text());
      const item = await resItem.json();

      // 2) Crear lote inicial
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

        if (!resLot.ok) throw new Error('Error creando lote inicial: ' + (await resLot.text()));
      }

      setMsg('✅ Item creado correctamente');
      // Resetear campos
      setNombre('');
      setCantidadInicial('');
      setMinimo(''); // Resetear mínimo
      
      router.refresh(); 

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al crear item';
        setMsg('❌ ' + message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full border border-gray-300 rounded-xl px-4 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-sm";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm space-y-5 text-gray-900"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">Crear Nuevo Item</h3>
        {msg && (
          <span className={`text-xs font-medium px-2 py-1 rounded-md ${msg.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {msg}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4"> {/* Cambiado a 5 columnas para que quepa el nuevo campo */}
        
        {/* Nombre */}
        <div className="space-y-1 md:col-span-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Nombre</label>
          <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Tapa Azul" className={inputClass} />
        </div>

        {/* Tipo */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${inputClass} appearance-none cursor-pointer`}>
            <option value="TAPA">TAPA</option>
            <option value="PRECINTO">PRECINTO</option>
            <option value="ETIQUETA">ETIQUETA</option>
            <option value="CA_O">CAÑO</option>
            <option value="BIDON_NUEVO">BIDON NUEVO</option>
            <option value="QUIMICO">QUIMICO</option>
          </select>
        </div>

        {/* Unidad */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Unidad</label>
          <select value={unidad} onChange={(e) => setUnidad(e.target.value)} className={`${inputClass} appearance-none cursor-pointer`}>
            <option value="UND">UND</option>
            <option value="ML">ML</option>
            <option value="LT">LT</option>
            <option value="KG">KG</option>
          </select>
        </div>

        {/* --- NUEVO CAMPO: MÍNIMO (ALERTA) --- */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1 text-red-500">Mínimo (Alerta)</label>
          <input
            type="number"
            min="0"
            value={minimo}
            onChange={(e) => setMinimo(e.target.value)}
            placeholder="Ej. 10"
            className={`${inputClass} border-red-100 focus:ring-red-500`} // Un toque rojo sutil para indicar que es una alerta
          />
        </div>

        {/* Stock Inicial */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Stock Inicial</label>
          <input type="number" min="0" step="0.01" value={cantidadInicial} onChange={(e) => setCantidadInicial(e.target.value)} placeholder="0" className={inputClass} />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          disabled={loading}
          className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-md ${loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black hover:shadow-lg active:scale-95'}`}
        >
          {loading ? 'Guardando...' : 'Guardar Item'}
        </button>
      </div>
    </form>
  );
}