'use client';
import { useState } from 'react';

export default function LotForm() {
  const [itemId, setItemId] = useState('');
  const [lote, setLote] = useState('');
  const [fecha, setFecha] = useState<string>(()=> new Date().toISOString().slice(0,10));
  const [costo, setCosto] = useState('0');
  const [cantidad, setCantidad] = useState('0');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string|undefined>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); 
    setLoading(true); 
    setMsg(undefined);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';
      const res = await fetch(`${base}/item-lots`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: Number(itemId),
          lote_codigo: lote,
          fecha_ingreso: fecha,
          costo_lote: Number(costo),
          cantidad_inicial: Number(cantidad)
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg('✅ Lote creado'); 
      setLote(''); 
      setCantidad('0');
    } catch (err:any) { 
      setMsg('❌ ' + (err?.message || 'Error')); 
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="text-sm font-medium text-cyan-600">Nuevo Lote</div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input 
          required 
          value={itemId} 
          onChange={e=>setItemId(e.target.value)} 
          placeholder="Item ID"
          className="border-2 border-cyan-400 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200" 
        />
        <input 
          required 
          value={lote} 
          onChange={e=>setLote(e.target.value)} 
          placeholder="Lote"
          className="border-2 border-cyan-400 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200" 
        />
        <input 
          type="date" 
          required 
          value={fecha} 
          onChange={e=>setFecha(e.target.value)}
          className="border-2 border-cyan-400 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200" 
        />
        <input 
          type="number" 
          min="0" 
          step="0.01" 
          value={costo} 
          onChange={e=>setCosto(e.target.value)} 
          placeholder="Costo"
          className="border-2 border-cyan-400 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200" 
        />
        <input 
          type="number" 
          min="0" 
          step="0.01" 
          value={cantidad} 
          onChange={e=>setCantidad(e.target.value)} 
          placeholder="Cantidad inicial"
          className="border-2 border-cyan-400 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200" 
        />
      </div>
      <button 
        disabled={loading} 
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Guardando...' : 'Guardar Lote'}
      </button>
      {msg && <div className="text-sm font-medium text-cyan-600">{msg}</div>}
    </form>
  );
}