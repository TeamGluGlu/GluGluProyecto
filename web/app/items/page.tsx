// app/items/page.tsx
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import ItemForm from '@/components/ItemForm';

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

function asArray<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.items?.data)) return value.items.data;
  return [];
}

export default async function ItemsPage() {
  // 1) Items
  let items: Item[] = [];
  try {
    const itemsRes = await api<any>('/items');
    items = asArray<Item>(itemsRes);
  } catch (err) {
    console.error('Error al obtener /items:', err);
  }

  // 2) Stock por ítem
  let stockArr: StockRow[] = [];
  try {
    const stockRes = await api<any>('/stock/items');
    stockArr = asArray<StockRow>(stockRes);
  } catch (err) {
    console.error('Error al obtener /stock/items:', err);
  }

  // 3) Map item_id -> stock_total
  const stockById = new Map<number, number>();
  for (const s of stockArr) {
    const id = Number(s.item_id);
    if (!Number.isNaN(id)) {
      const qty = Number(s.stock_total ?? 0);
      stockById.set(id, qty);
    }
  }

  // 4) Enriquecer filas con cantidad actual
  const rows = items.map((i) => ({
    ...i,
    stock_total: stockById.get(i.id) ?? 0,
  }));

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'nombre', header: 'Nombre' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'unidad', header: 'Unidad' },
    { key: 'stock_total', header: 'Cantidad' }, // nueva
    { key: 'activo', header: 'Activo' },
  ] as const;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Items</h1>
      <ItemForm />
      <DataTable columns={columns as any} rows={rows as any[]} />
    </div>
  );
}
