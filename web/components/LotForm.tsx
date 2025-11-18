'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function LotForm() {
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

      // Limpiar inputs manualmente porque son controlados
      setItemId('');
      setLote('');
      setFecha('');
      setCosto('');
      setCantidad('');

      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm font-medium text-cyan-600">Nuevo Lote</div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input
          required
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          placeholder="Item ID"
          className="border-2 border-cyan-400 rounded-xl px-3 py-2"
        />

        <input
          required
          value={lote}
          onChange={(e) => setLote(e.target.value)}
          placeholder="Lote"
          className="border-2 border-cyan-400 rounded-xl px-3 py-2"
        />

        <input
          type="date"
          required
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="border-2 border-cyan-400 rounded-xl px-3 py-2"
        />

        <input
          type="number"
          min="0"
          step="0.01"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          placeholder="Costo"
          className="border-2 border-cyan-400 rounded-xl px-3 py-2"
        />

        <input
          type="number"
          min="0"
          step="0.01"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="Cantidad inicial"
          className="border-2 border-cyan-400 rounded-xl px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 disabled:opacity-50"
      >
        {loading ? 'Guardando...' : 'Registrar Lote'}
      </button>

      {message && (
        <div
          className={`p-3 rounded-lg ${
            message.includes('✅')
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
}
