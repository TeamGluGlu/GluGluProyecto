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

  // Clases base
  const inputClass = "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all placeholder:text-gray-400";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5";
  
  // Tu clase personalizada para botones
  const buttonClass = "px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-md bg-gray-900 text-white hover:bg-black hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-6">
      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8">
        
        {/* Encabezado del Formulario */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Registrar Batch</h3>
            <p className="text-xs text-gray-500 mt-1">Ingresa los detalles de la producción y sus consumos.</p>
          </div>
          {msg && (
            <span className={`text-xs px-3 py-1.5 rounded-lg font-bold animate-pulse ${msg.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {msg}
            </span>
          )}
        </div>

        {/* Inputs Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Bidones Producidos</label>
            <div className="relative">
              <input 
                type="number" min="1" required 
                value={bidones} onChange={e => setBidones(e.target.value)} 
                className={inputClass} placeholder="Ej. 50" 
              />
              <span className="absolute right-4 top-2.5 text-gray-400 text-sm pointer-events-none">unid.</span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Observación</label>
            <input 
              type="text" 
              value={observacion} onChange={e => setObservacion(e.target.value)} 
              className={inputClass} placeholder="Ej. Lote interno 2024-A" 
            />
          </div>
        </div>

        {/* Zona de Agregar Ingredientes (Gris Claro) */}
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
          <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-900"></span>
            Agregar Insumos / Materia Prima
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            
            <div className="sm:col-span-4">
              <label className={labelClass}>Insumo</label>
              <select 
                value={selItemId} 
                onChange={e => setSelItemId(e.target.value)} 
                className={inputClass}
              >
                <option value="">Seleccionar ítem...</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className={labelClass}>
                Lote {fetchingLots && <span className="animate-pulse lowercase text-gray-400">(cargando...)</span>}
              </label>
              <select 
                value={selLotId} 
                onChange={e => setSelLotId(e.target.value)} 
                className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-400`}
                disabled={!selItemId}
              >
                <option value="">Seleccionar lote...</option>
                {lots.map(l => (
                  <option key={l.id} value={l.id}>{l.lote_codigo} (Stock: {l.stock_actual})</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Cantidad</label>
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
                // Aquí aplicamos tu estilo + w-full para que llene la columna
                className={`w-full ${buttonClass}`}
              >
                + Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de Consumos */}
        <div>
           {consumptions.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Insumo</th>
                    <th className="px-6 py-3">Lote Origen</th>
                    <th className="px-6 py-3 text-right">Cantidad</th>
                    <th className="px-6 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {consumptions.map((line, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{line.item_nombre}</td>
                      <td className="px-6 py-3 text-gray-600">{line.lote_codigo}</td>
                      <td className="px-6 py-3 text-right font-mono text-gray-700">{line.cantidad}</td>
                      <td className="px-6 py-3 text-center">
                        <button 
                          type="button" 
                          onClick={() => removeLine(idx)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Eliminar línea"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
              <div className="text-gray-300 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">No hay insumos agregados.</p>
              <p className="text-xs text-gray-400">Selecciona un insumo y lote arriba para comenzar.</p>
            </div>
          )}
        </div>

        {/* Footer con Botón Principal */}
        <div className="flex justify-end pt-6 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading || consumptions.length === 0}
            className="px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-md bg-gray-900 text-white hover:bg-black hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
            {loading ? 'Registrando...' : 'Finalizar Producción'}
            </button>

        </div>
      </form>
    </div>
  );
}