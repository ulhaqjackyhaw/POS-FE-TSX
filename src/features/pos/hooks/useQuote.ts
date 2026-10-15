import { useEffect, useMemo } from 'react';
import { usePosStore } from '../pos.store';
import { useShiftStore } from '../../../stores/shift.store';
import { useAppContextStore } from '../../../stores/app-context.store';
import { useNetworkStore } from '../../../stores/network.store';
import { posApi } from '../../../api/pos.api';
import { useDebounce } from '../../../hooks/useDebounce';
import { calculateInclusiveTax, calculateDiscountAmount } from '../../../utils/currency';

export function useQuote() {
  const { cart, cartDiscount, activeQuote, setActiveQuote, isQuoteLoading, setIsQuoteLoading } =
    usePosStore();
  const { activeShift } = useShiftStore();
  const { activeStoreId, activeTerminalId } = useAppContextStore();
  const { isOnline } = useNetworkStore();

  const debouncedCart = useDebounce(cart, 250);
  const debouncedDiscount = useDebounce(cartDiscount, 250);

  // Local fallback calculation for preview
  const localCalculated = useMemo(() => {
    let subtotal = 0;
    for (const item of cart) {
      const lineSubtotal = item.unitPriceMinor * item.quantity;
      const lineDisc = calculateDiscountAmount(lineSubtotal, item.discount);
      subtotal += lineSubtotal - lineDisc;
    }

    const cartDiscAmount = calculateDiscountAmount(subtotal, cartDiscount);
    const grossTotal = Math.max(0, subtotal - cartDiscAmount);
    const { taxMinor } = calculateInclusiveTax(grossTotal, 11);

    return {
      subtotalMinor: subtotal,
      discountMinor: cartDiscAmount,
      taxMinor,
      totalMinor: grossTotal,
    };
  }, [cart, cartDiscount]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchBackendQuote() {
      if (debouncedCart.length === 0 || !activeShift || !activeTerminalId || !isOnline) {
        setActiveQuote(null);
        return;
      }

      setIsQuoteLoading(true);
      try {
        const quote = await posApi.generateQuote({
          store_id: activeStoreId || undefined,
          shift_id: activeShift.id,
          terminal_id: activeTerminalId,
          items: debouncedCart.map((i) => ({
            product_id: i.productId,
            quantity: i.quantity,
            discount: i.discount,
          })),
          cart_discount: debouncedDiscount,
        });

        if (!isCancelled) {
          setActiveQuote(quote);
        }
      } catch {
        // Fallback to local calculation preview if quote endpoint fails
        if (!isCancelled) {
          setActiveQuote(null);
        }
      } finally {
        if (!isCancelled) {
          setIsQuoteLoading(false);
        }
      }
    }

    fetchBackendQuote();

    return () => {
      isCancelled = true;
    };
  }, [
    debouncedCart,
    debouncedDiscount,
    activeShift,
    activeStoreId,
    activeTerminalId,
    isOnline,
    setActiveQuote,
    setIsQuoteLoading,
  ]);

  // Use authoritative quote from backend if available, otherwise fallback preview
  const subtotalMinor = activeQuote ? activeQuote.subtotal_minor : localCalculated.subtotalMinor;
  const discountMinor = activeQuote ? activeQuote.discount_minor : localCalculated.discountMinor;
  const taxMinor = activeQuote ? activeQuote.tax_minor : localCalculated.taxMinor;
  const totalMinor = activeQuote ? activeQuote.total_minor : localCalculated.totalMinor;

  return {
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor,
    quoteId: activeQuote?.quote_id,
    warnings: activeQuote?.warnings || [],
    isQuoteLoading,
    isAuthoritative: !!activeQuote,
  };
}
