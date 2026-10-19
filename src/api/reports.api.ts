import { apiRequest } from './client';
import { SalesReport, TopProductReport, TerminalReportResponse } from '../types/api';

export const reportsApi = {
  getSalesReport: async (params?: { from?: string; to?: string; store_id?: string }): Promise<SalesReport> => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.store_id) query.set('store_id', params.store_id);

    const q = query.toString();
    try {
      const res = await apiRequest<any>(
        `/reports/sales${q ? `?${q}` : ''}`,
        { method: 'GET', storeScoped: false }
      );

      if (!res) throw new Error('Respon kosong');
      if (res.totals) return res as SalesReport;

      const data = res.data || res;
      const txCount = Number(data.total_transactions || data.transaction_count || 0);
      const gross = Number(data.gross_sales || 0);
      const discount = Number(data.total_discount || data.discount || 0);
      const tax = Number(data.total_tax || data.tax || 0);
      const net = Number(data.net_sales || (gross - discount));
      const avg = txCount > 0 ? Math.round(net / txCount) : 0;

      return {
        totals: {
          gross_sales: gross,
          discount: discount,
          tax: tax,
          net_sales: net,
          transaction_count: txCount,
          average_transaction: avg,
        },
        series: Array.isArray(data.series) ? data.series : [],
      };
    } catch {
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
      const res = await apiRequest<any>(
        `/reports/top-products${q ? `?${q}` : ''}`,
        { method: 'GET', storeScoped: false }
      );

      const items = Array.isArray(res) ? res : (res?.data || []);
      return items.map((it: any) => ({
        product_id: it.product_id,
        name: it.product_name || it.name || 'Produk',
        quantity_sold: it.quantity !== undefined ? it.quantity : (it.quantity_sold || 0),
        sales_minor: it.total_sales !== undefined ? it.total_sales : (it.sales_minor || 0),
      }));
    } catch {
      return [];
    }
  },

  getTerminalReports: async (params?: { from?: string; to?: string; store_id?: string }): Promise<TerminalReportResponse> => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.store_id) query.set('store_id', params.store_id);

    const q = query.toString();
    try {
      const res = await apiRequest<TerminalReportResponse>(
        `/reports/terminals${q ? `?${q}` : ''}`,
        { method: 'GET', storeScoped: false }
      );
      return {
        summary: Array.isArray(res?.summary) ? res.summary : [],
        daily_breakdown: Array.isArray(res?.daily_breakdown) ? res.daily_breakdown : [],
      };
    } catch {
      return {
        summary: [],
        daily_breakdown: [],
      };
    }
  },
};
