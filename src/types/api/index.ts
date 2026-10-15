import { ID, ISODateTime } from '../common';
import { MoneyMinor, DiscountInput } from '../money';

export interface Product {
  id: ID;
  sku: string;
  name: string;
  barcode?: string;
  category_id?: ID;
  category_name?: string;
  unit: string;
  base_price?: MoneyMinor;
  price_minor?: MoneyMinor; // store specific price if loaded
  is_active: boolean;
  stock?: number;
  created_at?: ISODateTime;
  updated_at?: ISODateTime;
}

export interface StoreProductPrice {
  id?: ID;
  store_id: ID;
  product_id: ID;
  price: MoneyMinor;
  is_active: boolean;
  effective_at?: ISODateTime;
  reason?: string;
}

export interface CartItem {
  productId: string;
  sku: string;
  barcode?: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  discount?: DiscountInput;
  priceVersion?: string;
}

export interface QuoteRequestItem {
  product_id: ID;
  quantity: string | number;
  discount?: DiscountInput;
}

export interface QuoteRequest {
  store_id?: ID;
  shift_id: ID;
  terminal_id: ID;
  items: QuoteRequestItem[];
  cart_discount?: DiscountInput;
  coupon_code?: string;
}

export interface QuoteLine {
  product_id: ID;
  product_name?: string;
  quantity: string | number;
  unit_price_minor: MoneyMinor;
  discount_minor: MoneyMinor;
  tax_minor: MoneyMinor;
  line_total_minor: MoneyMinor;
}

export interface QuoteResponse {
  quote_id?: ID;
  expires_at?: ISODateTime;
  lines: QuoteLine[];
  subtotal_minor: MoneyMinor;
  discount_minor: MoneyMinor;
  tax_minor: MoneyMinor;
  total_minor: MoneyMinor;
  warnings?: Array<{ code: string; message: string }>;
}

export interface CheckoutRequest {
  quote_id?: ID;
  store_id?: ID;
  shift_id: ID;
  terminal_id: ID;
  items: QuoteRequestItem[];
  payment: {
    method: 'cash';
    received_minor: MoneyMinor;
  };
  idempotency_key: string;
  client_transaction_id?: ID;
}

export interface CheckoutResponse {
  transaction_id: ID;
  receipt_number: string;
  total_minor: MoneyMinor;
  change_minor: MoneyMinor;
  status: string;
  created_at?: ISODateTime;
}

export interface SalesTransactionItem {
  id?: ID;
  transaction_id?: ID;
  product_id: ID;
  product_name: string;
  unit_price: MoneyMinor;
  quantity: number;
  subtotal: MoneyMinor;
  discount_amount: MoneyMinor;
  tax_amount: MoneyMinor;
  total: MoneyMinor;
}

export interface SalesTransaction {
  id: ID;
  store_id: ID;
  terminal_id: ID;
  shift_id: ID;
  user_id: ID;
  receipt_number: string;
  payment_method: string;
  status: 'COMPLETED' | 'VOIDED' | 'REFUNDED' | string;
  subtotal: MoneyMinor;
  discount_amount: MoneyMinor;
  tax_amount: MoneyMinor;
  total_amount: MoneyMinor;
  cash_received?: MoneyMinor;
  cash_change?: MoneyMinor;
  idempotency_key?: string;
  created_at: ISODateTime;
  items?: SalesTransactionItem[];
}

export interface InventoryLedger {
  id: ID;
  warehouse_id: ID;
  product_id: ID;
  product_name?: string;
  mutation_type: string;
  reference_type?: string;
  reference_id?: string;
  quantity_change: number;
  balance_after: number;
  reason: string;
  created_by?: ID;
  created_at: ISODateTime;
}

export interface InventoryAdjustRequest {
  store_id: ID;
  warehouse_id: ID;
  product_id: ID;
  quantity_delta: number;
  reason: string;
  reference?: string;
}

export interface ApprovalRequest {
  id: ID;
  store_id: ID;
  action_type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'pending' | 'approved' | 'rejected';
  requested_by: ID;
  requester_name?: string;
  approved_by?: ID | null;
  payload: Record<string, unknown> | string;
  reason: string;
  rejection_reason?: string;
  created_at: ISODateTime;
  updated_at?: ISODateTime;
}

export interface SalesReport {
  period?: string;
  totals: {
    gross_sales: MoneyMinor;
    discount: MoneyMinor;
    tax: MoneyMinor;
    net_sales: MoneyMinor;
    transaction_count: number;
    average_transaction: MoneyMinor;
  };
  series: Array<{
    period: string;
    total_minor: MoneyMinor;
    count: number;
  }>;
}

export interface TopProductReport {
  product_id: ID;
  name: string;
  quantity_sold: number | string;
  sales_minor: MoneyMinor;
}

export interface OfflineTransaction {
  clientTransactionId: string;
  idempotencyKey: string;
  storeId: string;
  terminalId: string;
  shiftId: string;
  cashierId: string;
  cashierName?: string;
  createdAt: string;
  currency: 'IDR';
  paymentMethod: 'cash';
  items: Array<{
    productId: string;
    name?: string;
    quantity: number;
    cachedUnitPriceMinor: number;
    cachedPriceVersion?: string;
  }>;
  discount?: DiscountInput;
  cashReceivedMinor: number;
  expectedTotalMinor: number;
  changeMinor: number;
  payloadVersion: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
  retryCount: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  serverTransactionId?: string;
  receiptNumber?: string;
}
