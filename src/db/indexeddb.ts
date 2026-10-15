import Dexie, { type Table } from 'dexie';
import { OfflineTransaction } from '../types/api';
import { CachedProductRecord, CachedStoreContext, OfflineAuditIncident } from './schema';

export class PosDatabase extends Dexie {
  offlineTransactions!: Table<OfflineTransaction, string>;
  cachedProducts!: Table<CachedProductRecord, string>;
  cachedStoreContext!: Table<CachedStoreContext, string>;
  offlineIncidents!: Table<OfflineAuditIncident, string>;

  constructor() {
    super('PosRetailDatabase');

    this.version(1).stores({
      offlineTransactions: 'clientTransactionId, idempotencyKey, storeId, shiftId, syncStatus, createdAt',
      cachedProducts: 'id, sku, barcode, store_id',
      cachedStoreContext: 'id',
      offlineIncidents: 'id, clientTransactionId, storeId, resolved',
    });
  }
}

export const posDb = new PosDatabase();

// Offline Transaction Helpers
export async function saveOfflineTransaction(tx: OfflineTransaction): Promise<void> {
  await posDb.offlineTransactions.put(tx);
}

export async function getPendingOfflineTransactions(storeId?: string): Promise<OfflineTransaction[]> {
  if (storeId) {
    return await posDb.offlineTransactions
      .where('storeId')
      .equals(storeId)
      .and((item) => item.syncStatus === 'pending' || item.syncStatus === 'failed')
      .sortBy('createdAt');
  }
  return await posDb.offlineTransactions
    .where('syncStatus')
    .equals('pending')
    .or('syncStatus')
    .equals('failed')
    .sortBy('createdAt');
}

export async function getAllOfflineTransactions(): Promise<OfflineTransaction[]> {
  return await posDb.offlineTransactions.orderBy('createdAt').reverse().toArray();
}

export async function updateOfflineTransactionStatus(
  clientTransactionId: string,
  status: OfflineTransaction['syncStatus'],
  updates?: Partial<OfflineTransaction>
): Promise<void> {
  await posDb.offlineTransactions.update(clientTransactionId, {
    syncStatus: status,
    ...updates,
  });
}

// Product cache helpers
export async function cacheCatalogProducts(storeId: string, products: CachedProductRecord[]): Promise<void> {
  await posDb.transaction('rw', posDb.cachedProducts, async () => {
    // Delete existing products for this store
    await posDb.cachedProducts.where('store_id').equals(storeId).delete();
    await posDb.cachedProducts.bulkPut(products);
  });
}

export async function getCachedProducts(storeId: string): Promise<CachedProductRecord[]> {
  return await posDb.cachedProducts.where('store_id').equals(storeId).toArray();
}

export async function findCachedProductByBarcode(storeId: string, barcodeOrSku: string): Promise<CachedProductRecord | undefined> {
  return await posDb.cachedProducts
    .where('store_id')
    .equals(storeId)
    .and((p) => p.barcode === barcodeOrSku || p.sku === barcodeOrSku)
    .first();
}
