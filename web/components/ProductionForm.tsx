'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// Tipos para los selectores
interface ItemOption {
  id: number;
  nombre: string;
}

interface LotOption {
  id: number;
  lote_codigo: string;
  stock_actual: number;
}

// Tipo para una línea de consumo en el frontend
interface ConsumptionLine {
  item_id: number;
  item_nombre: string;
  lot_id: number;
  lote_codigo: string;
  cantidad: number;
}

// Respuesta de la API al buscar lotes
interface StockLotsResponse {
  data: {
    lot_id: number;
    lote_codigo: string;
    stock_actual: number | string;
  }[];
}

export default function ProductionForm() {
  const router = useRouter();
  
  // --- Estados del Batch (Cabecera) ---
  const [bidones, setBidones] = useState('');
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // --- Estados para Agregar Consumo (Línea temporal) ---
  const [items, setItems] = useState<ItemOption[]>([]);
  const [lots, setLots] = useState<LotOption[]>([]);
  
  const [selItemId, setSelItemId] = useState('');
  const [selLotId, setSelLotId] = useState('');
  const [selCantidad, setSelCantidad] = useState('');
  const [fetchingLots, setFetchingLots] = useState(false);

  // --- Lista de Consumos Agregados ---
  const [consumptions, setConsumptions] = useState<ConsumptionLine[]>([]);

  // 1. Cargar Items al inicio
  useEffect(() => {
    api<ItemOption[]>('/items')
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch((err) => console.error('Error loading items:', err));
  }, []);

  // 2. Cargar Lotes cuando se selecciona un Item
  useEffect(() => {
    setLots([]);
    setSelLotId('');
    if (!selItemId) return;

    setFetchingLots(true);
    api<StockLotsResponse>(`/stock/items/${selItemId}/lots?pageSize=100`)
      .then((res) => {
        const raw = res.data || [];
        setLots(raw.map((l) => ({
          id: l.lot_id,
          lote_codigo: l.lote_codigo,
          stock_actual: Number(l.stock_actual)
        })));
      })
      .catch((err) => console.error('Error loading lots:', err))
      .finally(() => setFetchingLots(false));
  }, [selItemId]);

  // Función para agregar una línea a la lista
  const addLine = () => {
    if (!selItemId || !selLotId || !selCantidad) return;

    const item = items.find(i => i.id === Number(selItemId));
    const lot = lots.find(l => l.id === Number(selLotId));

    if (!item || !lot) return;

    const newLine: ConsumptionLine = {
      item_id: item.id,
      item_nombre: item.nombre,
      lot_id: lot.id,
      lote_codigo: lot.lote_codigo,
      cantidad: Number(selCantidad)
    };

    setConsumptions([...consumptions, newLine]);
    
    // Limpiar campos de línea
    setSelItemId('');
    setSelLotId('');
    setSelCantidad('');
    setLots([]);
  };

  const removeLine = (index: number) => {
    const filtered = consumptions.filter((_, i) => i !== index);
    setConsumptions(filtered);
  };

  // Función principal: Enviar Batch
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (consumptions.length === 0) {
      setMsg('❌ Debes agregar al menos un ítem de consumo.');
      return;
    }

    setLoading(true);
    setMsg('');

    try {
      // Estructura exacta que espera tu endpoint POST /production/batches
      const payload = {
        bidones_llenados: Number(bidones),
        observacion,
        consumptions: consumptions.map(c => ({
          item_id: c.item_id,
          lot_id: c.lot_id,
          cantidad: c.cantidad
        }))
      };

      await api('/production/batches', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setMsg('✅ Producción registrada correctamente');
      setBidones('');
      setObservacion('');
      setConsumptions([]);
      router.refresh();

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setMsg(`❌ Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 outline-none";

  return (
    <div className="space-y-6">
      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Registrar Batch de Producción</h3>
          {msg && <span className={`text-xs px-3 py-1 rounded-lg font-medium ${msg.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{msg}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bidones Producidos</label>
            <input 
              type="number" min="1" required 
              value={bidones} onChange={e => setBidones(e.target.value)} 
              className={inputClass} placeholder="Ej. 50" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observación</label>
            <input 
              type="text" 
              value={observacion} onChange={e => setObservacion(e.target.value)} 
              className={inputClass} placeholder="Lote interno..." 
            />
          </div>
        </div>

        {/* Zona de Agregar Ingredientes */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Agregar Insumos / Materia Prima</h4>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Insumo</label>
              <select 
                value={selItemId} 
                onChange={e => setSelItemId(e.target.value)} 
                className={inputClass}
              >
                <option value="">Seleccionar...</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Lote {fetchingLots && '...'}
              </label>
              <select 
                value={selLotId} 
                onChange={e => setSelLotId(e.target.value)} 
                className={inputClass}
                disabled={!selItemId}
              >
                <option value="">Seleccionar...</option>
                {lots.map(l => (
                  <option key={l.id} value={l.id}>{l.lote_codigo} (Stock: {l.stock_actual})</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad</label>
              <input 
                type="number" min="0.01" step="0.01"
                value={selCantidad} 
                onChange={e => setSelCantidad(e.target.value)} 
                className={inputClass} placeholder="0.00"
              />
            </div>

            <div className="sm:col-span-2">
              <button 
                type="button" 
                onClick={addLine}
                disabled={!selItemId || !selLotId || !selCantidad}
                className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de Consumos */}
        {consumptions.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-600 font-semibold">
                <tr>
                  <th className="px-4 py-2">Insumo</th>
                  <th className="px-4 py-2">Lote Origen</th>
                  <th className="px-4 py-2 text-right">Cantidad</th>
                  <th className="px-4 py-2 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {consumptions.map((line, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="px-4 py-2">{line.item_nombre}</td>
                    <td className="px-4 py-2">{line.lote_codigo}</td>
                    <td className="px-4 py-2 text-right font-mono">{line.cantidad}</td>
                    <td className="px-4 py-2 text-center">
                      <button 
                        type="button" 
                        onClick={() => removeLine(idx)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
            No hay insumos agregados al batch.
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button 
            type="submit" 
            disabled={loading || consumptions.length === 0}
            className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black disabled:opacity-50 transition-all"
          >
            {loading ? 'Registrando...' : 'Finalizar Producción'}
          </button>
        </div>
      </form>
    </div>
  );
}