import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = { title: 'GluGlu', description: 'Inventario y Operaciones' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-gray-900">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
} 