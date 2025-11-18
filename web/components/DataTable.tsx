export function DataTable<T extends { id?: string|number }>({ columns, rows }:{ columns: { key: keyof T; header: string; }[]; rows: T[]; }) {  
  const safeRows = rows || [];
  
  return (
    <div className="overflow-auto rounded-2xl border-2 border-cyan-400">
      <table className="min-w-full text-sm"> 
        <thead className="bg-gradient-to-r from-cyan-500 to-cyan-600">
          <tr>
            {columns.map(c => (
              <th key={String(c.key)} className="text-left px-4 py-3 font-semibold text-white border-b-2 border-cyan-400">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeRows.map((r, i) => (
            <tr 
              key={i} 
              className="odd:bg-white even:bg-cyan-50 hover:bg-cyan-100 transition-colors border-b border-cyan-200"
            >
              {columns.map(c => (
                <td key={String(c.key)} className="px-4 py-3 text-gray-700">
                  {String(r[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}