// web/app/items/[id]/page.tsx
import { api } from '@/lib/api';
import ItemForm from '@/components/ItemForm';
import ItemLotsTable from '@/components/ItemLotsTable'; // <--- IMPORTA EL NUEVO COMPONENTE
import Link from 'next/link';

// Tipos
type Item = {
  id: number;
  nombre: string;
  tipo: string;
  unidad: string;
  activo: boolean;
};

// Tipo para respuesta de /stock/items/{id}/lots
interface ItemLotsResponse {
  data: {
    lot_id: number;
    lote_codigo: string;
    fecha_ingreso: string;
    stock_actual: number;
  }[];
}

interface LotRow {
  id: number;
  lote_codigo: string;
  fecha_ingreso: string;
  stock_actual: number;
}

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  let item: Item | null = null;
  let lots: LotRow[] = [];
  let errorMsg = '';

  try {
    // 1. Cargar Item
    const resItem = await api<Item | { data: Item }>(`/items/${id}`);
    if (resItem && typeof resItem === 'object' && 'data' in resItem) {
      item = (resItem as { data: Item }).data;
    } else {
      item = resItem as Item;
    }

    // 2. Cargar Lotes del Item
    const resLots = await api<ItemLotsResponse>(`/stock/items/${id}/lots?pageSize=50`);
    
    lots = (resLots.data || []).map(l => ({
      id: l.lot_id,
      lote_codigo: l.lote_codigo,
      fecha_ingreso: new Date(l.fecha_ingreso).toLocaleDateString('es-PE'),
      stock_actual: Number(l.stock_actual)
    }));

  } catch (e) {
    console.error(e);
    errorMsg = 'Error cargando datos.';
  }

  if (!item) {
    return <div className="p-8 text-center text-red-600">{errorMsg || 'Item no encontrado'}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/items" className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar Ítem</h1>
      </div>

      {/* Formulario de Edición */}
      <ItemForm itemToEdit={item} />

      {/* Sección de Lotes Asociados */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          📦 Lotes Existentes
          <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {lots.length} lotes
          </span>
        </h2>
        
        {lots.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-200">
             {/* USAMOS EL COMPONENTE CLIENTE AQUÍ */}
             <ItemLotsTable rows={lots} />
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500 text-sm">Este ítem aún no tiene lotes registrados.</p>
          </div>
        )}
      </div>
    </div>
  );
}