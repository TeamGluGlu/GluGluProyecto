export function KpiCard({ title, value, sub }: { title: string; value: string | number; sub?: string; }) {
    return (
        <div className="rounded-2xl border p-4 shadow-sm">
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-3xl font-semibold mt-1">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
        </div>
    );
}