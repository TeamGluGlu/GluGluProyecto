import { api } from '@/lib/api';
import { Filters } from '@/components/Filters';
import { DataTable } from '@/components/DataTable';
import LotForm from '@/components/LotForm';

// 1. Definición estricta de la fila (Lo que va a la tabla)
type LotRow = {
  item_id: number;
  item_nombre: string;
  item_unidad: string;
  lot_id: number;
  lote_codigo: string;
  fecha_ingreso: string;
  stock_actual: number | string;
};

// 2. Definición de la respuesta de la API (Lo que viene del backend)
type LotApiResponse = {
  data: {
    item_id: number;
    item_nombre: string;
    item_unidad: string;
    lot_id: number;
    lote_codigo: string;
    fecha_ingreso: string;
    stock_actual: number | string; // Puede venir como string si es BigInt serializado
  }[];
  meta?: {
    total: number;
  };
};

// Helper seguro para extraer array
function getRowsSafe(res: unknown): LotRow[] {
  if (!res || typeof res !== 'object') return [];
  
  // Si es array directo
  if (Array.isArray(res)) return res as LotRow[];
  
  // Si tiene propiedad data (formato estándar de tu API)
  if ('data' in res && Array.isArray((res as LotApiResponse).data)) {
    return (res as LotApiResponse).data.map(item => ({
      ...item,
      // Aseguramos conversión segura de datos aquí
      stock_actual: Number(item.stock_actual),
      fecha_ingreso: item.fecha_ingreso 
        ? new Date(item.fecha_ingreso).toLocaleDateString('es-PE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
        : '-',
    }));
  }
  
  return [];
}

export default async function LotsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>; // Next.js 15 typing
}) {
  // Esperar los params (corrección para versiones nuevas de Next.js)
  const sp = await searchParams;
  
  const qp = new URLSearchParams();
  if (sp?.item_id) qp.set('item_id', sp.item_id);
  if (sp?.search) qp.set('search', sp.search); // Usamos 'search' para coincidir con el filtro
  qp.set('page', '1');
  qp.set('pageSize', '50');

  let rows: LotRow[] = [];
  let total = 0;

  try {
    // Usamos 'unknown' en lugar de 'any' para forzar el uso del helper seguro
    const res = await api<unknown>(`/item-lots/stock?${qp.toString()}`);
    rows = getRowsSafe(res);
    
    // Intentamos obtener el total si existe en la meta, sino usamos length
    if (res && typeof res === 'object' && 'meta' in res) {
      total = (res as { meta: { total: number } }).meta.total;
    } else {
      total = rows.length;
    }

  } catch (err) {
    console.error('Error al obtener /item-lots/stock:', err);
  }

  // Columnas tipadas correctamente (keys coinciden con LotRow)
  const columns = [
    // { key: 'item_id', header: 'ID' }, // Descomentar si quieres ver el ID
    { key: 'item_nombre', header: 'Producto' },
    { key: 'lote_codigo', header: 'Lote' },
    { key: 'item_unidad', header: 'Unidad' },
    { key: 'fecha_ingreso', header: 'Fecha Ingreso' },
    { key: 'stock_actual', header: 'Stock Actual' },
  ] as const;

  return (
    <div className="w-full min-h-screen space-y-6">
      
      {/* Header y KPI */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className='mt-10'>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Lotes</h1>
          <p className="text-sm text-gray-500 mt-1">Inventario detallado por lote y fecha</p>
        </div>
        
        <div className="bg-white px-5 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">Total Lotes</span>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
        </div>
      </div>

      {/* Sección de Filtros (Ahora con diseño mejorado) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-gray-900 rounded-full"></span>
          Filtros de Búsqueda
        </h2>
        <Filters />
      </div>

      {/* Formulario */}
      <LotForm />

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-0">
          {/* Ya no necesitamos 'as any' aquí gracias a los tipos correctos */}
          <DataTable columns={columns} rows={rows} />
        </div>
      </div>
    </div>
  );
}