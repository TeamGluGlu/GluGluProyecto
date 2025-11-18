// web/components/KpiCard.tsx (VERSIÓN FINAL COMPACTA y LIMPIA)
import React from 'react';

// Helpers para íconos SVG
function getVisuals(title: string) {
    if (title.includes('Items')) return { icon: 'BOX', color: 'bg-gray-900', secondaryColor: 'text-green-600' };
    if (title.includes('Stock')) return { icon: 'TOTAL', color: 'bg-gray-900', secondaryColor: 'text-green-600' };
    if (title.includes('umbral')) return { icon: 'ALERT', color: 'bg-red-500', secondaryColor: 'text-red-500' };
    if (title.includes('Actualizado')) return { icon: 'TIME', color: 'bg-gray-100', secondaryColor: 'text-gray-900' };
    return { icon: 'BOX', color: 'bg-gray-900', secondaryColor: 'text-green-600' };
}

const IconComponent = ({ name, colorClass }: { name: string, colorClass: string }) => {
    let Icon;
    if (name === 'BOX') Icon = <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7L4 7M4 7l4-4m-4 4l4 4m0 0l4-4m-4 4h12M12 11v9m0 0l-4-4m4 4l4-4" /></svg>;
    else if (name === 'TOTAL') Icon = <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>;
    else if (name === 'ALERT') Icon = <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856a2 2 0 001.789-2.895L13.792 3.555a2 2 0 00-3.583 0L3.32 16.105A2 2 0 005.056 19z" /></svg>;
    else if (name === 'TIME') Icon = <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    else Icon = <div></div>;
    return Icon;
};
// FIN Helpers

export function KpiCard({ title, value }: { title: string; value: string | number; }) {
    
    const visuals = getVisuals(title);
    const showTrend = !title.includes('Actualizado');
    
    return (
        <div className="bg-white rounded-3xl p-4 shadow-md border border-gray-100 h-full transition hover:shadow-lg"> 
            
            <div className="flex justify-between items-start">
                {/* 1. ICONO */}
                <div className={`w-10 h-10 ${visuals.color} rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm`}> 
                    <IconComponent name={visuals.icon} colorClass="text-white" />
                </div>
                
                {/* 2. TENDENCIA SIMULADA */}
                {showTrend && (
                    <div className="text-right flex flex-col items-end pt-1">
                        {/* Flecha y Porcentaje */}
                        <div className={`font-bold text-xs flex items-center gap-1 ${visuals.secondaryColor.includes('red') ? 'text-red-600' : 'text-green-600'}`}> 
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            2%
                        </div>
                        {/* Línea de tendencia */}
                        <div className="w-10 h-3 bg-gray-100 rounded-full mt-1"></div>
                    </div>
                )}

            </div>
            
            {/* 3. VALOR */}
            <div className={`text-gray-900 mt-3 ${showTrend ? 'text-3xl font-extrabold' : 'text-xl font-semibold'}`}> 
                {value}
            </div>
            
            {/* 4. TÍTULO */}
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider"> 
                {title}
            </div>
        </div>
    );
}