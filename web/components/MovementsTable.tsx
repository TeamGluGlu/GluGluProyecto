'use client';

import { DataTable, ColumnDef } from '@/components/DataTable';

// Definimos la interfaz aquí para usarla en el componente
export interface MovementRow {
  id: number | string;
  fecha_hora: string;
  item_nombre: string;
  lote_codigo: string;
  tipo: 'IN' | 'OUT';
  cantidad: number;
  motivo: string;
  observacion?: string;
}

interface Props {
  rows: MovementRow[];
}

export default function MovementsTable({ rows }: Props) {
  // Definimos las columnas AQUÍ, en el lado del cliente
  const columns: ColumnDef<MovementRow>[] = [
    { key: 'fecha_hora', header: 'Fecha' },
    { key: 'item_nombre', header: 'Producto' },
    { key: 'lote_codigo', header: 'Lote' },
    { 
      key: 'tipo', 
      header: 'Tipo',
      // Ahora SÍ podemos usar funciones porque estamos en 'use client'
      render: (val) => (
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
          val === 'IN' 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {val === 'IN' ? '⬇ ENTRADA' : '⬆ SALIDA'}
        </span>
      )
    },
    { key: 'motivo', header: 'Motivo' },
    { key: 'cantidad', header: 'Cant.' },
  ];

  return <DataTable columns={columns} rows={rows} />;
}