// web/app/items/page.tsx
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import ItemForm from '@/components/ItemForm';

// ... (Tipos y función asArray se mantienen IGUAL) ...
type Item = {
  id: number;
  nombre: string;
  tipo: string;
  unidad: string;
  activo: boolean;
};

type StockRow = {
  item_id: number;
  item_nombre?: string;
  item_unidad?: string;
  stock_total?: number | string;
};

type EnrichedItem = Item & {
    stock_total: number;
};

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'object' && value !== null) {
      if (Array.isArray((value as { data?: unknown }).data)) return (value as { data: T[] }).data;
      if (Array.isArray((value as { rows?: unknown }).rows)) return (value as { rows: T[] }).rows;
      if (Array.isArray((value as { items?: { data?: unknown } }).items?.data)) return (value as { items: { data: T[] } }).items.data;
  }
  return [];
}

export default async function ItemsPage() {
  // ... (Lógica de fetch items, stockArr y stockById se mantiene IGUAL) ...
  let items: Item[] = [];
  try {
    const itemsRes = await api<unknown>('/items');
    items = asArray<Item>(itemsRes);
  } catch (err) {
    console.error('Error al obtener /items:', err);
  }

  let stockArr: StockRow[] = [];
  try {
    const stockRes = await api<unknown>('/stock/items');
    stockArr = asArray<StockRow>(stockRes);
  } catch (err) {
    console.error('Error al obtener /stock/items:', err);
  }

  const stockById = new Map<number, number>();
  for (const s of stockArr) {
    const id = Number(s.item_id);
    if (!Number.isNaN(id)) {
      const qty = Number(s.stock_total ?? 0);
      stockById.set(id, qty);
    }
  }

  const rows: EnrichedItem[] = items.map((i) => ({
    ...i,
    stock_total: stockById.get(i.id) ?? 0,
  }));

  // --- AQUÍ ESTÁ EL CAMBIO: Quitamos el ID ---
  const columns = [
    // { key: 'id', header: 'ID' },  <-- Eliminado para que no se vea
    { key: 'nombre', header: 'Nombre' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'unidad', header: 'Unidad' },
    { key: 'stock_total', header: 'Cantidad' },
    { key: 'activo', header: 'Activo' },
  ] as const;

  return (
    <div className="space-y-6"> {/* Aumenté un poco el espacio vertical */}
      <h1 className="text-2xl font-bold text-gray-900">Gestión de Items</h1> {/* Título mejorado (oscuro) */}
      <ItemForm />
      
      {/* Contenedor de la tabla con fondo blanco y sombra para consistencia */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <DataTable columns={columns} rows={rows} />
      </div>
    </div>
  );
}