'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function StockChart({ data }: { data: { fecha: string; stock: number; }[] }) {
    return (
        <div className="h-72 w-full rounded-2xl border p-4">
        <div className="text-sm text-gray-600 mb-2">Evolución de stock (últimos 30 días)</div>
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" hide={false} tick={{ fontSize: 12 }} />
            <YAxis width={40} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="stock" stroke="#111827" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
        </div>
    );
}