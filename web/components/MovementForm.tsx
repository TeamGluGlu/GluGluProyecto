// web/components/MovementForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface ItemOption {
  id: number;
  nombre: string;
}

// Estructura de respuesta de /stock/items/{id}/lots
interface StockItemLotsResponse {
  item: unknown;
  meta: unknown;
  data: {
    lot_id: number;
    lote_codigo: string;
    stock_actual: number;
  }[];
}

interface LotOption {
  id: number;
  lote_codigo: string;
  stock_actual: number;
}

export default function MovementForm() {
  const router = useRouter();

  // --- Estados ---
  const [items, setItems] = useState<ItemOption[]>([]);
  const [lots, setLots] = useState<LotOption[]>([]);
  
  const [itemId, setItemId] = useState('');
  const [lotId, setLotId] = useState('');
  const [tipo, setTipo] = useState<'IN' | 'OUT'>('IN');
  const [motivo, setMotivo] = useState('COMPRA');
  const [cantidad, setCantidad] = useState('');
  const [observacion, setObservacion] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingLots, setFetchingLots] = useState(false);
  const [message, setMessage] = useState('');

  // 1. Cargar Items
  useEffect(() => {
    api<ItemOption[]>('/items')
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch((err) => console.error('Error cargando items:', err));
  }, []);

  // 2. Cargar Lotes (USANDO EL NUEVO ENDPOINT)
  useEffect(() => {
    setLots([]);
    setLotId('');
    if (!itemId) return;

    setFetchingLots(true);
    
    // CAMBIO: Usamos la ruta específica /stock/items/{id}/lots
    api<StockItemLotsResponse>(`/stock/items/${itemId}/lots?pageSize=100`)
      .then((res) => {
        // La API devuelve { data: [...] }
        const rawList = res.data || [];
        
        const lotsFormatted: LotOption[] = rawList.map((l) => ({
          id: l.lot_id, 
          lote_codigo: l.lote_codigo,
          stock_actual: Number(l.stock_actual)
        }));
        setLots(lotsFormatted);
      })
      .catch((err) => console.error('Error cargando lotes:', err))
      .finally(() => setFetchingLots(false));
  }, [itemId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const payload = {
      item_id: Number(itemId),
      lot_id: Number(lotId),
      tipo,
      motivo,
      cantidad: Number(cantidad),
      observacion
    };

    try {
      await api('/movements', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setMessage('✅ Movimiento registrado correctamente');
      setCantidad('');
      setObservacion('');
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'No se pudo registrar';
      setMessage(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full border border-gray-300 rounded-xl px-4 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-sm";
  const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1 block mb-1";

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">Registrar Movimiento</h3>
        {message && (
          <span className={`text-xs font-medium px-2 py-1 rounded-md ${
            message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Producto</label>
          <select required value={itemId} onChange={(e) => setItemId(e.target.value)} className={inputClass}>
            <option value="">Seleccionar Producto...</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Lote {fetchingLots && <span className="text-gray-400 normal-case">(Cargando...)</span>}
          </label>
          <select required value={lotId} onChange={(e) => setLotId(e.target.value)} className={inputClass} disabled={!itemId || fetchingLots}>
            <option value="">Seleccionar Lote...</option>
            {lots.map(l => (
              <option key={l.id} value={l.id}>
                {l.lote_codigo} (Stock: {l.stock_actual})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Tipo Movimiento</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setTipo('IN')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${tipo === 'IN' ? 'bg-green-50 border-green-200 text-green-700 ring-2 ring-green-500 ring-opacity-20' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>⬇ Entrada</button>
            <button type="button" onClick={() => setTipo('OUT')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${tipo === 'OUT' ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-500 ring-opacity-20' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>⬆ Salida</button>
          </div>
        </div>

        <div>
          <label className={labelClass}>Motivo</label>
          <select required value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputClass}>
            {tipo === 'IN' ? (
               <>
                 <option value="COMPRA">Compra</option>
                 <option value="DEVOLUCION">Devolución</option>
                 <option value="AJUSTE">Ajuste (+)</option>
               </>
            ) : (
               <>
                 <option value="USO_PRODUCCION">Uso en Producción</option>
                 <option value="MERMA">Merma / Desperdicio</option>
                 <option value="AJUSTE">Ajuste (-)</option>
               </>
            )}
            <option value="OTRO">Otro</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Cantidad</label>
          <input type="number" min="0.01" step="0.01" required value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="0.00" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Observación</label>
          <input type="text" value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="..." className={inputClass} />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading} className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-md ${loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black hover:shadow-lg active:scale-95'}`}>
          {loading ? 'Procesando...' : 'Registrar Movimiento'}
        </button>
      </div>
    </form>
  );
}