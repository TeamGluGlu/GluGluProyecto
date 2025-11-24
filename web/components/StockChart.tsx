// web/components/StockChart.tsx (Area Chart Monocromático Final)
'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer
} from 'recharts';

export default function StockChart({
    data
}: {
    data: { fecha: string; stock: number }[];
}) {
    // Colores de acento Monocromáticos
    const strokeColor = "#1F2937";   // Línea Negro Oscuro (stroke)
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

                {/* Ejes */}
                <XAxis
                    dataKey="fecha"
                    hide={false}
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                />
                <YAxis
                    width={45}
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                />

                {/* Tooltip */}
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#1F2937',
                        borderColor: '#4B5563',
                        color: '#fff',
                        borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#fff' }}
                />

                {/* Curva y Área Sombreada */}
                <Area
                    type="monotone"
                    dataKey="stock"
                    stroke={strokeColor}
                    fill={areaFillColor}
                    strokeWidth={2}
                    dot={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
