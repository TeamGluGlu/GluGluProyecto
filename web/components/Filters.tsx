'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function Filters() {
    const router = useRouter();
    const sp = useSearchParams();
    const [itemId, setItemId] = useState<string>(sp.get('item_id') || '');
    const [lot, setLot] = useState<string>(sp.get('lote_codigo') || '');

return (
    <div className="flex flex-wrap gap-2 items-end">
        <div>
            <label className="text-xs text-gray-500">Item ID</label>
            <input className="border rounded-lg px-3 py-2 w-36" value={itemId} onChange={e=>setItemId(e.target.value)} placeholder="e.g. 3" />
        </div>
        <div>
            <label className="text-xs text-gray-500">Lote</label>
            <input className="border rounded-lg px-3 py-2 w-40" value={lot} onChange={e=>setLot(e.target.value)} placeholder="AA-001" />
        </div>
        <button onClick={()=>{
            const q = new URLSearchParams();
            if (itemId) q.set('item_id', itemId);
            if (lot) q.set('lote_codigo', lot);
            router.push(`/lots?${q.toString()}`);
        }} className="px-4 py-2 rounded-xl bg-black text-white">Filtrar</button>
        </div>
    );
}