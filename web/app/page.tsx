import { api } from '@/lib/api';
import { KpiCard } from '@/components/KpiCard';
import StockChart from '@/components/StockChart';
import { DataTable } from '@/components/DataTable';

// --- DEFINICIÓN DE TIPOS ---

// Extendemos para asegurar que tengan 'id' para la DataTable
interface ItemData {
  id: number;      // <--- Necesario para DataTable
  item_id: number;
  item_nombre: string;
  item_unidad: string;
  stock_total: number | string;
}

interface LowItemData {
  id: number;      // <--- Necesario para DataTable
  item_id: number;
  item_nombre: string;
  minimo: number | string;
  stock_total: number | string;
}

// Interfaces raw (crudos) que vienen de la API (sin 'id' duplicado aun)
interface RawItemData {
  item_id: number;
  item_nombre: string;
  item_unidad: string;
  stock_total: number | string;
}

interface RawLowItemData {
  item_id: number;
  item_nombre: string;
  minimo: number | string;
  stock_total: number | string;
}

// --- HELPER CORREGIDO (SIN ANY) ---
function pickArray<T>(res: unknown): T[] {
  // 1. Si es falsy (null, undefined, etc.), devolver array vacío
  if (!res) return [];

  // 2. Si ya es un array, devolverlo casteado
  if (Array.isArray(res)) return res as T[];

  // 3. Si es un objeto, verificamos de forma segura si tiene 'data'
  if (typeof res === 'object' && res !== null) {
    // Hacemos una aserción segura a un objeto con propiedad opcional 'data'
    // Esto es válido en TS y evita el uso de 'any'
    const wrapper = res as { data?: unknown };

    if (Array.isArray(wrapper.data)) {
      return wrapper.data as T[];
    }
  }

  return [];
}

export default async function Page() {
  // --- ZONA DE LÓGICA ---
  let items: ItemData[] = [];
  let low: LowItemData[] = [];

  try {
    const rawItems = pickArray<RawItemData>(await api('/stock/items'));
    // Mapeamos para agregar 'id' (copia de item_id)
    items = rawItems.map(i => ({ ...i, id: i.item_id }));
  } catch (e) {
    console.error('Error cargando stock items:', e);
  }

  try {
    const rawLow = pickArray<RawLowItemData>(await api('/stock/low'));
    // Mapeamos para agregar 'id' (copia de item_id)
    low = rawLow.map(i => ({ ...i, id: i.item_id }));
  } catch (e) {
    console.error('Error cargando low stock:', e);
  }

  const totalItems = items.length;
  const lowCount = low.length;
  // Cálculo seguro del total
  const stockTotal = items.reduce((acc, i) => acc + Number(i.stock_total || 0), 0);

  // Serie de datos para el gráfico (Dummy Data por ahora)
  const days = 28;
  const step = 4;
  const serie = await Promise.all(
    Array.from({ length: Math.ceil(days / step) + 1 }).map(async (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - i * step));
      const total = 4 + i * 0.2; // Simulación
      return {
        fecha: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
        stock: total,
      };
    })
  );

  // Columnas
  // Usamos 'ColumnDef' implícito al pasar las props al componente DataTable
  // pero aquí definimos la estructura con as const para inferencia
  const itemColumns = [
    { key: 'item_nombre', header: 'Item' },
    { key: 'item_unidad', header: 'Unidad' },
    { key: 'stock_total', header: 'Stock' },
  ] as const;

  const lowColumns = [
    { key: 'item_nombre', header: 'Item' },
    { key: 'minimo', header: 'Mínimo' },
    { key: 'stock_total', header: 'Stock' },
  ] as const;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 mt-10 mb-3">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Items" value={totalItems} />
        <KpiCard title="Stock total" value={stockTotal} />
        <KpiCard title="Bajo umbral" value={lowCount} />
        <KpiCard title="Actualizado" value={new Date().toLocaleString('es-PE')} />
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-3 text-gray-700">
          Evolución de stock (últimos 30 días)
        </h2>
        <div className="h-72">
          <StockChart data={serie} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Stock por ítem</h2>
          <div className="max-h-60 overflow-y-auto">
            {/* Ahora 'items' tiene 'id', así que DataTable no se quejará */}
            <DataTable columns={itemColumns} rows={items.slice(0, 10)} />
          </div>
          {items.length > 10 && (
            <p className="text-xs text-gray-500 mt-4">
              Mostrando 10 de {items.length} items
            </p>
          )}
        </section>

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
                <svg className="h-6 w-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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