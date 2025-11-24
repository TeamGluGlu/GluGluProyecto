'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function Filters() {
  const router = useRouter();
  const sp = useSearchParams();
  
  // Estado local
  const [itemId, setItemId] = useState<string>(sp.get('item_id') || '');
  const [search, setSearch] = useState<string>(sp.get('search') || '');

  const inputClass = "border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all shadow-sm";
  const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1 mb-1 block";

  const handleFilter = () => {
    const q = new URLSearchParams();
    // Limpiamos para nueva búsqueda
    if (itemId) q.set('item_id', itemId);
    if (search) q.set('search', search);
    
    router.push(`/lots?${q.toString()}`);
  };

  const handleClear = () => {
    setItemId('');
    setSearch('');
    router.push('/lots');
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-end">
      
      {/* Filtro por ID */}
      <div className="w-full sm:w-auto">
        <label className={labelClass}>Item ID</label>
        <input 
          className={`${inputClass} w-full sm:w-32`} 
          value={itemId} 
          onChange={(e) => setItemId(e.target.value)} 
          placeholder="Ej. 3" 
          type="number"
        />
      </div>

      {/* Filtro por Búsqueda */}
      <div className="w-full sm:w-auto">
        <label className={labelClass}>Buscar Lote</label>
        <input 
          className={`${inputClass} w-full sm:w-48`} 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Ej. L-2023..." 
        />
      </div>

      {/* Botones */}
      <div className="flex gap-2 w-full sm:w-auto pt-1">
        <button 
          onClick={handleFilter} 
          className="px-5 py-2 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-black transition shadow-md active:scale-95"
        >
          Filtrar
        </button>
        
        {(itemId || search) && (
          <button 
            onClick={handleClear} 
            className="px-4 py-2 rounded-xl bg-white text-gray-600 border border-gray-200 font-medium text-sm hover:bg-gray-50 transition"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}