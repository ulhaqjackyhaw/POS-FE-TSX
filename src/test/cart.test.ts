import { describe, it, expect, beforeEach } from 'vitest';
import { usePosStore } from '../features/pos/pos.store';

describe('Cart Store Operations', () => {
  beforeEach(() => {
    usePosStore.getState().clearCart();
  });

  it('adds items and increments quantity correctly', () => {
    const store = usePosStore.getState();

    store.addItem({
      productId: 'p1',
      sku: 'SKU-01',
      name: 'Kopi Susu',
      unitPriceMinor: 18000,
    });

    expect(usePosStore.getState().cart).toHaveLength(1);
    expect(usePosStore.getState().cart[0].quantity).toBe(1);

    // Add again => quantity becomes 2
    store.addItem({
      productId: 'p1',
      sku: 'SKU-01',
      name: 'Kopi Susu',
      unitPriceMinor: 18000,
    });

    expect(usePosStore.getState().cart).toHaveLength(1);
    expect(usePosStore.getState().cart[0].quantity).toBe(2);
  });

  it('updates quantity and removes item when quantity is 0', () => {
    const store = usePosStore.getState();

    store.addItem({
      productId: 'p1',
      sku: 'SKU-01',
      name: 'Kopi Susu',
      unitPriceMinor: 18000,
    });

    store.updateQuantity('p1', 5);
    expect(usePosStore.getState().cart[0].quantity).toBe(5);

    store.updateQuantity('p1', 0);
    expect(usePosStore.getState().cart).toHaveLength(0);
  });

  it('sets discounts and clears cart completely', () => {
    const store = usePosStore.getState();

    store.addItem({
      productId: 'p1',
      sku: 'SKU-01',
      name: 'Kopi Susu',
      unitPriceMinor: 18000,
    });

    store.setItemDiscount('p1', { type: 'percent', value: 10 });
    expect(usePosStore.getState().cart[0].discount).toEqual({ type: 'percent', value: 10 });

    store.clearCart();
    expect(usePosStore.getState().cart).toHaveLength(0);
    expect(usePosStore.getState().cartDiscount).toBeUndefined();
  });
});
