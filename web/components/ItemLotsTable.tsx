// web/components/ItemLotsTable.tsx
'use client';

import { DataTable, ColumnDef } from '@/components/DataTable';
import { useRouter } from 'next/navigation';

interface LotRow {
  id: number;
  lote_codigo: string;
  fecha_ingreso: string;
  stock_actual: number;
}

interface Props {
  rows: LotRow[];
}

export default function ItemLotsTable({ rows }: Props) {
  const router = useRouter();

  const columns: ColumnDef<LotRow>[] = [
    { key: 'lote_codigo', header: 'Código Lote' }, // Ya no necesita Link
    { key: 'fecha_ingreso', header: 'Fecha Ingreso' },
    { 
      key: 'stock_actual', 
      header: 'Stock Actual', 
      render: (val) => <span className="font-bold">{String(val)}</span> 
    }
  ];

  return (
    <DataTable 
      columns={columns} 
      rows={rows} 
      // AQUÍ ESTÁ LA MAGIA: Navegación al hacer click en la fila
      onRowClick={(row) => router.push(`/lots/${row.id}`)}
    />
  );
}