'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [loadingAlert, setLoadingAlert] = useState(false);
  const [loadingMail, setLoadingMail] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // Helper para extraer mensaje de error
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
  };

  // A) Forzar Alertas
  const triggerAlerts = async () => {
    setLoadingAlert(true);
    try {
      const res = await api<{ sent: number }>('/stock/alerts/send', { method: 'POST' });
      alert(`✅ Alertas enviadas. Correos disparados: ${res.sent ?? 0}`);
    } catch (e: unknown) {
      alert(`❌ Error: ${getErrorMessage(e)}`);
    } finally {
      setLoadingAlert(false);
    }
  };

  // B) Probar Correo
  const sendTestMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;
    setLoadingMail(true);
    try {
      await api('/dev/mail-test', {
        method: 'POST',
        body: JSON.stringify({ to: testEmail })
      });
      alert('✅ Correo de prueba enviado. Revisa tu bandeja.');
    } catch (e: unknown) {
      alert(`❌ Error: ${getErrorMessage(e)}`);
    } finally {
      setLoadingMail(false);
    }
  };

  // C) Verificar SMTP
  const verifySmtp = async () => {
    try {
      await api('/dev/mail-verify');
      alert('✅ Conexión SMTP exitosa. El servidor de correos responde.');
    } catch (e: unknown) {
      alert(`❌ Error SMTP: ${getErrorMessage(e)}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Configuración y Herramientas</h1>

      {/* Panel de Alertas */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          🔔 Sistema de Alertas
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          El sistema revisa automáticamente el stock bajo. Puedes forzar una revisión manual aquí.
        </p>
        <button
          onClick={triggerAlerts}
          disabled={loadingAlert}
          className="bg-indigo-50 text-indigo-700 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-100 transition-colors disabled:opacity-50"
        >
          {loadingAlert ? 'Enviando...' : '📢 Disparar Alertas Ahora'}
        </button>
      </section>

      {/* Panel de Desarrollo / Correo */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          🛠️ Diagnóstico de Correo (SMTP)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">1. Verificar Conexión</h3>
            <button
              onClick={verifySmtp}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 border border-gray-200"
            >
              📡 Probar Conexión SMTP
            </button>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">2. Enviar Prueba Real</h3>
            <form onSubmit={sendTestMail} className="flex gap-2">
              <input 
                type="email" 
                required
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="tu@email.com"
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none text-gray-900"
              />
              <button 
                type="submit"
                disabled={loadingMail}
                className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-black disabled:opacity-50"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Panel de Salud del Sistema */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-2">🏥 Estado del Sistema</h2>
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm font-medium text-gray-600">API Online</span>
          <a 
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/health`} 
            target="_blank"
            className="text-xs text-blue-500 hover:underline ml-auto"
          >
            Ver JSON Raw
          </a>
        </div>
      </section>
    </div>
  );
}