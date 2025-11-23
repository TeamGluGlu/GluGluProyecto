import { api } from '@/lib/api';
import { normalizeApiResponse } from '@/lib/helpers';
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

export default async function LotsPage({
  searchParams,
}: {
  searchParams: { [k: string]: string | undefined };
}) {
  const qp = new URLSearchParams();
  if (searchParams.item_id) qp.set('item_id', searchParams.item_id);
  if (searchParams.search) qp.set('search', searchParams.search);
  qp.set('page', '1');
  qp.set('pageSize', '50');

  let rows: LotRow[] = [];
  let total = 0;

  try {
    const res = await api<any>(`/item-lots/stock?${qp.toString()}`);
    // Asegúrate de tener esta función en lib/helpers, si no, usa la lógica manual
    rows = normalizeApiResponse<LotRow>(res);
    total = res?.meta?.total || rows.length;

    // Formatear fechas
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
    <div className="w-full min-h-screen"> 
      <div className="w-full space-y-6">
        
        {/* Título Principal */}
        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-3">Stock por Lote</h1>
        
        {/* Header Section (Monochrome) */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-300 p-6 w-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mt-1">
                Gestiona y visualiza el inventario de lotes
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 rounded-xl px-4 py-2 border border-gray-300">
                <span className="text-xs font-medium text-gray-600">
                  Total registros
                </span>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-300 p-6 w-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-gray-900 rounded-full"></div>
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>
          <Filters />
        </div>

        {/* Form Section */}
        <div className="bg-gray-900 rounded-2xl shadow-xl p-6 w-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-white rounded-full"></div>
            <h2 className="text-lg font-semibold text-white">
              Registrar Nuevo Lote
            </h2>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-300">
            <LotForm />
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-300 overflow-hidden w-full">
          {/* Eliminamos el header negro manual porque la DataTable ya tiene el suyo redondeado */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Listado de Inventario</h2>
            <DataTable columns={columns as any} rows={rows as any[]} />
          </div>
        </div>
      </div>
    </div>
  );
}