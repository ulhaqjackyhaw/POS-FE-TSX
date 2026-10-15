import { CartItem, QuoteResponse } from '../../types/api';
import { DiscountInput } from '../../types/money';

export interface PosState {
  cart: CartItem[];
  cartDiscount?: DiscountInput;
  activeQuote: QuoteResponse | null;
  isQuoteLoading: boolean;

  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setItemDiscount: (productId: string, discount?: DiscountInput) => void;
  setCartDiscount: (discount?: DiscountInput) => void;
  clearCart: () => void;
  setActiveQuote: (quote: QuoteResponse | null) => void;
  setIsQuoteLoading: (loading: boolean) => void;
}
