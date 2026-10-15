import { create } from 'zustand';
import { Shift } from '../types/store';

interface ShiftState {
  activeShift: Shift | null;
  isLoading: boolean;
  setActiveShift: (shift: Shift | null) => void;
  setIsLoading: (loading: boolean) => void;
  clearShift: () => void;
}

export const useShiftStore = create<ShiftState>((set) => ({
  activeShift: null,
  isLoading: false,
  setActiveShift: (shift) => set({ activeShift: shift }),
  setIsLoading: (isLoading) => set({ isLoading }),
  clearShift: () => set({ activeShift: null }),
}));
