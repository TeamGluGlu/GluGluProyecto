'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// Tipos
interface ItemOption {
  id: number;
  nombre: string;
}

interface LotOption {
  id: number;
  lote_codigo: string;
  stock_actual: number;
}

interface ConsumptionLine {
  item_id: number;
  item_nombre: string;
  lot_id: number;
  lote_codigo: string;
  cantidad: number;
}

interface StockLotsResponse {
  data: {
    lot_id: number;
    lote_codigo: string;
    stock_actual: number | string;
  }[];
}

interface ProductionFormProps {
  onSuccess?: () => void;
}

export default function ProductionForm({ onSuccess }: ProductionFormProps) {
  const router = useRouter();
  
  // --- Estados del Batch (Producto Final) ---
  const [bidones, setBidones] = useState('');
  const [bidonItemId, setBidonItemId] = useState(''); // <--- NUEVO
  const [bidonLoteCodigo, setBidonLoteCodigo] = useState(''); // <--- NUEVO
  const [observacion, setObservacion] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // --- Estados para Agregar Consumo (Materia Prima) ---
  const [items, setItems] = useState<ItemOption[]>([]);
  const [lots, setLots] = useState<LotOption[]>([]);
  
  const [selItemId, setSelItemId] = useState('');
  const [selLotId, setSelLotId] = useState('');
  const [selCantidad, setSelCantidad] = useState('');
  const [fetchingLots, setFetchingLots] = useState(false);

  // --- Lista de Consumos ---
  const [consumptions, setConsumptions] = useState<ConsumptionLine[]>([]);

  // Cargar items al inicio
  useEffect(() => {
    api<ItemOption[]>('/items')
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch((err) => console.error('Error loading items:', err));
  }, []);

  // Cargar lotes al seleccionar insumo
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

  // Generar código de lote sugerido
  const generateLotCode = () => {
    const now = new Date();
    const str = `L${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${now.getHours()}${now.getMinutes()}`;
    setBidonLoteCodigo(str);
  };

  const addLine = () => {
    if (!selItemId || !selLotId || !selCantidad) return;
    const item = items.find(i => i.id === Number(selItemId));
    const lot = lots.find(l => l.id === Number(selLotId));
    if (!item || !lot) return;

    setConsumptions([...consumptions, {
      item_id: item.id,
      item_nombre: item.nombre,
      lot_id: lot.id,
      lote_codigo: lot.lote_codigo,
      cantidad: Number(selCantidad)
    }]);
    
    setSelItemId('');
    setSelLotId('');
    setSelCantidad('');
    setLots([]);
  };

  const removeLine = (index: number) => {
    setConsumptions(consumptions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (consumptions.length === 0) {
      setMsg('❌ Debes agregar al menos un ítem de consumo (materia prima).');
      return;
    }
    if (!bidonItemId) {
      setMsg('❌ Debes seleccionar qué producto estás fabricando.');
      return;
    }
    if (!bidonLoteCodigo) {
      setMsg('❌ Debes asignar un código de lote al producto.');
      return;
    }

    setLoading(true);
    setMsg('');

    try {
      const payload = {
        bidones_llenados: Number(bidones),
        bidon_item_id: Number(bidonItemId),      // <--- AHORA SÍ SE ENVÍA
        bidon_lote_codigo: bidonLoteCodigo,      // <--- AHORA SÍ SE ENVÍA
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
      
      // Resetear formulario
      setBidones('');
      setBidonLoteCodigo('');
      setObservacion('');
      setConsumptions([]);
      
      // Actualizar contador del dashboard
      if (onSuccess) onSuccess();
      
      router.refresh();

    } catch (err: unknown) {
      // Ahora veremos el mensaje real del servidor
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setMsg(`❌ Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all placeholder:text-gray-400";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5";
  const buttonClass = "px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-md bg-gray-900 text-white hover:bg-black hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Registrar Producción</h3>
            <p className="text-xs text-gray-500 mt-1">Ingresa el producto resultante y sus ingredientes.</p>
          </div>
          {msg && (
            <span className={`text-xs px-3 py-1.5 rounded-lg font-bold animate-pulse ${msg.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {msg}
            </span>
          )}
        </div>

        {/* 1. SECCIÓN: PRODUCTO A FABRICAR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Producto */}
          <div>
            <label className={labelClass}>Producto a Fabricar</label>
            <select 
              value={bidonItemId} 
              onChange={e => setBidonItemId(e.target.value)} 
              className={inputClass}
              required
            >
              <option value="">Seleccionar producto...</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </div>

          {/* Cantidad */}
          <div>
            <label className={labelClass}>Cantidad Producida</label>
            <div className="relative">
              <input 
                type="number" min="1" required 
                value={bidones} onChange={e => setBidones(e.target.value)} 
                className={inputClass} placeholder="Ej. 50" 
              />
              <span className="absolute right-4 top-2.5 text-gray-400 text-sm pointer-events-none">unid.</span>
            </div>
          </div>

          {/* Lote de Salida */}
          <div>
            <label className={labelClass}>Lote de Salida (Nuevo)</label>
            <div className="flex gap-2">
                <input 
                type="text" required 
                value={bidonLoteCodigo} onChange={e => setBidonLoteCodigo(e.target.value)} 
                className={inputClass} placeholder="Ej. L-20241124" 
                />
                <button 
                    type="button"
                    onClick={generateLotCode}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-xs font-bold uppercase tracking-wider transition-colors"
                    title="Generar Automático"
                >
                    Auto
                </button>
            </div>
          </div>

          {/* Observación */}
          <div>
            <label className={labelClass}>Observación</label>
            <input 
              type="text" 
              value={observacion} onChange={e => setObservacion(e.target.value)} 
              className={inputClass} placeholder="Opcional" 
            />
          </div>
        </div>

        {/* 2. SECCIÓN: INSUMOS (CONSUMOS) */}
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
          <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-900"></span>
            Consumo de Materia Prima
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-4">
              <label className={labelClass}>Insumo</label>
              <select 
                value={selItemId} onChange={e => setSelItemId(e.target.value)} 
                className={inputClass}
              >
                <option value="">Seleccionar...</option>
                {items.filter(i => String(i.id) !== bidonItemId).map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className={labelClass}>
                Lote Origen {fetchingLots && <span className="animate-pulse lowercase text-gray-400">...</span>}
              </label>
              <select 
                value={selLotId} onChange={e => setSelLotId(e.target.value)} 
                className={`${inputClass} disabled:bg-gray-100`}
                disabled={!selItemId}
              >
                <option value="">Seleccionar...</option>
                {lots.map(l => (
                  <option key={l.id} value={l.id}>{l.lote_codigo} (Stock: {l.stock_actual})</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Cantidad</label>
              <input 
                type="number" min="0.01" step="0.01"
                value={selCantidad} onChange={e => setSelCantidad(e.target.value)} 
                className={inputClass} placeholder="0.00"
              />
            </div>

            <div className="sm:col-span-2">
              <button 
                type="button" 
                onClick={addLine}
                disabled={!selItemId || !selLotId || !selCantidad}
                className={`w-full ${buttonClass}`}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de Consumos */}
        {consumptions.length > 0 && (
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
                      <button type="button" onClick={() => removeLine(idx)} className="text-gray-400 hover:text-red-600 p-1">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-6 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className={buttonClass}
            >
            {loading ? 'Procesando...' : 'Finalizar Producción'}
            </button>
        </div>
      </form>
    </div>
  );
}