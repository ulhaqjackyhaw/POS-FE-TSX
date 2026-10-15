import { create } from 'zustand';
import { posDb } from '../db/indexeddb';

interface SyncStoreState {
  pendingCount: number;
  conflictCount: number;
  refreshCounts: () => Promise<void>;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  pendingCount: 0,
  conflictCount: 0,

  refreshCounts: async () => {
    try {
      const pending = await posDb.offlineTransactions
        .where('syncStatus')
        .equals('pending')
        .or('syncStatus')
        .equals('failed')
        .count();

      const conflicts = await posDb.offlineTransactions
        .where('syncStatus')
        .equals('conflict')
        .count();

      set({ pendingCount: pending, conflictCount: conflicts });
    } catch {
      // IndexedDB might not be available
    }
  },
}));
