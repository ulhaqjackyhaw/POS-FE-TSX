import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  isSyncing: boolean;
  isSimulatedOffline: boolean;
  lastOnlineAt: string | null;

  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  toggleSimulatedOffline: () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  isSimulatedOffline: false,
  lastOnlineAt: new Date().toISOString(),

  setOnline: (isOnline) =>
    set((state) => ({
      isOnline: state.isSimulatedOffline ? false : isOnline,
      lastOnlineAt: isOnline ? new Date().toISOString() : state.lastOnlineAt,
    })),

  setSyncing: (isSyncing) => set({ isSyncing }),

  toggleSimulatedOffline: () =>
    set((state) => {
      const nextSimulated = !state.isSimulatedOffline;
      return {
        isSimulatedOffline: nextSimulated,
        isOnline: nextSimulated ? false : navigator.onLine,
      };
    }),
}));
