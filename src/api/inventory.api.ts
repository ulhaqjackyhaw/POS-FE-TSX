import { apiRequest } from './client';
import { InventoryAdjustRequest, InventoryLedger } from '../types/api';

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

  listLedgers: async (params?: { warehouse_id?: string; product_id?: string }): Promise<InventoryLedger[]> => {
    try {
      const query = new URLSearchParams();
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
