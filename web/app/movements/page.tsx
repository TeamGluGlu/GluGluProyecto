import { api } from '@/lib/api';
import { KpiCard } from '@/components/KpiCard';
import StockChart from '@/components/StockChart';

export default async function Page() {
  // 1) KPIs con validación
    let items: any[] = [];
    let low: any[] = [];
    
    try {
        const itemsResponse = await api<any>('/stock/items');
        items = Array.isArray(itemsResponse) ? itemsResponse : [];
    } catch (error) {
        console.error('Error fetching items:', error);
    }

    try {
        const lowResponse = await api<any>('/stock/low');
        low = Array.isArray(lowResponse) ? lowResponse : [];
    } catch (error) {
        console.error('Error fetching low:', error);
    }

    const totalItems = items.length;
    const lowCount = low.length;
    const stockTotal = items.reduce((acc, i) => acc + Number(i.stock_total || 0), 0);

    // 2) Serie: ejemplo sintetizado desde ledger (últimos 30 días)
    const today = new Date();
    const from = new Date(today); 
    from.setDate(today.getDate() - 29);
    
    const serie = await Promise.all(
        Array.from({ length: 30 }).map(async (_, idx) => {
        const d = new Date(from); 
        d.setDate(from.getDate() + idx);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const dd = String(d.getDate()).padStart(2,'0');
        const ymd = `${yyyy}-${mm}-${dd}`;
        
        try {
            const s = await api<any>(`/stock/at-date?fecha=${ymd}`);
            const stockData = Array.isArray(s) ? s : [];
            const total = stockData.reduce((acc, i) => acc + Number(i.stock_a_fecha || 0), 0);
            return { fecha: `${dd}/${mm}`, stock: total };
        } catch {
            return { fecha: `${dd}/${mm}`, stock: 0 };
        }
        })
    );

    return (
        <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Items" value={totalItems} />
            <KpiCard title="Stock total" value={stockTotal} />
            <KpiCard title="Bajo umbral" value={lowCount} />
            <KpiCard title="Actualizado" value={new Date().toLocaleString()} />
        </div>

        <StockChart data={serie} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="space-y-3">
            <h2 className="text-lg font-semibold">Stock por ítem</h2>
            <div className="rounded-2xl border p-4">
                <pre className="text-xs overflow-auto">{JSON.stringify(items.slice(0,10), null, 2)}</pre>
            </div>
            </section>
            <section className="space-y-3">
            <h2 className="text-lg font-semibold">Alertas (bajo umbral)</h2>
            <div className="rounded-2xl border p-4">
                <pre className="text-xs overflow-auto">{JSON.stringify(low.slice(0,10), null, 2)}</pre>
            </div>
            </section>
        </div>
        </div>
    );
}