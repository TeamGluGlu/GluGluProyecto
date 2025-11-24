// web/app/items/[id]/page.tsx
import { api } from '@/lib/api';
import ItemForm from '@/components/ItemForm';
import Link from 'next/link';

// Definición del tipo que esperamos de la API
type Item = {
  id: number;
  nombre: string;
  tipo: string;
  unidad: string;
  activo: boolean;
};

// CAMBIO IMPORTANTE: params ahora es Promise<{ id: string }>
export default async function ItemDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 1. Desempaquetamos los params con await
  const resolvedParams = await params;
  const { id } = resolvedParams;

  let item: Item | null = null;
  let errorMsg = '';

  try {
    // 2. Usamos el ID ya resuelto
    const res = await api<Item | { data: Item }>(`/items/${id}`);
    
    if (res && typeof res === 'object' && 'data' in res) {
      item = (res as { data: Item }).data;
    } else {
      item = res as Item;
    }

  } catch (e) {
    console.error(e);
    errorMsg = 'No se pudo cargar el ítem o no existe.';
  }

  if (errorMsg || !item) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-red-600 font-bold mb-4">{errorMsg || 'Item no encontrado'}</h2>
        <Link href="/items" className="text-blue-600 hover:underline">
          &larr; Volver a la lista
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/items" className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar Detalle</h1>
      </div>

      <ItemForm itemToEdit={item} />
    </div>
  );
}