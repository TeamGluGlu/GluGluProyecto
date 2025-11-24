// web/app/lots/[id]/page.tsx
import { api } from '@/lib/api';
import Link from 'next/link';
import MovementsTable, { MovementRow } from '@/components/MovementsTable'; // Asegúrate de exportar MovementRow si lo necesitas, o redefinirlo

// Tipos del Lote
interface LotDetail {
  id: number;
  item_id: number;
  lote_codigo: string;
  fecha_ingreso: string;
  fecha_vencimiento?: string | null;
  costo_lote: number;
  cantidad_inicial: number;
  observacion?: string | null;
  item?: {
    nombre: string;
    unidad: string;
  };
}

// Definimos estrictamente lo que viene del Kardex (API)
interface LedgerItem {
  id: string | number;
  fecha_hora: string;
  item_nombre?: string;
  lote_codigo?: string;
  tipo: 'IN' | 'OUT';
  cantidad: number;
  motivo: string;
  observacion?: string;
}

// Tipo para respuesta de Ledger
interface LedgerResponse {
  data: LedgerItem[];
}

export default async function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  let lot: LotDetail | null = null;
  // Usamos el tipo MovementRow que espera la tabla, o lo inferimos
  let movements: MovementRow[] = [];
  let errorMsg = '';

  try {
    // 1. Obtener detalles del Lote
    const resLot = await api<LotDetail>(`/item-lots/${id}`);
    lot = resLot;

    // 2. Obtener movimientos de ESTE lote
    const resMovs = await api<LedgerResponse>(`/stock/ledger?lot_id=${id}&pageSize=50`);
    
    // Adaptamos los datos SIN usar any
    movements = (resMovs.data || []).map((m) => ({
      id: m.id,
      fecha_hora: m.fecha_hora 
        ? new Date(m.fecha_hora).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
        : '-',
      item_nombre: m.item_nombre || lot?.item?.nombre || 'Item',
      lote_codigo: m.lote_codigo || lot?.lote_codigo || '-',
      tipo: m.tipo,
      cantidad: Number(m.cantidad),
      motivo: m.motivo,
      observacion: m.observacion || ''
    }));

  } catch (err) {
    console.error(err);
    errorMsg = 'No se encontró el lote o hubo un error.';
  }

  if (errorMsg || !lot) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-red-600 font-bold text-xl">{errorMsg}</h2>
        <Link href="/lots" className="text-blue-600 hover:underline mt-4 block">Volver a Lotes</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      {/* Header y Navegación */}
      <div className="flex items-center gap-4">
        <Link href="/lots" className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detalle de Lote: {lot.lote_codigo}</h1>
          <p className="text-sm text-gray-500">ID Interno: {lot.id}</p>
        </div>
      </div>

      {/* Tarjeta de Información */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">Información General</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <span className="text-xs text-gray-500 block">Fecha Ingreso</span>
            <span className="font-medium text-gray-900">
              {new Date(lot.fecha_ingreso).toLocaleDateString('es-PE')}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Costo Lote</span>
            <span className="font-medium text-gray-900">S/ {Number(lot.costo_lote).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Cantidad Inicial</span>
            <span className="font-medium text-gray-900">{Number(lot.cantidad_inicial)}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Vencimiento</span>
            <span className={`font-medium ${!lot.fecha_vencimiento ? 'text-gray-400 italic' : 'text-gray-900'}`}>
              {lot.fecha_vencimiento ? new Date(lot.fecha_vencimiento).toLocaleDateString('es-PE') : 'N/A'}
            </span>
          </div>
          <div className="md:col-span-2">
            <span className="text-xs text-gray-500 block">Observación</span>
            <span className="text-gray-900 text-sm">{lot.observacion || '-'}</span>
          </div>
        </div>
      </div>

      {/* Historial de Movimientos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Historial de Movimientos (Kardex)</h2>
        {movements.length > 0 ? (
          <MovementsTable rows={movements} />
        ) : (
          <p className="text-center py-8 text-gray-400 text-sm">No hay movimientos registrados para este lote.</p>
        )}
      </div>
    </div>
  );
}