import { apiRequest } from './client';
import { Shift, CashMovement } from '../types/store';
import { MoneyMinor } from '../types/money';

export interface OpenShiftPayload {
  store_id: string;
  terminal_id: string;
  opening_cash_minor: MoneyMinor;
  note?: string;
}

export interface CloseShiftPayload {
  actual_cash_minor: MoneyMinor;
  discrepancy_reason?: string;
  note?: string;
}

export interface CashMovementPayload {
  type: 'cash_in' | 'cash_out';
  amount_minor: MoneyMinor;
  reason: string;
  reference?: string;
}

export const shiftsApi = {
  getActiveShift: async (terminalId?: string): Promise<Shift | null> => {
    try {
      const query = terminalId ? `?terminal_id=${encodeURIComponent(terminalId)}` : '';
      const res = await apiRequest<Shift | { data: Shift | null } | null>(`/shifts/active${query}`, {
        method: 'GET',
      });

      if (!res) return null;
      if ('id' in res) return res as Shift;
      if ('data' in res) return res.data;
      return null;
    } catch {
      // Per PRD 1.3 & 7.2: If backend returns error/empty on active shift, gracefully treat as no active shift
      return null;
    }
  },

  openShift: async (payload: OpenShiftPayload): Promise<Shift> => {
    return await apiRequest<Shift>('/shifts/open', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  closeShift: async (shiftId: string, payload: CloseShiftPayload): Promise<{ shift: Shift; expected_cash_minor?: MoneyMinor; actual_cash_minor?: MoneyMinor; variance_minor?: MoneyMinor }> => {
    return await apiRequest<{ shift: Shift; expected_cash_minor?: MoneyMinor; actual_cash_minor?: MoneyMinor; variance_minor?: MoneyMinor }>(
      `/shifts/${encodeURIComponent(shiftId)}/close`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  createMovement: async (shiftId: string, payload: CashMovementPayload): Promise<CashMovement> => {
    return await apiRequest<CashMovement>(
      `/shifts/${encodeURIComponent(shiftId)}/movements`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },
};
