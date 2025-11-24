// web/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// --- NUEVOS ÍCONOS SVG (Estilo monocromático y minimalista) ---
const MenuIcon = ({ name, isActive }: { name: string; isActive: boolean }) => {
    // Clases dinámicas para manejar el color según el estado activo
    const colorClass = isActive ? 'text-white' : 'text-slate-400 group-hover:text-white';
    
    let iconPath;

    if (name === 'Dashboard') {
        iconPath = <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-7-7v12" />; 
    } else if (name === 'Productos') {
        iconPath = <path strokeLinecap="round" strokeLinejoin="round" d="M20 7L4 7M4 7l4-4m-4 4l4 4m0 0l4-4m-4 4h12M12 11v9" />; 
    } else if (name === 'Lotes') {
        iconPath = <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />; 
    } else if (name === 'Movimientos') {
        iconPath = <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />; 
    } else if (name === 'Reportes') {
        iconPath = <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 4h4.896c.032 0 .064-.002.096-.004M21 21v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4a2 2 0 002 2h2a2 2 0 002-2zm-2-2h-2m-4 4h2" />;
    } else if (name === 'Producción') {
        iconPath = (
            <>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </>
        );
    } else {
        iconPath = <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />;
    }
    
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {iconPath}
        </svg>
    );
};

// --- ESTRUCTURA PRINCIPAL DEL SIDEBAR ---

const links = [
    { href: '/', label: 'Dashboard', name: 'Dashboard' }, 
    { href: '/items', label: 'Productos', name: 'Productos' },
    { href: '/lots', label: 'Lotes / Stock', name: 'Lotes' },
    { href: '/movements', label: 'Movimientos', name: 'Movimientos' },
    { href: '/reports', label: 'Reportes', name: 'Reportes' },
    { href: '/production', label: 'Producción', name: 'Producción' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth(); 

    // --- LÓGICA DE SELECCIÓN DE IMAGEN ---
    // URL por defecto (para Renato y Tonny)
    const defaultAvatar = "https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671142.jpg";
    // URL específica para Ruth
    const femaleAvatar = "https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671163.jpg";

    // Si el email es el de Ruth, usa su foto, si no, usa la default
    const avatarUrl = user?.email === 'ruth@gmail.com' ? femaleAvatar : defaultAvatar;
    // --------------------------------------

    return (
        <aside className="w-72 bg-white flex flex-col h-screen border-r border-gray-200 sticky top-0 left-0 z-20 font-sans">
            
            {/* 1. LOGO */}
            <div className="h-24 flex items-center px-8">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white text-xl font-bold mr-4 shadow-lg">G</div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">GluGlu</h1>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Enterprise</p>
                </div>
            </div>

            {/* 2. PERFIL DINÁMICO */}
            <div className="px-8 mb-10">
                <div className="flex items-center gap-4 p-3 border border-gray-100 rounded-2xl shadow-sm bg-gray-50">
                    <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden grayscale">
                        <img 
                            src={avatarUrl} 
                            alt="User" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="overflow-hidden">
                        <h3 className="text-gray-900 font-bold text-sm truncate">{user?.nombre || 'Usuario'}</h3>
                        <p className="text-gray-500 text-xs truncate">{user?.puesto || 'Staff'}</p>
                    </div>
                </div>
            </div>

            {/* 3. MENÚ DE NAVEGACIÓN */}
            <nav className="flex-1 px-6 space-y-2 overflow-y-auto">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pl-4">General</p>
                {links.map((link) => {
                    const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                    return (
                        <Link 
                            key={link.href} 
                            href={link.href}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm group ${isActive ? 'bg-gray-900 text-white shadow-lg shadow-gray-400/20 translate-x-1' : 'text-gray-500 hover:bg-gray-100 hover:text-black'}`}
                        >
                            <MenuIcon name={link.name} isActive={isActive} />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            {/* 4. BOTÓN CERRAR SESIÓN */}
            <div className="p-6 border-t border-gray-100">
                <button 
                    onClick={logout}
                    className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
}