import { api } from '@/lib/api';
import KardexTable from '@/components/KardexTable';

interface KardexItem {
  id: string;
  fecha_hora: string;
  item_nombre: string;
  lote_codigo: string;
  tipo: 'IN' | 'OUT';
  cantidad: number;
  saldo: number;
  motivo: string;
}

interface KardexResponse {
  meta: { total: number; page: number; pageSize: number };
  data: KardexItem[];
}

export default async function KardexPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = sp?.page || '1';
  const pageSize = '50';

  let rows: KardexItem[] = [];
  let total = 0;

  try {
    const res = await api<KardexResponse>(`/stock/ledger?page=${page}&pageSize=${pageSize}`);
    
    rows = (res.data || []).map(r => ({
      ...r,
      fecha_hora: new Date(r.fecha_hora).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      cantidad: Number(r.cantidad),
      saldo: Number(r.saldo)
    }));
    total = res.meta.total;

  } catch (e) {
    console.error(e);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mt-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kardex General</h1>
          <p className="text-sm text-gray-500">Historial completo con saldos calculados</p>
        </div>
        <a 
          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/stock/ledger/export`}
          target="_blank"
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          ⬇ Descargar CSV
        </a>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <KardexTable rows={rows} />
      </div>
      
      <p className="text-center text-xs text-gray-400 mt-4">
        Mostrando {rows.length} de {total} movimientos.
      </p>
    </div>
  );
}