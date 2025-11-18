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
  // 1) KPIs con validación normalizada
  let items: any[] = [];
  let low: any[] = [];
  
  try { 
    items = pickArray(await api<any>('/stock/items')); 
  } catch (error) {
    console.error('Error fetching items:', error);
  }

  try { 
    low = pickArray(await api<any>('/stock/low')); 
  } catch (error) {
    console.error('Error fetching low:', error);
  }

  const totalItems = items.length;
  const lowCount = low.length;
  const stockTotal = items.reduce((acc, i) => acc + Number(i.stock_total || 0), 0);

  // 2) Serie semanal optimizada (8 puntos en lugar de 30)
  const days = 28; // 4 semanas
  const step = 4;  // cada 4 días (~7 llamadas)
  
  const serie = await Promise.all(
    Array.from({ length: Math.ceil(days/step) + 1 }).map(async (_, i) => {
      const d = new Date(); 
      d.setDate(d.getDate() - (days - i * step));
      const ymd = d.toISOString().slice(0, 10);
      
      try {
        const res = await api<any>(`/stock/at-date?date=${ymd}`);
        const rows = pickArray<{ stock_a_fecha?: number | string }>(res);
        const total = rows.reduce(
          (acc, r) => acc + Number(r.stock_a_fecha ?? 0),
          0
        );
        return { 
          fecha: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }), 
          stock: total 
        };
      } catch {
        return { 
          fecha: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }), 
          stock: 0 
        };
      }
    })
  );

  // 3) Columnas corregidas para las tablas
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Items" value={totalItems} />
        <KpiCard title="Stock total" value={stockTotal} />
        <KpiCard title="Bajo umbral" value={lowCount} />
        <KpiCard title="Actualizado" value={new Date().toLocaleString('es-PE')} />
      </div>

      <StockChart data={serie} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Stock por ítem</h2>
          <DataTable columns={itemColumns as any} rows={items.slice(0, 10)} />
          {items.length > 10 && (
            <p className="text-xs text-gray-500">Mostrando 10 de {items.length} items</p>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Alertas (bajo umbral)</h2>
          {low.length > 0 ? (
            <>
              <DataTable columns={lowColumns as any} rows={low.slice(0, 10)} />
              {low.length > 10 && (
                <p className="text-xs text-gray-500">Mostrando 10 de {low.length} alertas</p>
              )}
            </>
          ) : (
            <div className="rounded-2xl border p-8 text-center text-gray-500">
              ✅ No hay alertas de stock bajo
            </div>
          )}
        </section>
      </div>
    </div>
  );
}