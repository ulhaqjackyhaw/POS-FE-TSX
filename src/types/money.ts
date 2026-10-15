export type MoneyMinor = number; // integer unit terkecil mata uang (IDR = rupiah bulat)

export interface DiscountInput {
  type: 'amount' | 'percent';
  value: number;
  reason?: string;
}
