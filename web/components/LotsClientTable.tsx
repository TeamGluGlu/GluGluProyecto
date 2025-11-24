// web/components/LotsClientTable.tsx
'use client';

import { DataTable, ColumnDef } from '@/components/DataTable';
import { useRouter } from 'next/navigation';

// Reutilizamos la interfaz que usabas en page.tsx
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

interface Props {
  rows: LotRow[];
}

export default function LotsClientTable({ rows }: Props) {
  const router = useRouter();

  const columns: ColumnDef<LotRow>[] = [
    { key: 'item_nombre', header: 'Producto' },
    { key: 'lote_codigo', header: 'Lote' },
    { key: 'item_unidad', header: 'Unidad' },
    { key: 'fecha_ingreso', header: 'Fecha Ingreso' },
    { key: 'stock_actual', header: 'Stock Actual' },
  ];

  return (
    <DataTable 
      columns={columns} 
      rows={rows}
      onRowClick={(row) => router.push(`/lots/${row.id}`)}
    />
  );
}