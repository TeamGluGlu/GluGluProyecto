'use client';

import { ReactNode } from 'react';

// --- Íconos del Header ---
const HeaderIcon = ({ columnKey }: { columnKey: string }) => {
  let icon;
  const key = String(columnKey);

  switch (key) {
    case 'item_id': case 'id':
      icon = <path strokeLinecap="round" strokeLinejoin="round" d="M15 9V5.25A2.25 2.25 0 0012.75 3H6A2.25 2.25 0 003.75 5.25v13.5A2.25 2.25 0 006 21h6.75A2.25 2.25 0 0015 18.75V15m-3-9l-3 3m0 0l-3-3m3 3V2.25" />;
      break;
    case 'item_nombre': case 'item':
      icon = <path strokeLinecap="round" strokeLinejoin="round" d="M20 7L4 7M4 7l4-4m-4 4l4 4m0 0l4-4m-4 4h12M12 11v9m0 0l-4-4m4 4l4-4" />;
      break;
    case 'item_unidad': case 'unidad':
      icon = <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 0a2.25 2.25 0 000 4.5h16.5a2.25 2.25 0 000-4.5m-16.5 0a2.25 2.25 0 010-4.5h16.5a2.25 2.25 0 010 4.5m-16.5 8.25V18a2.25 2.25 0 002.25 2.25h12.75A2.25 2.25 0 0021 18v-1.5M4.5 12.75V15m0 2.25V21M17.25 12.75V15M17.25 17.25V21" />;
      break;
    case 'stock': case 'stock_total': case 'stock_actual': case 'cantidad':
      icon = <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />;
      break;
    case 'lote_codigo': case 'lote':
      icon = <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m-4.5 0h19.5m-1.5 0L19.5 10.5M4.5 14.25L5.75 10.5M5.75 10.5h12.5M5.75 10.5V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v4.5m-8.625 10.5c.878 0 1.71-.342 2.333-.954L15 14.25m-3-3l2.25-2.25" />;
      break;
    case 'fecha_ingreso': case 'ingreso': case 'fecha_hora':
      icon = <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12v-.008zm-2.25-3h.008v.008H9.75v-.008zM9.75 15h.008v.008H9.75v-.008zm-.75 3h.008v.008H9v-.008zm3.75-3h.008v.008H13.5v-.008zm3.75 0h.008v.008H17.25v-.008zm3.75 0h.008v.008H21v-.008z" />;
      break;
    default:
      icon = <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />;
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {icon}
    </svg>
  );
};

export type ColumnDef<T> = {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => ReactNode;
};

interface DataTableProps<T> {
  columns: readonly ColumnDef<T>[];
  rows: T[];
}

export function DataTable<T extends { id: string | number }>({ 
  columns, 
  rows 
}: DataTableProps<T>) {
  
  const safeRows = rows || [];

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        
        <thead className="bg-gray-900 text-white">
          <tr>
            {columns.map((c, index) => {
              const isFirst = index === 0;
              const isLast = index === columns.length - 1;
              const roundedClass = isFirst ? 'rounded-l-2xl' : isLast ? 'rounded-r-2xl' : '';

              return (
                <th 
                  key={String(c.key)} 
                  className={`
                    text-left px-6 py-4 font-semibold
                    ${roundedClass}
                  `}
                >
                  <div className="flex items-center">
                    <HeaderIcon columnKey={String(c.key)} />
                    {c.header}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          <tr><td className="h-2"></td></tr>

          {safeRows.map((row) => (
            <tr 
              key={row.id} 
              className="group bg-white hover:bg-gray-50 transition-colors"
            >
              {columns.map((col) => {
                const cellValue = row[col.key];
                return (
                  <td 
                    key={`${row.id}-${String(col.key)}`} 
                    className="px-6 py-4 text-gray-700 border-b border-gray-100 group-hover:text-black first:rounded-l-lg last:rounded-r-lg"
                  >
                    {col.render 
                      ? col.render(cellValue, row) 
                      : String(cellValue ?? '')
                    }
                  </td>
                );
              })}
            </tr>
          ))}

          {safeRows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100 mt-2">
                <div className="flex flex-col items-center justify-center gap-2">
                  {/* ÍCONO CORREGIDO */}
                  <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="text-sm font-medium">No hay datos disponibles</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}