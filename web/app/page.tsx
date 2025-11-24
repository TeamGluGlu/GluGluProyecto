// web/app/page.tsx
import { api } from '@/lib/api';
import { KpiCard } from '@/components/KpiCard';
import StockChart from '@/components/StockChart';
import { DataTable } from '@/components/DataTable';

// --- DEFINICIÓN DE TIPOS ---

interface ItemData {
  id: number;
  item_id: number;
  item_nombre: string;
  item_unidad: string;
  stock_total: number | string;
}

interface LowItemData {
  id: number;
  item_id: number;
  item_nombre: string;
  minimo: number | string;
  stock_total: number | string;
}

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

// Tipo de respuesta para /stock/at-date
interface StockAtDateResponse {
  as_of: string;
  data: {
    item_id: number;
    stock_a_fecha: number;
  }[];
}

// --- HELPER ---
function pickArray<T>(res: unknown): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (typeof res === 'object' && res !== null) {
    const wrapper = res as { data?: unknown };
    if (Array.isArray(wrapper.data)) {
      return wrapper.data as T[];
    }
  }
  return [];
}

export default async function Page() {
  // --- CARGA DE DATOS ACTUALES (KPIs y Tablas) ---
  let items: ItemData[] = [];
  let low: LowItemData[] = [];

  try {
    const rawItems = pickArray<RawItemData>(await api('/stock/items'));
    items = rawItems.map(i => ({ ...i, id: i.item_id }));
  } catch (e) {
    console.error('Error cargando stock items:', e);
  }

  try {
    const rawLow = pickArray<RawLowItemData>(await api('/stock/low'));
    low = rawLow.map(i => ({ ...i, id: i.item_id }));
  } catch (e) {
    console.error('Error cargando low stock:', e);
  }

  const totalItems = items.length;
  const lowCount = low.length;
  const stockTotal = items.reduce((acc, i) => acc + Number(i.stock_total || 0), 0);

  // --- GENERACIÓN DEL GRÁFICO (DATOS REALES) ---
  // Consultamos el histórico real usando /stock/at-date
  const days = 30; // Ventana de tiempo
  const step = 5;  // Intervalo de días (para no saturar con 30 peticiones)
  
  const serie = await Promise.all(
    Array.from({ length: Math.ceil(days / step) + 1 }).map(async (_, i) => {
      // Calculamos la fecha objetivo: desde el pasado hacia hoy
      const d = new Date();
      d.setDate(d.getDate() - (days - i * step));
      
      // Formato YYYY-MM-DD para la API
      const isoDate = d.toISOString().split('T')[0];
      // Formato visual DD/MM para el gráfico
      const labelDate = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });

      let totalEnFecha = 0;

      try {
        // Llamada al endpoint real
        // La API devuelve el stock de cada item en esa fecha, así que los sumamos.
        const res = await api(`/stock/at-date?date=${isoDate}`) as StockAtDateResponse;
        
        if (res && Array.isArray(res.data)) {
          totalEnFecha = res.data.reduce((acc, curr) => acc + Number(curr.stock_a_fecha || 0), 0);
        }
      } catch (err) {
        console.error(`Error obteniendo stock para fecha ${isoDate}`, err);
        // Si falla (ej. error de conexión), asumimos 0 o el valor anterior si quisieras refinarlo
      }

      return {
        fecha: labelDate,
        stock: totalEnFecha,
      };
    })
  );

  // --- DEFINICIÓN DE COLUMNAS ---
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
          Evolución de stock (últimos {days} días)
        </h2>
        <div className="h-72">
          {/* El componente StockChart ya está preparado para recibir { fecha, stock } */}
          <StockChart data={serie} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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