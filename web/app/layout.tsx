// web/app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import ClientLayout from '@/components/ClientLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata = { title: 'GluGlu Dashboard', description: 'Sistema Moderno' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
            <ClientLayout>
                {children}
            </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}