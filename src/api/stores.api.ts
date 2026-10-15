import { apiRequest } from './client';
import { Store, Warehouse, Terminal } from '../types/store';

export const storesApi = {
  listStores: async (): Promise<Store[]> => {
    const res = await apiRequest<Store[] | { data: Store[] }>('/stores', {
      method: 'GET',
      storeScoped: false,
    });
    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },

  createStore: async (payload: { code: string; name: string; address?: string }): Promise<Store> => {
    return await apiRequest<Store>('/stores', {
      method: 'POST',
      body: JSON.stringify(payload),
      storeScoped: false,
    });
  },

  getStore: async (storeId: string): Promise<Store> => {
    return await apiRequest<Store>(`/stores/${encodeURIComponent(storeId)}`, {
      method: 'GET',
      storeScoped: false,
    });
  },

  listWarehouses: async (storeId: string): Promise<Warehouse[]> => {
    const res = await apiRequest<Warehouse[] | { data: Warehouse[] }>(
      `/stores/${encodeURIComponent(storeId)}/warehouses`,
      {
        method: 'GET',
        storeScoped: false,
      }
    );
    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },

  listTerminals: async (storeId: string): Promise<Terminal[]> => {
    const res = await apiRequest<Terminal[] | { data: Terminal[] }>(
      `/stores/${encodeURIComponent(storeId)}/terminals`,
      {
        method: 'GET',
        storeScoped: false,
      }
    );
    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },
};
