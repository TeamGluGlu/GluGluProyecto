// web/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  
  console.log(`🌐 [API] ${init?.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    // Si es 204 No Content, retornar objeto vacío
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    return data as T;
    
  } catch (error) {
    console.error(`❌ [API ERROR] ${url}:`, error);
    throw error;
  }
}