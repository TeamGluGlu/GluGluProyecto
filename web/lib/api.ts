// web/lib/api.ts

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
    console.log(`🧪 [MOCK API] Solicitud a: ${path}`, init?.method || 'GET');
  
    // Simulación de espera
    await new Promise(resolve => setTimeout(resolve, 500));

    // --- NUEVO: SIMULAR GUARDADO (POST/PUT) ---
    // Si el método es POST, PUT o DELETE, decimos "Todo OK" automáticamente.
    if (init?.method === 'POST' || init?.method === 'PUT' || init?.method === 'DELETE') {
        return { 
            success: true, 
            message: "Operación simulada exitosa", 
            data: { id: Math.random() } 
        } as unknown as T;
    }
  
    // --- SIMULAR LECTURA (GET) ---

    // 1. Si piden ITEMS
    if (path.includes('/items')) {
      return [
        { id: 1, nombre: "Bidón 20L (Lleno)", tipo: "PRODUCTO_TERMINADO", unidad: "UND", activo: true, stock: 45 },
        { id: 2, nombre: "Tapa Azul Genérica", tipo: "TAPA", unidad: "UND", activo: true, stock: 2000 },
        { id: 3, nombre: "Etiqueta Gluglu", tipo: "ETIQUETA", unidad: "UND", activo: true, stock: 500 },
        { id: 4, nombre: "Pack 12 Botellas", tipo: "PRODUCTO_TERMINADO", unidad: "UND", activo: true, stock: 10 },
      ] as unknown as T;
    }
  
    // 2. Si piden LOTES
    if (path.includes('/lots') || path.includes('stock')) {
      return [
        { id: 101, lote_codigo: "L-2025-A", item: { nombre: "Bidón 20L" }, cantidad_inicial: 100, costo_lote: 500, fecha_ingreso: "2025-11-01" },
        { id: 102, lote_codigo: "L-2025-B", item: { nombre: "Tapa Azul" }, cantidad_inicial: 5000, costo_lote: 200, fecha_ingreso: "2025-11-05" },
      ] as unknown as T;
    }
  
    // 3. Si piden MOVIMIENTOS
    if (path.includes('/movements')) {
      return [
        { id: 1, fecha: "2025-11-17", tipo: "IN", motivo: "PRODUCCION", cantidad: 50, item: { nombre: "Bidón 20L" } },
        { id: 2, fecha: "2025-11-18", tipo: "OUT", motivo: "VENTA", cantidad: 10, item: { nombre: "Bidón 20L" } },
      ] as unknown as T;
    }

    // Respuesta por defecto para que no explote
    return [] as unknown as T;
}