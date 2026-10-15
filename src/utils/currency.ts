import { MoneyMinor, DiscountInput } from '../types/money';

/**
 * Format integer minor units (IDR) to rupiah string
 * e.g. 15000 -> "Rp 15.000"
 */
export function formatRupiah(amountMinor: MoneyMinor | null | undefined): string {
  if (amountMinor === null || amountMinor === undefined || isNaN(amountMinor)) {
    return 'Rp 0';
  }
  const isNegative = amountMinor < 0;
  const absAmount = Math.abs(Math.round(amountMinor));
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(absAmount);

  return `${isNegative ? '- Rp ' : 'Rp '}${formatted}`;
}

/**
 * Parse string to minor units integer
 */
export function parseRupiahInput(value: string): number {
  const clean = value.replace(/[^0-9]/g, '');
  if (!clean) return 0;
  return parseInt(clean, 10);
}

/**
 * Calculate preview discount amount in minor units
 */
export function calculateDiscountAmount(
  subtotalMinor: MoneyMinor,
  discount?: DiscountInput
): MoneyMinor {
  if (!discount || discount.value <= 0) return 0;
  if (discount.type === 'percent') {
    const cappedPercent = Math.min(100, Math.max(0, discount.value));
    return Math.round((subtotalMinor * cappedPercent) / 100);
  }
  return Math.min(subtotalMinor, Math.max(0, Math.round(discount.value)));
}

/**
 * Calculate tax-inclusive preview (e.g. rate 0.11 for 11% PPN)
 * PRD 7.3: G / (1 + r), tax = G - before_tax
 */
export function calculateInclusiveTax(
  grossTotalMinor: MoneyMinor,
  taxRatePercent = 11
): { beforeTaxMinor: MoneyMinor; taxMinor: MoneyMinor } {
  if (grossTotalMinor <= 0 || taxRatePercent <= 0) {
    return { beforeTaxMinor: grossTotalMinor, taxMinor: 0 };
  }
  const rate = taxRatePercent / 100;
  const beforeTaxMinor = Math.round(grossTotalMinor / (1 + rate));
  const taxMinor = grossTotalMinor - beforeTaxMinor;
  return { beforeTaxMinor, taxMinor };
}
