import { apiRequest } from './client';
import { SalesReport, TopProductReport } from '../types/api';

export const reportsApi = {
  getSalesReport: async (params?: { from?: string; to?: string; store_id?: string }): Promise<SalesReport> => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.store_id) query.set('store_id', params.store_id);

    const q = query.toString();
    try {
      const res = await apiRequest<SalesReport | { data: SalesReport }>(
        `/reports/sales${q ? `?${q}` : ''}`,
        { method: 'GET' }
      );

      if ('totals' in res) return res as SalesReport;
      if ('data' in res && res.data) return res.data;
      throw new Error('Format data tidak sesuai');
    } catch {
      // Default safe fallback if backend report tables are empty
      return {
        totals: {
          gross_sales: 0,
          discount: 0,
          tax: 0,
          net_sales: 0,
          transaction_count: 0,
          average_transaction: 0,
        },
        series: [],
      };
    }
  },

  getTopProducts: async (params?: { from?: string; to?: string; store_id?: string }): Promise<TopProductReport[]> => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.store_id) query.set('store_id', params.store_id);

    const q = query.toString();
    try {
      const res = await apiRequest<TopProductReport[] | { data: TopProductReport[] } | null>(
        `/reports/top-products${q ? `?${q}` : ''}`,
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
