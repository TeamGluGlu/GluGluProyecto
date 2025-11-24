'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Importar useRouter
import { api } from '@/lib/api';

export default function LotForm() {
  const router = useRouter(); // Inicializar router

  const [itemId, setItemId] = useState('');
  const [lote, setLote] = useState('');
  const [fecha, setFecha] = useState('');
  const [costo, setCosto] = useState('');
  const [cantidad, setCantidad] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const data = {
      item_id: Number(itemId),
      lote_codigo: lote,
      fecha_ingreso: fecha,
      costo_lote: Number(costo),
      cantidad_inicial: Number(cantidad),
    };

    try {
      await api('/item-lots', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      setMessage('✅ Lote creado exitosamente');

      // Limpiar inputs
      setItemId('');
      setLote('');
      setFecha('');
      setCosto('');
      setCantidad('');

      // Recargar datos de la tabla sin recargar la página completa
      router.refresh(); 
      
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al crear lote';

      setMessage(`❌ Error: ${errorMessage}`);
    }
  }

  // Estilos reutilizables consistentes con ItemForm
  const inputClass = "w-full border border-gray-300 rounded-xl px-4 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-sm";
  const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1 block mb-1";

  return (
    <form 
      onSubmit={handleSubmit} 
      className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm space-y-5 text-gray-900"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">Registrar Nuevo Lote</h3>
        {message && (
          <span className={`text-xs font-medium px-2 py-1 rounded-md ${
            message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        
        <div>
          <label className={labelClass}>Item ID</label>
          <input
            required
            type="number"
            min="1"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            placeholder="ID"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Código Lote</label>
          <input
            required
            value={lote}
            onChange={(e) => setLote(e.target.value)}
            placeholder="Ej. L-2023-01"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Fecha Ingreso</label>
          <input
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Costo Unit.</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Cant. Inicial</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className={`
            px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-md
            ${loading 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-900 text-white hover:bg-black hover:shadow-lg active:scale-95'
            }
          `}
        >
          {loading ? 'Guardando...' : 'Registrar Lote'}
        </button>
      </div>
    </form>
  );
}