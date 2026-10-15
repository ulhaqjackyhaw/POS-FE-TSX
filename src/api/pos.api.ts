import { apiRequest } from './client';
import {
  QuoteRequest,
  QuoteResponse,
  CheckoutRequest,
  CheckoutResponse,
  SalesTransaction,
} from '../types/api';

export interface VoidTransactionPayload {
  reason: string;
  approval_id?: string;
  idempotency_key: string;
}

export interface RefundTransactionPayload {
  reason: string;
  amount_minor?: number;
  approval_id?: string;
  idempotency_key: string;
}

export const posApi = {
  generateQuote: async (payload: QuoteRequest): Promise<QuoteResponse> => {
    const res = await apiRequest<QuoteResponse | { data: QuoteResponse }>('/pos/quote', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if ('lines' in res) return res as QuoteResponse;
    if ('data' in res) return res.data;
    throw new Error('Format respons quote tidak valid');
  },

  checkout: async (payload: CheckoutRequest): Promise<CheckoutResponse> => {
    const res = await apiRequest<CheckoutResponse | { data: CheckoutResponse }>('/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey: payload.idempotency_key,
    });
    if ('transaction_id' in res) return res as CheckoutResponse;
    if ('data' in res) return res.data;
    return res as unknown as CheckoutResponse;
  },

  listTransactions: async (params?: { from?: string; to?: string; status?: string }): Promise<SalesTransaction[]> => {
    try {
      const query = new URLSearchParams();
      if (params?.from) query.set('from', params.from);
      if (params?.to) query.set('to', params.to);
      if (params?.status) query.set('status', params.status);

      const q = query.toString();
      const res = await apiRequest<SalesTransaction[] | { data: SalesTransaction[] } | null>(
        `/pos/transactions${q ? `?${q}` : ''}`,
        { method: 'GET' }
      );

      if (Array.isArray(res)) return res;
      if (res && 'data' in res && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },

  getTransaction: async (id: string): Promise<SalesTransaction> => {
    return await apiRequest<SalesTransaction>(`/pos/transactions/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  },

  voidTransaction: async (id: string, payload: VoidTransactionPayload): Promise<{ transaction_id: string; status: string }> => {
    return await apiRequest<{ transaction_id: string; status: string }>(
      `/pos/transactions/${encodeURIComponent(id)}/void`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        idempotencyKey: payload.idempotency_key,
      }
    );
  },

  refundTransaction: async (id: string, payload: RefundTransactionPayload): Promise<{ refund_id: string; status: string }> => {
    return await apiRequest<{ refund_id: string; status: string }>(
      `/pos/transactions/${encodeURIComponent(id)}/refund`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        idempotencyKey: payload.idempotency_key,
      }
    );
  },
};
