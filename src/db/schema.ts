import { Product } from '../types/api';

export interface CachedProductRecord extends Product {
  store_id: string;
  cached_at: string;
}

export interface CachedStoreContext {
  id: string; // 'current'
  activeStoreId: string;
  activeTerminalId: string;
  activeStoreName?: string;
  activeTerminalCode?: string;
  updatedAt: string;
}

export interface OfflineAuditIncident {
  id: string;
  clientTransactionId: string;
  storeId: string;
  type: string;
  reason: string;
  cashReceivedMinor: number;
  createdAt: string;
  resolved: boolean;
}
