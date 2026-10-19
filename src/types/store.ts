import { ID, ISODateTime } from './common';
import { MoneyMinor } from './money';

export interface Store {
  id: ID;
  code: string;
  name: string;
  address?: string;
  is_active?: boolean;
}

export interface Warehouse {
  id: ID;
  store_id: ID;
  store_name?: string;
  store_code?: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at?: ISODateTime;
  updated_at?: ISODateTime;
}

export interface CreateWarehousePayload {
  store_id: ID;
  code: string;
  name: string;
  is_active?: boolean;
}

export interface UpdateWarehousePayload {
  store_id?: ID;
  code: string;
  name: string;
  is_active: boolean;
}

export interface Terminal {
  id: ID;
  store_id: ID;
  store_name?: string;
  store_code?: string;
  code: string;
  name: string;
  is_active: boolean;
  assigned_cashier_id?: ID | null;
  cashier_name?: string;
  cashier_username?: string;
  has_active_shift?: boolean;
  active_shift_id?: string;
  active_cashier_id?: string;
  active_cashier_name?: string;
  active_cashier_username?: string;
  created_at?: ISODateTime;
  updated_at?: ISODateTime;
}

export interface CreateTerminalPayload {
  store_id: ID;
  code: string;
  name: string;
  assigned_cashier_id?: ID | null;
}

export interface UpdateTerminalPayload {
  name: string;
  is_active?: boolean;
  assigned_cashier_id?: ID | null;
}

export interface Shift {
  id: ID;
  store_id: ID;
  terminal_id: ID;
  user_id?: ID;
  starting_cash: MoneyMinor;
  ending_cash_actual?: MoneyMinor | null;
  ending_cash_expected?: MoneyMinor | null;
  cash_difference?: MoneyMinor | null;
  status: 'OPEN' | 'CLOSED' | 'open' | 'closed';
  opened_at: ISODateTime;
  closed_at?: ISODateTime | null;
  notes?: string;
}

export interface CashMovement {
  id: ID;
  shift_id: ID;
  type: 'cash_in' | 'cash_out' | 'IN' | 'OUT';
  amount_minor: MoneyMinor;
  reason: string;
  reference?: string;
  created_at: ISODateTime;
}
