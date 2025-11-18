import { api } from '@/lib/api';
import { Filters } from '@/components/Filters';
import { DataTable } from '@/components/DataTable';
import LotForm from '@/components/LotForm';

type LotRow = {
  item_id: number;
  item_nombre: string;
  item_unidad: string;
  lot_id: number;
  lote_codigo: string;
  fecha_ingreso: string;
  stock_actual: number | string;
};

function asArray<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.items?.data)) return value.items.data;
  return [];
}

export default async function LotsPage({
  searchParams,
}: {
  searchParams: { [k: string]: string | undefined };
}) {
  const qp = new URLSearchParams();
  if (searchParams.item_id) qp.set('item_id', searchParams.item_id);
  if (searchParams.lote_codigo) qp.set('lote_codigo', searchParams.lote_codigo);
  qp.set('page', '1');
  qp.set('pageSize', '50');

  let rows: LotRow[] = [];
  let total = 0;

  try {
    const res = await api<any>(`/item-lots/stock?${qp.toString()}`);

    // Soporta ambas formas: { meta, rows } o { data }
    if (Array.isArray(res?.rows)) {
      rows = res.rows;
      total = Number(res?.meta?.total ?? rows.length);
    } else {
      const arr = asArray<LotRow>(res);
      rows = arr;
      total = arr.length;
    }

    // Transformar fecha_ingreso a formato legible
    rows = rows.map((r) => ({
      ...r,
      fecha_ingreso: r.fecha_ingreso
        ? new Date(r.fecha_ingreso).toLocaleDateString('es-PE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
        : '',
    }));
  } catch (err) {
    console.error('Error al obtener /item-lots/stock:', err);
  }

  const columns = [
    { key: 'item_id', header: 'ItemID' },
    { key: 'item_nombre', header: 'Item' },
    { key: 'item_unidad', header: 'Und' },
    { key: 'lot_id', header: 'LotID' },
    { key: 'lote_codigo', header: 'Lote' },
    { key: 'fecha_ingreso', header: 'Ingreso' },
    { key: 'stock_actual', header: 'Stock' },
  ] as const;

  return (
    <div className="w-full min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-cyan-400 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-cyan-600">
                Stock por Lote
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Gestiona y visualiza el inventario de lotes
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-cyan-50 rounded-xl px-4 py-2 border-2 border-cyan-400">
                <span className="text-xs font-medium text-cyan-600">
                  Total registros
                </span>
                <p className="text-2xl font-bold text-cyan-700">{total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-cyan-400 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-cyan-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-cyan-600">Filtros</h2>
          </div>
          <Filters />
        </div>

        {/* Form Section */}
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl shadow-xl border-2 border-cyan-400 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-white rounded-full"></div>
            <h2 className="text-lg font-semibold text-white">
              Registrar Nuevo Lote
            </h2>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-cyan-300">
            <LotForm />
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-cyan-400 overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Tabla de Inventario
            </h2>
          </div>
          <div className="p-6">
            <DataTable columns={columns as any} rows={rows as any[]} />
          </div>
        </div>
      </div>
    </div>
  );
}