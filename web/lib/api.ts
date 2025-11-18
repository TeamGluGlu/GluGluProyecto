export async function api<T>(path: string, init?: RequestInit): Promise<T> {
const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";
const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {})
        },
        // Importante para SSR y evitar cache viejo en datos dinámicos
        cache: 'no-store'
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`API ${res.status}: ${body}`);
    }
    return res.json();
}