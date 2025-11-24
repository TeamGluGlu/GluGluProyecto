// web/components/LoginScreen.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(email, pass);
    if (!success) {
      setError('Credenciales inválidas. Intente de nuevo.');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-slate-200">
        <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-black text-white text-3xl font-bold flex items-center justify-center rounded-2xl mx-auto mb-4">G</div>
            <h1 className="text-2xl font-bold text-slate-800">Bienvenido</h1>
            <p className="text-slate-500 text-sm">Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Correo</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // AGREGADO: bg-white, text-slate-900 y placeholder-gray-500
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition placeholder-gray-500 text-slate-900"
              placeholder="usuario@gmail.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              // AGREGADO: bg-white, text-slate-900 y placeholder-gray-500
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition placeholder-gray-500 text-slate-900"
              placeholder="••••••"
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition shadow-lg"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}