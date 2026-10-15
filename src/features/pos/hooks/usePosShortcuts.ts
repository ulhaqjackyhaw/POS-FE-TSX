import { useEffect } from 'react';
import { usePermission } from '../../../hooks/usePermission';

export interface UsePosShortcutsOptions {
  onFocusSearch: () => void;
  onOpenDiscount: () => void;
  onOpenPayment: () => void;
  onClearCart: () => void;
  canPay: boolean;
  isModalOpen: boolean;
}

export function usePosShortcuts({
  onFocusSearch,
  onOpenDiscount,
  onOpenPayment,
  onClearCart,
  canPay,
  isModalOpen,
}: UsePosShortcutsOptions) {
  const { check, isOwnerOrAdmin } = usePermission();
  const canDiscount = isOwnerOrAdmin || check('pos.discount');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // PRD Section 7.3: Ignore shortcuts when modal is open
      if (isModalOpen) return;

      const activeEl = document.activeElement;
      const isTyping =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      // F1: Focus Search (allowed even if typing)
      if (e.key === 'F1') {
        e.preventDefault();
        onFocusSearch();
        return;
      }

      // F2: Open Discount
      if (e.key === 'F2') {
        e.preventDefault();
        if (canDiscount) {
          onOpenDiscount();
        }
        return;
      }

      // Space or Enter: Open Payment (ONLY if not typing and cart can pay)
      if ((e.key === ' ' || e.key === 'Enter') && !isTyping && canPay) {
        e.preventDefault();
        onOpenPayment();
        return;
      }

      // Esc: Clear cart (ONLY if not typing in input)
      if (e.key === 'Escape' && !isTyping) {
        e.preventDefault();
        onClearCart();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onFocusSearch, onOpenDiscount, onOpenPayment, onClearCart, canPay, isModalOpen, canDiscount]);
}
