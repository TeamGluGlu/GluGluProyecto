// web/app/items/page.tsx
import { api } from '@/lib/api';
import ItemForm from '@/components/ItemForm';
import ItemsClientTable from '@/components/ItemsClientTable';

// Tipos
type Item = {
  id: number;
  nombre: string;
  tipo: string;
  unidad: string;
  activo: boolean;
};

type StockRow = {
  item_id: number;
  stock_total?: number | string;
};

// Helpers (puedes mover esto a lib/helpers.ts si quieres reutilizar)
function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'object' && value !== null) {
      if (Array.isArray((value as { data?: unknown }).data)) return (value as { data: T[] }).data;
      if (Array.isArray((value as { rows?: unknown }).rows)) return (value as { rows: T[] }).rows;
  }
  return [];
}

export default async function ItemsPage() {
  // 1. Cargar Items
  let items: Item[] = [];
  try {
    const itemsRes = await api<unknown>('/items');
    items = asArray<Item>(itemsRes);
  } catch (err) {
    console.error('Error al obtener /items:', err);
  }

  // 2. Cargar Stock
  let stockArr: StockRow[] = [];
  try {
    const stockRes = await api<unknown>('/stock/items');
    stockArr = asArray<StockRow>(stockRes);
  } catch (err) {
    console.error('Error al obtener /stock/items:', err);
  }

  // 3. Cruzar datos
  const stockById = new Map<number, number>();
  for (const s of stockArr) {
    const id = Number(s.item_id);
    if (!Number.isNaN(id)) {
      stockById.set(id, Number(s.stock_total ?? 0));
    }
  }

  const rows = items.map((i) => ({
    ...i,
    stock_total: stockById.get(i.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 mt-4">Gestión de Items</h1>
      
      {/* Formulario de creación rápida */}
      <ItemForm />
      
      {/* Tabla Cliente con Acciones */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <ItemsClientTable rows={rows} />
      </div>
    </div>
  );
}