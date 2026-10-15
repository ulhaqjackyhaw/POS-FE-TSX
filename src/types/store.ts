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
  code: string;
  name: string;
  is_active: boolean;
}

export interface Terminal {
  id: ID;
  store_id: ID;
  code: string;
  name: string;
  is_active: boolean;
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
