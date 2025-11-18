// web/app/layout.tsx (Con margen horizontal ml-8 para separación)
import './globals.css';
import Sidebar from '@/components/Sidebar'; 
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = { title: 'GluGlu Dashboard', description: 'Sistema Moderno' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} flex h-screen bg-[#F3F4F6] text-slate-900 overflow-hidden`}>
        
        <Sidebar />

        {/* --- CONTENIDO PRINCIPAL: AÑADIMOS MARGEN EXTERNO (ml-8) --- */}
        <main className="flex-1 overflow-y-auto ml-8 px-6 py-3"> 
          
          {children}

        </main>
      </body>
    </html>
  );
}