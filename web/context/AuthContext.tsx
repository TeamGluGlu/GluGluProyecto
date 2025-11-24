'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  nombre: string;
  email: string;
  puesto: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

// Definimos la URL base aquí. 
// Intentará usar la variable de entorno primero; si no existe, usa tu URL de Render directa.
const API_URL = 'https://gluglu-api.onrender.com';
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Función interna para manejar la inicialización
    const initializeAuth = () => {
      const stored = localStorage.getItem('gluglu_user');
      if (stored) {
        try {
          const parsedUser = JSON.parse(stored);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setUser(parsedUser);
        } catch (error) {
          console.error("Error al leer sesión:", error);
          localStorage.removeItem('gluglu_user'); // Limpiar si está corrupto
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      // CORRECCIÓN: Usamos la variable API_URL en lugar de localhost
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem('gluglu_user', JSON.stringify(data));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error en login:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('gluglu_user');
    router.push('/'); 
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);