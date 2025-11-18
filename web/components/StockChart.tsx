// web/components/StockChart.tsx (Area Chart Suave - Estilo Tixou)
'use client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function StockChart({ data }: { data: { fecha: string; stock: number; }[] }) {
    // Colores de acento para la gráfica
    const strokeColor = "#2563EB"; // Línea Azul Oscuro
    const areaFillColor = "#E0F2FE"; // Sombreado Azul Claro

    return (
        // El ResponsiveContainer asegura que la gráfica se adapte a la altura (h-72) que le dimos en page.tsx
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
                data={data} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }} // Ajuste de margen para que los números del eje Y no se corten
            >
                {/* Líneas de la cuadrícula en gris claro */}
                <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                
                {/* Eje X (Fechas) */}
                <XAxis dataKey="fecha" hide={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                
                {/* Eje Y (Stock) */}
                <YAxis width={40} tick={{ fontSize: 10, fill: '#6B7280' }} />
                
                {/* Tooltip (Caja que sale al pasar el mouse) */}
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563', color: '#fff', borderRadius: '8px' }} 
                    labelStyle={{ color: '#fff' }} 
                />
                
                {/* La Curva y el Área Sombreada */}
                <Area 
                    type="monotone" // Curva suave
                    dataKey="stock" 
                    stroke={strokeColor} 
                    fill={areaFillColor} 
                    strokeWidth={3} // Línea más gruesa
                    dot={false} // Sin círculos en los puntos
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}