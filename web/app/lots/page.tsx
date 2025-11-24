// web/app/lots/page.tsx
import { api } from '@/lib/api';
import { Filters } from '@/components/Filters';
import LotForm from '@/components/LotForm';
import LotsClientTable from '@/components/LotsClientTable'; // <--- Importamos el nuevo componente

// --- (Las interfaces y helper getRowsSafe se quedan igual) ---
interface RawLot {
  item_id: number;
  item_nombre: string;
  item_unidad: string;
  lot_id: number;
  lote_codigo: string;
  fecha_ingreso: string;
  stock_actual: number | string;
}

interface LotRow {
  id: number;
  item_id: number;
  item_nombre: string;
  item_unidad: string;
  lot_id: number;
  lote_codigo: string;
  fecha_ingreso: string;
  stock_actual: number | string;
}

function getRowsSafe(res: unknown): LotRow[] {
  if (!res || typeof res !== 'object') return [];
  let data: RawLot[] = [];
  if (Array.isArray(res)) {
    data = res as RawLot[];
  } else if ('data' in res && Array.isArray((res as { data: unknown }).data)) {
    data = (res as { data: RawLot[] }).data;
  } else {
    return [];
  }
  return data.map((item) => ({
    ...item,
    id: item.lot_id,
    stock_actual: Number(item.stock_actual),
    fecha_ingreso: item.fecha_ingreso
      ? new Date(item.fecha_ingreso).toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : '-',
  }));
}

export default async function LotsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const qp = new URLSearchParams();
  if (sp?.item_id) qp.set('item_id', sp.item_id);
  if (sp?.search) qp.set('search', sp.search);
  qp.set('page', '1');
  qp.set('pageSize', '100');

  let rows: LotRow[] = [];
  let total = 0;
  let errorMsg = '';

  try {
    const res = await api<unknown>(`/item-lots/stock?${qp.toString()}`);
    rows = getRowsSafe(res);
    if (res && typeof res === 'object' && 'meta' in res) {
      total = (res as { meta: { total: number } }).meta.total;
    } else {
      total = rows.length;
    }
  } catch (err: unknown) {
    console.error('Error al obtener /item-lots/stock:', err);
    errorMsg = err instanceof Error ? err.message : 'Error desconocido';
  }

  return (
    <div className="w-full min-h-screen space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="mt-10">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Lotes</h1>
          <p className="text-sm text-gray-500 mt-1">Inventario detallado por lote</p>
        </div>
        <div className="bg-white px-5 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">Total Lotes</span>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-gray-900 rounded-full"></span>
          Filtros de Búsqueda
        </h2>
        <Filters />
      </div>

      <LotForm />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-0">
          {/* Aquí usamos el componente cliente para tener filas clicables */}
          <LotsClientTable rows={rows} />
        </div>
      </div>
    </div>
  );
}