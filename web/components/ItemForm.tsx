// web/components/ItemForm.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Definimos el tipo aquí o lo importamos si tienes un archivo de tipos compartido
type Item = {
  id: number;
  nombre: string;
  tipo: string;
  unidad: string;
  activo: boolean;
};

interface ItemFormProps {
  itemToEdit?: Item; // Prop opcional para modo edición
}

export default function ItemForm({ itemToEdit }: ItemFormProps) {
  const router = useRouter();
  const isEditing = !!itemToEdit; // Bandera para saber si editamos

  const [nombre, setNombre] = useState(itemToEdit?.nombre || '');
  const [tipo, setTipo] = useState(itemToEdit?.tipo || 'TAPA');
  const [unidad, setUnidad] = useState(itemToEdit?.unidad || 'UND');
  const [activo, setActivo] = useState(itemToEdit?.activo ?? true);
  const [cantidadInicial, setCantidadInicial] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | undefined>();

  // Actualizar estado si cambia la prop (útil para navegación rápida)
  useEffect(() => {
    if (itemToEdit) {
      setNombre(itemToEdit.nombre);
      setTipo(itemToEdit.tipo);
      setUnidad(itemToEdit.unidad);
      setActivo(itemToEdit.activo);
    }
  }, [itemToEdit]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(undefined);

    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      if (isEditing) {
        // --- MODO EDICIÓN (PUT) ---
        const res = await fetch(`${base}/items/${itemToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, tipo, unidad, activo }),
        });

        if (!res.ok) throw new Error(await res.text());
        setMsg('✅ Item actualizado correctamente');
        // Redirigir de vuelta a la lista tras editar
        setTimeout(() => router.push('/items'), 1000); 

      } else {
        // --- MODO CREACIÓN (POST) ---
        const resItem = await fetch(`${base}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre,
            tipo,
            unidad,
            minimo: 60,
            activo: true,
          }),
        });

        if (!resItem.ok) throw new Error(await resItem.text());
        const item = await resItem.json();

        // Lote inicial (solo en creación)
        const qty = Number(cantidadInicial);
        if (!Number.isNaN(qty) && qty > 0) {
          const hoy = new Date();
          const yyyy = hoy.getFullYear();
          const mm = String(hoy.getMonth() + 1).padStart(2, '0');
          const dd = String(hoy.getDate()).padStart(2, '0');
          const fecha = `${yyyy}-${mm}-${dd}`;
          const loteCodigo = `INIT-${item.id}-${yyyy}${mm}${dd}`;

          await fetch(`${base}/item-lots`, {
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
        }
        setMsg('✅ Item creado correctamente');
        setNombre('');
        setCantidadInicial('');
        router.refresh();
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      setMsg('❌ ' + message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full border border-gray-300 rounded-xl px-4 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-sm";

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm space-y-5 text-gray-900">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">
          {isEditing ? `Editar Item #${itemToEdit.id}` : 'Crear Nuevo Item'}
        </h3>
        {msg && (
          <span className={`text-xs font-medium px-2 py-1 rounded-md ${msg.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {msg}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Nombre */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Nombre</label>
          <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
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

        {/* Stock Inicial / Activo */}
        <div className="space-y-1">
          {isEditing ? (
            <>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Estado</label>
              <select 
                value={activo ? 'true' : 'false'} 
                onChange={(e) => setActivo(e.target.value === 'true')}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </>
          ) : (
            <>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Stock Inicial</label>
              <input type="number" min="0" step="0.01" value={cantidadInicial} onChange={(e) => setCantidadInicial(e.target.value)} placeholder="0" className={inputClass} />
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {isEditing && (
           <button 
             type="button"
             onClick={() => router.back()}
             className="px-6 py-2.5 rounded-xl font-medium text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
           >
             Cancelar
           </button>
        )}
        <button
          disabled={loading}
          className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-md ${loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black hover:shadow-lg active:scale-95'}`}
        >
          {loading ? 'Guardando...' : isEditing ? 'Actualizar Item' : 'Guardar Item'}
        </button>
      </div>
    </form>
  );
}