import { create } from 'zustand';
import { UserSummary } from '../types/auth';

interface AppContextState {
  token: string | null;
  user: UserSummary | null;
  activeStoreId: string | null;
  activeStoreName: string | null;
  activeTerminalId: string | null;
  activeTerminalCode: string | null;
  activeWarehouseId: string | null;

  setAuth: (token: string, user: UserSummary) => void;
  setUser: (user: UserSummary) => void;
  setActiveStore: (storeId: string, storeName: string) => void;
  setActiveTerminal: (terminalId: string, terminalCode: string) => void;
  setActiveWarehouse: (warehouseId: string) => void;
  logout: () => void;
}

const STORAGE_KEY_TOKEN = 'pos_token';
const STORAGE_KEY_USER = 'pos_user';
const STORAGE_KEY_STORE_ID = 'pos_store_id';
const STORAGE_KEY_STORE_NAME = 'pos_store_name';
const STORAGE_KEY_TERMINAL_ID = 'pos_terminal_id';
const STORAGE_KEY_TERMINAL_CODE = 'pos_terminal_code';

export const useAppContextStore = create<AppContextState>((set) => {
  // Initial state from localStorage for page refreshes
  const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
  const storedUserRaw = localStorage.getItem(STORAGE_KEY_USER);
  let initialUser: UserSummary | null = null;
  if (storedUserRaw) {
    try {
      initialUser = JSON.parse(storedUserRaw);
    } catch {
      // ignore
    }
  }

  const storedStoreId = localStorage.getItem(STORAGE_KEY_STORE_ID);
  const storedStoreName = localStorage.getItem(STORAGE_KEY_STORE_NAME);
  const storedTerminalId = localStorage.getItem(STORAGE_KEY_TERMINAL_ID);
  const storedTerminalCode = localStorage.getItem(STORAGE_KEY_TERMINAL_CODE);

  return {
    token: storedToken,
    user: initialUser,
    activeStoreId: storedStoreId,
    activeStoreName: storedStoreName,
    activeTerminalId: storedTerminalId,
    activeTerminalCode: storedTerminalCode,
    activeWarehouseId: null,

    setAuth: (token: string, user: UserSummary) => {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      set({ token, user });
    },

    setUser: (user: UserSummary) => {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      set({ user });
    },

    setActiveStore: (storeId: string, storeName: string) => {
      localStorage.setItem(STORAGE_KEY_STORE_ID, storeId);
      localStorage.setItem(STORAGE_KEY_STORE_NAME, storeName);
      set({ activeStoreId: storeId, activeStoreName: storeName });
    },

    setActiveTerminal: (terminalId: string, terminalCode: string) => {
      localStorage.setItem(STORAGE_KEY_TERMINAL_ID, terminalId);
      localStorage.setItem(STORAGE_KEY_TERMINAL_CODE, terminalCode);
      set({ activeTerminalId: terminalId, activeTerminalCode: terminalCode });
    },

    setActiveWarehouse: (warehouseId: string) => {
      set({ activeWarehouseId: warehouseId });
    },

    logout: () => {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_STORE_ID);
      localStorage.removeItem(STORAGE_KEY_STORE_NAME);
      localStorage.removeItem(STORAGE_KEY_TERMINAL_ID);
      localStorage.removeItem(STORAGE_KEY_TERMINAL_CODE);
      set({
        token: null,
        user: null,
        activeStoreId: null,
        activeStoreName: null,
        activeTerminalId: null,
        activeTerminalCode: null,
        activeWarehouseId: null,
      });
    },
  };
});
