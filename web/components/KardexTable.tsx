'use client';

import { DataTable, ColumnDef } from '@/components/DataTable';

interface KardexRow {
  id: string | number;
  fecha_hora: string;
  item_nombre: string;
  lote_codigo: string;
  tipo: 'IN' | 'OUT';
  cantidad: number;
  saldo: number;
  motivo: string;
}

export default function KardexTable({ rows }: { rows: KardexRow[] }) {
  const columns: ColumnDef<KardexRow>[] = [
    { key: 'fecha_hora', header: 'Fecha' },
    { key: 'item_nombre', header: 'Ítem' },
    { key: 'lote_codigo', header: 'Lote' },
    { 
      key: 'tipo', 
      header: 'Mov.',
      render: (val) => (
        <span className={`font-bold ${val === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
          {val === 'IN' ? '+' : '-'}
        </span>
      )
    },
    { key: 'cantidad', header: 'Cant.' },
    { 
      key: 'saldo', 
      header: 'Saldo', 
      render: (val) => <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">{String(val)}</span>
    },
    { key: 'motivo', header: 'Motivo', render: (val) => <span className="text-xs text-gray-500 uppercase">{String(val)}</span> }
  ];

  return <DataTable columns={columns} rows={rows} />;
}