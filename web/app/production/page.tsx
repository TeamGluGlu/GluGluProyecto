'use client';

import { useEffect, useState, useCallback } from 'react';
import ProductionForm from '@/components/ProductionForm';
import { KpiCard } from '@/components/KpiCard';
import { api } from '@/lib/api';

export default function ProductionPage() {
  const [totalToday, setTotalToday] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Función para obtener el total del día
  const fetchStats = useCallback(async () => {
    try {
      const res = await api<{ total: number }>('/production/today');
      setTotalToday(res.total);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Cargar al montar el componente
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="w-full space-y-8">
      {/* Encabezado */}
      <div className="mt-8 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Área de Producción</h1>
          <p className="text-gray-500 mt-2">
            Registra la producción diaria y gestiona el consumo de insumos.
          </p>
        </div>
        
        {/* Widget de KPI - Producción Hoy */}
        <div className="w-full md:w-64 h-32">
          {loadingStats ? (
             // Skeleton loader simple mientras carga
             <div className="bg-gray-50 animate-pulse rounded-3xl h-full w-full border border-gray-100"></div>
          ) : (
             <KpiCard 
               title="Producción Hoy (Bidones)" 
               value={totalToday} 
             />
          )}
        </div>
      </div>

      {/* Formulario 
          Nota: Para que el contador se actualice automáticamente al guardar,
          necesitaríamos pasar fetchStats como prop al formulario.
          Por ahora, se actualizará al refrescar la página.
      */}
      <ProductionForm />
    </div>
  );
}