import { apiRequest } from './client';
import { OfflineTransaction } from '../types/api';
import { updateOfflineTransactionStatus } from '../db/indexeddb';
import { generateUUID } from '../utils/idempotency';

export interface SyncBatchResultItem {
  client_transaction_id: string;
  status: 'synced' | 'duplicate' | 'conflict' | 'rejected';
  transaction_id?: string;
  receipt_number?: string;
  code?: string;
  message?: string;
}

export interface SyncBatchResponse {
  results: SyncBatchResultItem[];
}

export const syncApi = {
  syncBatch: async (
    deviceId: string,
    transactions: OfflineTransaction[]
  ): Promise<SyncBatchResponse> => {
    if (transactions.length === 0) {
      return { results: [] };
    }

    const payload = {
      device_id: deviceId,
      batch_id: generateUUID(),
      payload_version: 1,
      transactions: transactions.map((tx) => ({
        client_transaction_id: tx.clientTransactionId,
        idempotency_key: tx.idempotencyKey,
        store_id: tx.storeId,
        terminal_id: tx.terminalId,
        shift_id: tx.shiftId,
        cashier_id: tx.cashierId,
        created_at: tx.createdAt,
        payment_method: tx.paymentMethod,
        items: tx.items.map((i) => ({
          product_id: i.productId,
          quantity: i.quantity,
          unit_price_minor: i.cachedUnitPriceMinor,
        })),
        cash_received_minor: tx.cashReceivedMinor,
        expected_total_minor: tx.expectedTotalMinor,
        change_minor: tx.changeMinor,
      })),
    };

    // Mark transactions as syncing
    for (const tx of transactions) {
      await updateOfflineTransactionStatus(tx.clientTransactionId, 'syncing');
    }

    try {
      const res = await apiRequest<SyncBatchResponse | { data: SyncBatchResponse }>('/sync/batch', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = 'results' in res ? res : 'data' in res ? res.data : { results: [] };

      // Update indexeddb with individual item results
      for (const item of data.results) {
        if (item.status === 'synced' || item.status === 'duplicate') {
          await updateOfflineTransactionStatus(item.client_transaction_id, 'synced', {
            serverTransactionId: item.transaction_id,
            receiptNumber: item.receipt_number,
          });
        } else if (item.status === 'conflict') {
          await updateOfflineTransactionStatus(item.client_transaction_id, 'conflict', {
            lastErrorCode: item.code,
            lastErrorMessage: item.message,
          });
        } else {
          await updateOfflineTransactionStatus(item.client_transaction_id, 'failed', {
            lastErrorCode: item.code,
            lastErrorMessage: item.message,
          });
        }
      }

      return data;
    } catch (err: unknown) {
      // Revert to pending or failed if batch request failed
      const msg = err instanceof Error ? err.message : 'Gagal sinkronisasi';
      for (const tx of transactions) {
        await updateOfflineTransactionStatus(tx.clientTransactionId, 'failed', {
          retryCount: (tx.retryCount || 0) + 1,
          lastErrorMessage: msg,
        });
      }
      throw err;
    }
  },
};
