import { api } from '@/lib/api';
import { KpiCard } from '@/components/KpiCard';
import StockChart from '@/components/StockChart';
import { DataTable } from '@/components/DataTable';

// Helper para normalizar respuestas de la API
function pickArray<T>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items?.data)) return res.items.data;
  return [];
}

export default async function Page() {
  // --- ZONA DE LÓGICA (Mantenemos el Mock) ---
  let items: any[] = [];
  let low: any[] = [];
  
  try { items = pickArray(await api<any>('/stock/items')); } catch {}
  try { low = pickArray(await api<any>('/stock/low')); } catch {}

  const totalItems = items.length;
  const lowCount = low.length;
  const stockTotal = items.reduce((acc, i) => acc + Number(i.stock_total || 0), 0);

  // Serie de datos para el gráfico (Datos simulados)
  const days = 28; 
  const step = 4; 
  
  const serie = await Promise.all(
    Array.from({ length: Math.ceil(days/step) + 1 }).map(async (_, i) => {
      const d = new Date(); 
      d.setDate(d.getDate() - (days - i * step));
      const total = 4 + i * 0.2; 
      return { 
        fecha: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }), 
        stock: total 
      };
    })
  );

  const itemColumns = [
    { key: 'item_id', header: 'ID' },
    { key: 'item_nombre', header: 'Item' },
    { key: 'item_unidad', header: 'Unidad' },
    { key: 'stock_total', header: 'Stock' },
  ] as const;

  const lowColumns = [
    { key: 'item_id', header: 'ID' },
    { key: 'item_nombre', header: 'Item' },
    { key: 'minimo', header: 'Mínimo' },
    { key: 'stock_total', header: 'Stock' },
  ] as const;
  // --- FIN LÓGICA ---

  return (
    <div className="space-y-4">
      
      {/* 1. TÍTULO PRINCIPAL: Separación cómoda del tope */}
      <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-3">Dashboard</h1> 
      
      {/* 2. KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> 
        <KpiCard title="Items" value={totalItems} />
        <KpiCard title="Stock total" value={stockTotal} />
        <KpiCard title="Bajo umbral" value={lowCount} />
        <KpiCard title="Actualizado" value={new Date().toLocaleString('es-PE')} />
      </div>

      {/* --- 3. GRÁFICO (ALTURA AMPLIADA para evitar clipping) --- */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-3 text-gray-700">Evolución de stock (últimos 30 días)</h2>
        <div className="h-72"> {/* ALTURA SUBIDA A h-72 */}
            <StockChart data={serie} />
        </div>
      </div>

      {/* --- 4. TABLAS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Tabla 1: Stock por ítem */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Stock por ítem</h2>
          <div className="max-h-60 overflow-y-auto">
             <DataTable columns={itemColumns as any} rows={items.slice(0, 10)} />
          </div>
          {items.length > 10 && (
            <p className="text-xs text-gray-500 mt-4">Mostrando 10 de {items.length} items</p>
          )}
        </section>
        
        {/* Tabla 2: Alertas */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Alertas (bajo umbral)</h2>
          {low.length > 0 ? (
            <div className="max-h-60 overflow-y-auto">
              <DataTable columns={lowColumns as any} rows={low.slice(0, 10)} />
            </div>
          ) : (
            <div className="rounded-xl border p-4 text-center text-gray-500 bg-green-50 border-green-200">
              ✅ No hay alertas de stock bajo
            </div>
          )}
          {low.length > 10 && (
            <p className="text-xs text-gray-500 mt-4">Mostrando 10 de {low.length} alertas</p>
          )}
        </section>
      </div>
    </div>
  );
}