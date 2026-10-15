import { apiRequest } from './client';
import { Product, StoreProductPrice } from '../types/api';

export interface CreateProductPayload {
  sku: string;
  name: string;
  barcode?: string;
  unit: string;
  base_price: number;
  category_id?: string;
  is_active?: boolean;
}

export const productsApi = {
  listProducts: async (params?: { search?: string; category_id?: string }): Promise<Product[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category_id) query.set('category_id', params.category_id);

    const queryString = query.toString();
    const path = `/products${queryString ? `?${queryString}` : ''}`;

    const res = await apiRequest<Product[] | { data: Product[] } | null>(path, {
      method: 'GET',
    });

    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },

  getProduct: async (id: string): Promise<Product> => {
    return await apiRequest<Product>(`/products/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  },

  createProduct: async (payload: CreateProductPayload): Promise<Product> => {
    return await apiRequest<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  setBranchPrice: async (
    storeId: string,
    productId: string,
    priceMinor: number,
    effectiveAt?: string,
    reason?: string
  ): Promise<StoreProductPrice> => {
    return await apiRequest<StoreProductPrice>(
      `/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}/price`,
      {
        method: 'POST',
        body: JSON.stringify({
          price_minor: priceMinor,
          effective_at: effectiveAt,
          reason,
        }),
      }
    );
  },
};
