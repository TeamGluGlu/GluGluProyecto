// web/components/ClientLayout.tsx
'use client';

import Sidebar from '@/components/Sidebar';
import LoginScreen from '@/components/LoginScreen';
import { useAuth } from '@/context/AuthContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null; // O un spinner de carga

  // Si no hay usuario, mostrar SOLO el login (sin sidebar ni contenido)
  if (!user) {
    return <LoginScreen />;
  }

  // Si hay usuario, mostrar el Dashboard completo
  return (
    <div className="flex h-screen bg-[#F3F4F6] text-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto ml-8 px-6 py-3">
        {children}
      </main>
    </div>
  );
}