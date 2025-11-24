'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { KpiCard } from '@/components/KpiCard';
import { DataTable, ColumnDef } from '@/components/DataTable';

// --- TIPOS DE RESPUESTA API (Raw Data) ---
// Definimos lo que viene exactamente del backend para evitar 'any'

interface ApiLowStockItem {
  item_id: number;
  item_nombre: string;
  unidad: string;
  minimo_alerta: number | null; // Puede ser null
  stock_total: number;
}

interface ApiLotItem {
  item_id: number;
  item_nombre: string;
  item_unidad: string;
  lot_id: number;
  lote_codigo: string;
  fecha_ingreso: string;
  stock_actual: number;
}

interface ApiHistoryItem {
  item_id: number;
  item_nombre: string;
  item_unidad: string;
  stock_a_fecha: number;
}

// --- TIPOS DE INTERFAZ DE USUARIO (UI Data) ---
// Estos tienen la propiedad 'id' que DataTable necesita

type LowStockItem = {
  id: number;
  item_id: number;
  item_nombre: string;
  minimo_alerta: number;
  stock_total: number;
  unidad: string;
};

type LotItem = {
  id: number;
  lot_id: number;
  lote_codigo: string;
  item_nombre: string;
  stock_actual: number;
  fecha_ingreso: string;
  dias_antiguedad: number;
};

type HistoryItem = {
  id: number;
  item_id: number;
  item_nombre: string;
  item_unidad: string;
  stock_a_fecha: number;
};

// --- COMPONENTE PRINCIPAL ---
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'aging' | 'history'>('alerts');

  // Estados de Datos fuertemente tipados
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [agingLots, setAgingLots] = useState<LotItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para Histórico
  const [histDate, setHistDate] = useState('');
  const [histData, setHistData] = useState<HistoryItem[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      // 1. Cargar Alertas
      // Especificamos el tipo genérico <{ data: ApiLowStockItem[] }>
      const lowRes = await api<{ data: ApiLowStockItem[] }>('/stock/low');
      const lowData = lowRes.data || [];
      
      setLowStock(
        lowData.map((i) => ({
          ...i,
          id: i.item_id,
          minimo_alerta: i.minimo_alerta ?? 0, // Manejo seguro de null
        }))
      );

      // 2. Cargar Lotes para Aging
      const lotsRes = await api<{ data: ApiLotItem[] }>('/item-lots/stock?pageSize=100');
      const lotsData = lotsRes.data || [];
      
      const today = new Date();
      const calculatedAging: LotItem[] = lotsData.map((l) => {
        const ingreso = new Date(l.fecha_ingreso);
        const diffTime = Math.abs(today.getTime() - ingreso.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          id: l.lot_id,
          lot_id: l.lot_id,
          lote_codigo: l.lote_codigo,
          item_nombre: l.item_nombre,
          stock_actual: Number(l.stock_actual),
          fecha_ingreso: ingreso.toLocaleDateString('es-PE'),
          dias_antiguedad: diffDays
        };
      }).sort((a, b) => b.dias_antiguedad - a.dias_antiguedad);

      setAgingLots(calculatedAging);

    } catch (e) {
      console.error("Error cargando reportes:", e);
    } finally {
      setLoading(false);
    }
  }

  // Función para consultar histórico
  async function handleHistorySearch() {
    if (!histDate) return;
    setLoadingHist(true);
    try {
      // Tipado de la respuesta del histórico
      const res = await api<{ data: ApiHistoryItem[] }>(`/stock/at-date?date=${histDate}`);
      const data = res.data || [];
      
      setHistData(
        data.map((i) => ({
          ...i,
          id: i.item_id
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHist(false);
    }
  }

  // --- COLUMNAS PARA TABLAS ---
  const colsAlerts: ColumnDef<LowStockItem>[] = [
    { key: 'item_nombre', header: 'Producto' },
    { key: 'minimo_alerta', header: 'Mínimo' },
    { 
      key: 'stock_total', 
      header: 'Stock Actual',
      render: (val) => <span className="text-red-600 font-bold">{val}</span>
    },
    { key: 'unidad', header: 'Unidad' }
  ];

  const colsAging: ColumnDef<LotItem>[] = [
    { key: 'item_nombre', header: 'Producto' },
    { key: 'lote_codigo', header: 'Lote' },
    { key: 'fecha_ingreso', header: 'Ingreso' },
    { key: 'stock_actual', header: 'Stock' },
    { 
      key: 'dias_antiguedad', 
      header: 'Antigüedad (Días)',
      render: (days) => (
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
          Number(days) > 90 ? 'bg-red-100 text-red-700' :
          Number(days) > 60 ? 'bg-orange-100 text-orange-700' :
          Number(days) > 30 ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          {days} días
        </span>
      )
    },
  ];

  // Aquí usamos HistoryItem en lugar de any
  const colsHist: ColumnDef<HistoryItem>[] = [
    { key: 'item_nombre', header: 'Producto' },
    { key: 'stock_a_fecha', header: `Stock al ${histDate}` },
    { key: 'item_unidad', header: 'Unidad' },
  ];

  // Cálculos de KPI para Aging
  const old90 = agingLots.filter(l => l.dias_antiguedad > 90).length;
  const old60 = agingLots.filter(l => l.dias_antiguedad > 60 && l.dias_antiguedad <= 90).length;
  const old30 = agingLots.filter(l => l.dias_antiguedad > 30 && l.dias_antiguedad <= 60).length;

  return (
    <div className="w-full min-h-screen space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes y Analítica</h1>
          <p className="text-sm text-gray-500 mt-1">Visión general del estado de tu inventario</p>
        </div>
        
        {/* Botón Exportar Kardex */}
        <a 
          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/stock/ledger/export`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-black transition-all flex items-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar Kardex (CSV)
        </a>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'alerts' 
              ? 'border-gray-900 text-gray-900' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🚨 Alertas de Stock
        </button>
        <button
          onClick={() => setActiveTab('aging')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'aging' 
              ? 'border-gray-900 text-gray-900' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ⏳ Antigüedad (Aging)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history' 
              ? 'border-gray-900 text-gray-900' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📅 Stock Histórico
        </button>
      </div>

      {/* --- CONTENIDO DE TABS --- */}

      {/* TAB 1: ALERTAS */}
      {activeTab === 'alerts' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Productos con Stock Crítico</h2>
                  <p className="text-sm text-gray-500">Estos ítems están por debajo del mínimo configurado.</p>
                </div>
             </div>

             {loading ? (
               <p className="text-gray-400 py-10 text-center">Cargando alertas...</p>
             ) : lowStock.length === 0 ? (
               <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                 <p className="text-gray-900 font-medium">¡Todo excelente!</p>
                 <p className="text-sm text-gray-500">No tienes alertas de stock bajo actualmente.</p>
               </div>
             ) : (
               <DataTable columns={colsAlerts} rows={lowStock} />
             )}
          </div>
        </div>
      )}

      {/* TAB 2: AGING */}
      {activeTab === 'aging' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* KPIs de Aging */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <KpiCard title="Lotes Críticos (>90 días)" value={old90} />
             <KpiCard title="Lotes en Riesgo (60-90 días)" value={old60} />
             <KpiCard title="Lotes en Observación (30-60 días)" value={old30} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
             <h2 className="text-lg font-bold text-gray-900 mb-4">Detalle de Antigüedad por Lote</h2>
             <DataTable columns={colsAging} rows={agingLots} />
          </div>
        </div>
      )}

      {/* TAB 3: HISTÓRICO */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-in fade-in duration-300">
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-end mb-6">
                 <div className="w-full sm:w-auto">
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Seleccionar Fecha</label>
                    <input 
                      type="date" 
                      value={histDate}
                      onChange={(e) => setHistDate(e.target.value)}
                      className="border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 outline-none w-full sm:w-64"
                    />
                 </div>
                 <button 
                   onClick={handleHistorySearch}
                   disabled={!histDate || loadingHist}
                   className="bg-gray-900 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-black disabled:opacity-50 transition-all"
                 >
                   {loadingHist ? 'Consultando...' : 'Consultar Stock'}
                 </button>
              </div>

              {histData.length > 0 && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                   <h3 className="text-sm font-bold text-gray-900 mb-3">Resultados al {histDate}:</h3>
                   <DataTable columns={colsHist} rows={histData} />
                </div>
              )}
           </div>
        </div>
      )}

    </div>
  );
}