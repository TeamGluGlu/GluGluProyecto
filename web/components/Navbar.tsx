'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/items', label: 'Items' },
    { href: '/lots', label: 'Lotes' },
    { href: '/movements', label: 'Movimientos' },
    { href: '/reports/top-used', label: 'Top usados' },
    { href: '/reports/aging', label: 'Aging lotes' },
];

export default function Navbar() {
const pathname = usePathname();
    return (
        <header className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b">
        <nav className="mx-auto max-w-6xl px-4 py-3 flex gap-4">
            <div className="font-semibold">GluGlu</div>
            <div className="flex gap-2 text-sm">
            {links.map(l => (
                <Link key={l.href} href={l.href}
                className={`px-3 py-1 rounded-full hover:bg-gray-100 transition ${pathname===l.href? 'bg-gray-900 text-white hover:bg-gray-900' : ''}`}>{l.label}</Link>
            ))}
            </div>
        </nav>
        </header>
    );
}