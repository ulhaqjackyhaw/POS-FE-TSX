import { apiRequest } from './client';
import { Terminal, CreateTerminalPayload, UpdateTerminalPayload } from '../types/store';

export const terminalsApi = {
  listTerminals: async (params?: { store_id?: string }): Promise<Terminal[]> => {
    const query = new URLSearchParams();
    if (params?.store_id) {
      query.set('store_id', params.store_id);
    }
    const queryString = query.toString();
    const path = `/terminals${queryString ? `?${queryString}` : ''}`;

    try {
      const res = await apiRequest<Terminal[] | { data: Terminal[] } | null>(path, {
        method: 'GET',
        storeScoped: false,
      });

      if (Array.isArray(res)) return res;
      if (res && 'data' in res && Array.isArray(res.data)) return res.data;
      return [];
    } catch (err) {
      // Fallback: If listing by specific store and /terminals route fails, try /stores/:store_id/terminals
      if (params?.store_id) {
        const fallbackRes = await apiRequest<Terminal[] | { data: Terminal[] } | null>(
          `/stores/${encodeURIComponent(params.store_id)}/terminals`,
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

  getTerminal: async (id: string): Promise<Terminal> => {
    return await apiRequest<Terminal>(`/terminals/${encodeURIComponent(id)}`, {
      method: 'GET',
      storeScoped: false,
    });
  },

  createTerminal: async (payload: CreateTerminalPayload): Promise<Terminal> => {
    return await apiRequest<Terminal>('/terminals', {
      method: 'POST',
      body: JSON.stringify(payload),
      storeScoped: false,
    });
  },

  updateTerminal: async (id: string, payload: UpdateTerminalPayload): Promise<Terminal> => {
    return await apiRequest<Terminal>(`/terminals/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      storeScoped: false,
    });
  },

  deleteTerminal: async (id: string): Promise<void> => {
    await apiRequest<void>(`/terminals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      storeScoped: false,
    });
  },
};
