import { api } from '@/lib/api';
import { KpiCard } from '@/components/KpiCard';
import StockChart from '@/components/StockChart';
import { DataTable } from '@/components/DataTable';

// --- DEFINICIÓN DE TIPOS PARA EVITAR 'any' ---

// Estructura para el listado general de stock (/stock/items)
interface ItemData {
  item_id: number;
  item_nombre: string;
  item_unidad: string;
  stock_total: number | string;
}

// Estructura para el listado de stock bajo (/stock/low)
interface LowItemData {
  item_id: number;
  item_nombre: string;
  minimo: number | string;
  stock_total: number | string;
}

// Helper para normalizar respuestas de la API
function pickArray<T extends unknown[]>(res: unknown): T {
  // Manejar el caso de array directo
  if (Array.isArray(res)) return res as T;

  // Manejar objeto con propiedad 'data'
  if (
    typeof res === 'object' &&
    res !== null &&
    'data' in res &&
    Array.isArray((res as { data: unknown }).data)
  ) {
    return (res as { data: T }).data;
  }

  // Manejar objeto con propiedad 'items.data'
  if (
    typeof res === 'object' &&
    res !== null &&
    'items' in res &&
    typeof (res as { items: { data: T } }).items === 'object'
  ) {
    const itemsObject = (res as { items: { data: T } }).items;
    if (itemsObject && 'data' in itemsObject && Array.isArray(itemsObject.data)) {
      return itemsObject.data;
    }
  }

  return [] as unknown as T;
}

export default async function Page() {
  // --- ZONA DE LÓGICA ---
  let items: ItemData[] = [];
  let low: LowItemData[] = [];

  try {
    items = pickArray<ItemData[]>(await api('/stock/items'));
  } catch {}

  try {
    low = pickArray<LowItemData[]>(await api('/stock/low'));
  } catch {}

  const totalItems = items.length;
  const lowCount = low.length;
  const stockTotal = items.reduce((acc, i) => acc + Number(i.stock_total || 0), 0);

  // Serie de datos para el gráfico
  const days = 28;
  const step = 4;

  const serie = await Promise.all(
    Array.from({ length: Math.ceil(days / step) + 1 }).map(async (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - i * step));
      const total = 4 + i * 0.2;

      return {
        fecha: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
        stock: total,
      };
    })
  );

  // --- MODIFICACIÓN: Eliminada la columna ID ---
  const itemColumns = [
    { key: 'item_nombre', header: 'Item' },
    { key: 'item_unidad', header: 'Unidad' },
    { key: 'stock_total', header: 'Stock' },
  ] as const;

  // --- MODIFICACIÓN: Eliminada la columna ID ---
  const lowColumns = [
    { key: 'item_nombre', header: 'Item' },
    { key: 'minimo', header: 'Mínimo' },
    { key: 'stock_total', header: 'Stock' },
  ] as const;

  // --- RETURN ---
  return (
    <div className="space-y-4">
      {/* 1. Título */}
      <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-3">Dashboard</h1>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Items" value={totalItems} />
        <KpiCard title="Stock total" value={stockTotal} />
        <KpiCard title="Bajo umbral" value={lowCount} />
        <KpiCard title="Actualizado" value={new Date().toLocaleString('es-PE')} />
      </div>

      {/* 3. Gráfico */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-3 text-gray-700">
          Evolución de stock (últimos 30 días)
        </h2>
        <div className="h-72">
          <StockChart data={serie} />
        </div>
      </div>

      {/* 4. Tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tabla 1 */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Stock por ítem</h2>

          <div className="max-h-60 overflow-y-auto">
            <DataTable columns={itemColumns} rows={items.slice(0, 10)} />
          </div>

          {items.length > 10 && (
            <p className="text-xs text-gray-500 mt-4">
              Mostrando 10 de {items.length} items
            </p>
          )}
        </section>

        {/* Tabla 2 */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">
            Alertas (bajo umbral)
          </h2>

          {low.length > 0 ? (
            <div className="max-h-60 overflow-y-auto">
              <DataTable columns={lowColumns} rows={low.slice(0, 10)} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 border border-dashed border-gray-200 rounded-xl bg-gray-50">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-900"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <p className="text-sm font-medium text-gray-900">Todo en orden</p>
              <p className="text-xs text-gray-500">No hay alertas de stock bajo</p>
            </div>
          )}

          {low.length > 10 && (
            <p className="text-xs text-gray-500 mt-4">
              Mostrando 10 de {low.length} alertas
            </p>
          )}
        </section>
      </div>
    </div>
  );
}