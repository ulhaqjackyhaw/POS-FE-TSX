import { apiRequest } from './client';
import { Warehouse, CreateWarehousePayload, UpdateWarehousePayload } from '../types/store';

export const warehousesApi = {
  listWarehouses: async (params?: { store_id?: string }): Promise<Warehouse[]> => {
    const query = new URLSearchParams();
    if (params?.store_id) {
      query.set('store_id', params.store_id);
    }
    const queryString = query.toString();
    const path = `/warehouses${queryString ? `?${queryString}` : ''}`;

    try {
      const res = await apiRequest<Warehouse[] | { data: Warehouse[] } | null>(path, {
        method: 'GET',
        storeScoped: false,
      });

      if (Array.isArray(res)) return res;
      if (res && 'data' in res && Array.isArray(res.data)) return res.data;
      return [];
    } catch (err) {
      // Fallback: If listing by specific store and /warehouses route fails, try /stores/:store_id/warehouses
      if (params?.store_id) {
        const fallbackRes = await apiRequest<Warehouse[] | { data: Warehouse[] } | null>(
          `/stores/${encodeURIComponent(params.store_id)}/warehouses`,
          {
            method: 'GET',
            storeScoped: false,
          }
        );
        if (Array.isArray(fallbackRes)) return fallbackRes;
        if (fallbackRes && 'data' in fallbackRes && Array.isArray(fallbackRes.data)) return fallbackRes.data;
      }
      throw err;
    }
  },

  getWarehouse: async (id: string): Promise<Warehouse> => {
    return await apiRequest<Warehouse>(`/warehouses/${encodeURIComponent(id)}`, {
      method: 'GET',
      storeScoped: false,
    });
  },

  createWarehouse: async (payload: CreateWarehousePayload): Promise<Warehouse> => {
    return await apiRequest<Warehouse>('/warehouses', {
      method: 'POST',
      body: JSON.stringify(payload),
      storeScoped: false,
    });
  },

  updateWarehouse: async (id: string, payload: UpdateWarehousePayload): Promise<Warehouse> => {
    return await apiRequest<Warehouse>(`/warehouses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      storeScoped: false,
    });
  },

  deleteWarehouse: async (id: string): Promise<void> => {
    await apiRequest<void>(`/warehouses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      storeScoped: false,
    });
  },
};
