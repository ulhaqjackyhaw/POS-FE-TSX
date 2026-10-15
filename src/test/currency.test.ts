import { describe, it, expect } from 'vitest';
import {
  formatRupiah,
  parseRupiahInput,
  calculateDiscountAmount,
  calculateInclusiveTax,
} from '../utils/currency';

describe('Currency Utilities (IDR Minor Units)', () => {
  it('formats rupiah integer correctly without floating point errors', () => {
    expect(formatRupiah(18000)).toBe('Rp 18.000');
    expect(formatRupiah(500000)).toBe('Rp 500.000');
    expect(formatRupiah(0)).toBe('Rp 0');
    expect(formatRupiah(null)).toBe('Rp 0');
    expect(formatRupiah(-5000)).toBe('- Rp 5.000');
  });

  it('parses input strings to clean integer minor units', () => {
    expect(parseRupiahInput('18.000')).toBe(18000);
    expect(parseRupiahInput('Rp 500.000')).toBe(500000);
    expect(parseRupiahInput('')).toBe(0);
    expect(parseRupiahInput('abc')).toBe(0);
  });

  it('calculates discount correctly for percent and amount', () => {
    // 10% of 100,000 = 10,000
    expect(calculateDiscountAmount(100000, { type: 'percent', value: 10 })).toBe(10000);
    // Amount 15,000 off 100,000 = 15,000
    expect(calculateDiscountAmount(100000, { type: 'amount', value: 15000 })).toBe(15000);
    // Capped at subtotal
    expect(calculateDiscountAmount(5000, { type: 'amount', value: 10000 })).toBe(5000);
  });

  it('calculates tax-inclusive preview according to PRD formula G / (1 + r)', () => {
    // Gross: 111,000 with 11% PPN => before tax = 100,000, tax = 11,000
    const res = calculateInclusiveTax(111000, 11);
    expect(res.beforeTaxMinor).toBe(100000);
    expect(res.taxMinor).toBe(11000);
    expect(res.beforeTaxMinor + res.taxMinor).toBe(111000);
  });
});
