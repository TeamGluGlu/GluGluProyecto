// web/components/ItemsClientTable.tsx
'use client';

import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/DataTable';
import Link from 'next/link';
import { useState } from 'react';

type EnrichedItem = {
  id: number;
  nombre: string;
  tipo: string;
  unidad: string;
  activo: boolean;
  stock_total: number;
};

interface Props {
  rows: EnrichedItem[];
}

export default function ItemsClientTable({ rows }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este ítem? Esta acción no se puede deshacer.')) return;
    
    setDeletingId(id);
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    try {
      const res = await fetch(`${base}/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      router.refresh(); // Recargar datos
    } catch (error) {
      console.error(error);
      alert('No se pudo eliminar el ítem (posiblemente tenga movimientos asociados).');
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    { key: 'nombre', header: 'Nombre' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'unidad', header: 'Unidad' },
    { key: 'stock_total', header: 'Cantidad' },
    { 
      key: 'activo', 
      header: 'Estado',
      // CORRECCIÓN AQUÍ: Usamos 'any' o 'unknown' para satisfacer la firma genérica
      render: (val: unknown) => {
        const isActive = val as boolean;
        return (
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
        );
      }
    },
    {
      key: 'id', // Usamos 'id' como key dummy para acciones
      header: 'Acciones',
      // 'row' ya viene tipado correctamente como EnrichedItem gracias a la inferencia
      render: (_: unknown, row: EnrichedItem) => (
        <div className="flex items-center gap-2">
          {/* Botón Editar -> Navega a /items/[id] */}
          <Link 
            href={`/items/${row.id}`}
            className="text-blue-600 hover:text-blue-900 font-medium text-xs bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
          >
            Editar
          </Link>

          {/* Botón Eliminar -> DELETE /items/{id} */}
          <button
            onClick={() => handleDelete(row.id)}
            disabled={deletingId === row.id}
            className="text-red-600 hover:text-red-900 font-medium text-xs bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-colors disabled:opacity-50"
          >
            {deletingId === row.id ? '...' : 'Eliminar'}
          </button>
        </div>
      )
    }
  ] as const;

  return <DataTable columns={columns} rows={rows} />;
}