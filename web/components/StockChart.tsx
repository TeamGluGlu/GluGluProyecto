// web/components/StockChart.tsx (Area Chart Monocromático Final)
'use client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function StockChart({ data }: { data: { fecha: string; stock: number; }[] }) {
    // Colores de acento Monocromáticos
    const strokeColor = "#1F2937"; // Línea Negro Oscuro (stroke)
    const areaFillColor = "#E5E7EB"; // Sombreado Gris Claro (fill)

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
                data={data} 
                // CORREGIDO: left: 0 para evitar el recorte del eje Y.
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }} 
            >
                {/* Cuadrícula interna: Más sutil en gris claro */}
                <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
                
                {/* Ejes: Ajustamos el ancho para que quepan los números (sin recorte) */}
                <XAxis dataKey="fecha" hide={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis width={45} tick={{ fontSize: 10, fill: '#6B7280' }} />
                
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
                    fill={areaFillColor} // El "brillo"
                    strokeWidth={2} 
                    dot={false} 
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}