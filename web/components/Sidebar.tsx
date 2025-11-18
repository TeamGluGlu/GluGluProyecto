// web/components/Sidebar.tsx (Con Iconos Vectoriales Monocromáticos)
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// --- NUEVOS ÍCONOS SVG (Estilo monocromático y minimalista) ---
const MenuIcon = ({ name, isActive }: { name: string; isActive: boolean }) => {
    // Definimos el color según si el link está activo (Blanco) o inactivo (Gris)
    const colorClass = isActive ? 'text-white' : 'text-slate-400 group-hover:text-white';
    
    let iconPath;

    if (name === 'Dashboard') {
        iconPath = <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-7-7v12" />; // Home
    } else if (name === 'Productos') {
        iconPath = <path strokeLinecap="round" strokeLinejoin="round" d="M20 7L4 7M4 7l4-4m-4 4l4 4m0 0l4-4m-4 4h12M12 11v9" />; // Box/Products
    } else if (name === 'Lotes') {
        iconPath = <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />; // Documents/Lotes
    } else if (name === 'Movimientos') {
        iconPath = <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />; // Arrows/Movements
    } else if (name === 'Reportes') {
        // LÍNEA CORREGIDA (La pegas)
        iconPath = <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 4h4.896c.032 0 .064-.002.096-.004M21 21v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4a2 2 0 002 2h2a2 2 0 002-2zm-2-2h-2m-4 4h2" />;
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
    { href: '/reports/aging', label: 'Reportes', name: 'Reportes' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-72 bg-white flex flex-col h-screen border-r border-gray-200 sticky top-0 left-0 z-20 font-sans">
            
            {/* 1. LOGO */}
            <div className="h-24 flex items-center px-8">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white text-xl font-bold mr-4 shadow-lg">
                    G
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">GluGlu</h1>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Enterprise</p>
                </div>
            </div>

            {/* 2. PERFIL */}
            <div className="px-8 mb-10">
                <div className="flex items-center gap-4 p-3 border border-gray-100 rounded-2xl shadow-sm bg-gray-50">
                    <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden grayscale">
                        <img 
                            src="https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671142.jpg" 
                            alt="User" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <h3 className="text-gray-900 font-bold text-sm">Admin Planta</h3>
                        <p className="text-gray-500 text-xs">Gerente</p>
                    </div>
                </div>
            </div>

            {/* 3. MENÚ DE NAVEGACIÓN */}
            <nav className="flex-1 px-6 space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pl-4">General</p>
                {links.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link 
                            key={link.href} 
                            href={link.href}
                            className={`
                                flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm group
                                ${isActive 
                                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-400/20 translate-x-1' 
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-black'
                                }
                            `}
                        >
                            <MenuIcon name={link.name} isActive={isActive} />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            {/* 4. TARJETA NEGRA ABAJO */}
            <div className="p-6">
                <div className="bg-black rounded-2xl p-6 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gray-800 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
                    
                    <h4 className="relative z-10 font-bold text-lg mb-1">Acción Rápida</h4>
                    <p className="relative z-10 text-gray-400 text-xs mb-4">Registrar salida de stock</p>
                    <button className="relative z-10 w-full bg-white hover:bg-gray-200 text-black py-3 rounded-lg text-xs font-bold transition uppercase tracking-wide">
                        + Nuevo Movimiento
                    </button>
                </div>
            </div>
        </aside>
    );
}