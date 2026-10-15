import { create } from 'zustand';
import { PosState } from './pos.types';

export const usePosStore = create<PosState>((set) => ({
  cart: [],
  cartDiscount: undefined,
  activeQuote: null,
  isQuoteLoading: false,

  addItem: (item, qty = 1) =>
    set((state) => {
      const existingIndex = state.cart.findIndex((i) => i.productId === item.productId);
      if (existingIndex >= 0) {
        const nextCart = [...state.cart];
        nextCart[existingIndex] = {
          ...nextCart[existingIndex],
          quantity: nextCart[existingIndex].quantity + qty,
        };
        return { cart: nextCart };
      }
      return {
        cart: [...state.cart, { ...item, quantity: qty }],
      };
    }),

  removeItem: (productId) =>
    set((state) => ({
      cart: state.cart.filter((i) => i.productId !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return { cart: state.cart.filter((i) => i.productId !== productId) };
      }
      return {
        cart: state.cart.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
      };
    }),

  setItemDiscount: (productId, discount) =>
    set((state) => ({
      cart: state.cart.map((i) => (i.productId === productId ? { ...i, discount } : i)),
    })),

  setCartDiscount: (discount) =>
    set(() => ({
      cartDiscount: discount,
    })),

  clearCart: () =>
    set(() => ({
      cart: [],
      cartDiscount: undefined,
      activeQuote: null,
    })),

  setActiveQuote: (quote) => set({ activeQuote: quote }),
  setIsQuoteLoading: (loading) => set({ isQuoteLoading: loading }),
}));
