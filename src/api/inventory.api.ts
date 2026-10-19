import { apiRequest } from './client';
import { InventoryAdjustRequest, InventoryLedger, CurrentStockItem } from '../types/api';

export const inventoryApi = {
  adjustStock: async (payload: InventoryAdjustRequest): Promise<{ ledger_id: string; stock_after?: number; approval_required?: boolean }> => {
    return await apiRequest<{ ledger_id: string; stock_after?: number; approval_required?: boolean }>(
      '/inventory/adjust',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  listStock: async (storeId?: string): Promise<CurrentStockItem[]> => {
    try {
      const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
      const res = await apiRequest<CurrentStockItem[] | { data: CurrentStockItem[] } | null>(
        `/inventory/stock${query}`,
        { method: 'GET' }
      );
      if (Array.isArray(res)) return res;
      if (res && 'data' in res && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },

  listLedgers: async (params?: { store_id?: string; warehouse_id?: string; product_id?: string }): Promise<InventoryLedger[]> => {
    try {
      const query = new URLSearchParams();
      if (params?.store_id) query.set('store_id', params.store_id);
      if (params?.warehouse_id) query.set('warehouse_id', params.warehouse_id);
      if (params?.product_id) query.set('product_id', params.product_id);

      const q = query.toString();
      const res = await apiRequest<InventoryLedger[] | { data: InventoryLedger[] } | null>(
        `/inventory/ledgers${q ? `?${q}` : ''}`,
        { method: 'GET' }
      );

      if (Array.isArray(res)) return res;
      if (res && 'data' in res && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },
};
