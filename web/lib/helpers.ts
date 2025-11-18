// web/lib/helpers.ts (crea este archivo)

export function normalizeApiResponse<T>(response: any): T[] {
  // Si ya es un array, retornarlo
  if (Array.isArray(response)) return response;
  
  // Si tiene propiedad 'data' que es array
  if (Array.isArray(response?.data)) return response.data;
  
  // Si tiene estructura { items: { data } }
  if (Array.isArray(response?.items?.data)) return response.items.data;
  
  // Si tiene 'rows'
  if (Array.isArray(response?.rows)) return response.rows;
  
  // Default: array vacío
  return [];
}

export function getApiMeta(response: any) {
  return response?.meta || {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  };
}