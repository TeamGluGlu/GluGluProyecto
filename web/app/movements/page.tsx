import { api } from '@/lib/api';
import { Filters } from '@/components/Filters';
import MovementForm from '@/components/MovementForm';
import MovementsTable, { MovementRow } from '@/components/MovementsTable';

// Estructura de lo que esperamos recibir de la API (Raw Data)
interface RawMovement {
  id: number;
  fecha_hora?: string;
  tipo: 'IN' | 'OUT';
  cantidad: string | number;
  motivo: string;
  observacion?: string;
  // Relaciones posibles
  items?: { nombre: string };
  item?: { nombre: string };
  item_lots?: { lote_codigo: string };
  lot?: { lote_codigo: string };
}

// Helper seguro y tipado
function getRowsSafe(res: unknown): MovementRow[] {
  if (!res || typeof res !== 'object') return [];
  
  // Extraer el array de datos ya sea directo o dentro de .data
  let data: RawMovement[] = [];
  
  if (Array.isArray(res)) {
    data = res as RawMovement[];
  } else if ('data' in res && Array.isArray((res as { data: unknown }).data)) {
    data = (res as { data: RawMovement[] }).data;
  } else {
    return [];
  }
  
  // Mapear al formato que necesita la tabla
  return data.map((m) => ({
    id: m.id,
    fecha_hora: m.fecha_hora 
      ? new Date(m.fecha_hora).toLocaleString('es-PE', { 
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit' 
        }) 
      : '-',
    item_nombre: m.items?.nombre || m.item?.nombre || 'Desconocido',
    lote_codigo: m.item_lots?.lote_codigo || m.lot?.lote_codigo || 'Sin Lote',
    tipo: m.tipo,
    cantidad: Number(m.cantidad),
    motivo: m.motivo,
    observacion: m.observacion
  }));
}

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const qp = new URLSearchParams();
  if (sp?.search) qp.set('search', sp.search);
  qp.set('page', '1');
  qp.set('pageSize', '50');

  let rows: MovementRow[] = [];
  let errorMsg = '';

  try {
    // Usamos unknown en lugar de any para forzar el chequeo en getRowsSafe
    const res = await api<unknown>(`/movements?${qp.toString()}`);
    rows = getRowsSafe(res);
  } catch (err: unknown) {
    console.error('Error fetching movements:', err);
    errorMsg = err instanceof Error ? err.message : 'Error desconocido';
  }

  return (
    <div className="w-full min-h-screen space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimientos de Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Historial de entradas, salidas y ajustes</p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          ⚠️ {errorMsg}
        </div>
      )}

      <MovementForm />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
           <span className="w-1 h-4 bg-gray-900 rounded-full"></span>
           Historial Reciente
        </h2>
        
        <div className="mb-4">
           <Filters />
        </div>

        {rows.length === 0 && !errorMsg ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No se encontraron movimientos registrados.
          </div>
        ) : (
          <MovementsTable rows={rows} />
        )}
      </div>
    </div>
  );
}