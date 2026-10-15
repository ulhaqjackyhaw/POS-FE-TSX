import React, { useState } from 'react';
import { usePosStore } from '../pos.store';
import { CartItem } from '../../../types/api';
import { MoneyText } from '../../../components/data-display/MoneyText';
import { Button } from '../../../components/ui/Button';
import { DiscountDialog } from './DiscountDialog';
import {
  Trash2,
  Plus,
  Minus,
  Tag,
  CreditCard,
  ShoppingCart,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export interface CartPanelProps {
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  isQuoteLoading: boolean;
  warnings?: Array<{ code: string; message: string }>;
  onOpenPayment: () => void;
  canPay: boolean;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  subtotalMinor,
  discountMinor,
  taxMinor,
  totalMinor,
  isQuoteLoading,
  warnings = [],
  onOpenPayment,
  canPay,
}) => {
  const { cart, cartDiscount, updateQuantity, removeItem, clearCart, setItemDiscount, setCartDiscount } =
    usePosStore();

  const [discountTarget, setDiscountTarget] = useState<CartItem | 'cart' | null>(null);

  return (
    <div className="flex flex-col h-full bg-white border-l-2 border-slate-200 shadow-xl">
      {/* Cart Header */}
      <div className="px-6 py-5 border-b-2 border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2.5">
          <ShoppingCart className="w-6 h-6 text-emerald-600" />
          <h2 className="text-base sm:text-lg font-black text-slate-900">Keranjang Kasir</h2>
          <span className="text-sm px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono font-bold">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} item
          </span>
        </div>

        {cart.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Kosongkan semua item di keranjang?')) {
                clearCart();
              }
            }}
            className="text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors p-1 rounded-lg hover:bg-rose-50"
            title="Bersihkan Keranjang (Esc)"
          >
            <Trash2 className="w-4 h-4" />
            <span>Bersihkan</span>
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto divide-y-2 divide-slate-100 px-5">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <ShoppingCart className="w-16 h-16 stroke-1 mb-3 text-slate-300" />
            <p className="text-base font-extrabold text-slate-700">Keranjang masih kosong</p>
            <p className="text-sm font-medium text-slate-500 max-w-[240px] mt-1.5 leading-relaxed">
              Scan barcode produk atau klik item di katalog produk sebelah kiri.
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const lineSubtotal = item.unitPriceMinor * item.quantity;
            return (
              <div key={item.productId} className="py-4 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-extrabold text-slate-900 line-clamp-1">
                      {item.name}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600 font-mono font-bold mt-0.5">
                      <MoneyText amount={item.unitPriceMinor} size="sm" variant="muted" /> &times; {item.quantity}
                    </div>
                  </div>

                  <div className="text-right">
                    <MoneyText amount={lineSubtotal} size="md" />
                    {item.discount && (
                      <div className="text-xs font-bold text-amber-700 flex items-center justify-end gap-1 mt-0.5">
                        <Tag className="w-3 h-3" />
                        <span>
                          {item.discount.type === 'percent'
                            ? `-${item.discount.value}%`
                            : `-Rp ${item.discount.value}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Item Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 border border-slate-300 shadow-sm">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg bg-white text-slate-800 hover:bg-slate-200 flex items-center justify-center cursor-pointer font-bold shadow-xs border border-slate-200"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-mono font-black text-slate-900 text-sm sm:text-base">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-white text-slate-800 hover:bg-slate-200 flex items-center justify-center cursor-pointer font-bold shadow-xs border border-slate-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDiscountTarget(item)}
                      className={`text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${
                        item.discount
                          ? 'bg-amber-100 border-amber-300 text-amber-900'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      title="Atur diskon produk ini"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Diskon</span>
                    </button>

                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Hapus item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Warnings Banner if any */}
      {warnings.length > 0 && (
        <div className="px-5 py-2.5 bg-amber-50 border-t-2 border-amber-200 flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span className="line-clamp-1">{warnings[0].message}</span>
        </div>
      )}

      {/* Cart Summary & Pay Footer */}
      <div className="p-5 sm:p-6 bg-slate-50 border-t-2 border-slate-200 space-y-4">
        <div className="space-y-2 text-sm font-semibold text-slate-700">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <MoneyText amount={subtotalMinor} size="sm" />
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setDiscountTarget('cart')}
              className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Tag className="w-4 h-4" />
              <span>Diskon Transaksi (F2)</span>
            </button>
            <MoneyText amount={-discountMinor} size="sm" variant={discountMinor > 0 ? 'danger' : 'muted'} />
          </div>

          <div className="flex justify-between text-xs sm:text-sm text-slate-600">
            <span>Termasuk Pajak (PPN 11%)</span>
            <MoneyText amount={taxMinor} size="sm" variant="muted" />
          </div>

          <div className="flex justify-between items-baseline pt-3 border-t-2 border-slate-200 text-base sm:text-lg font-black text-slate-900">
            <span>TOTAL TAGIHAN</span>
            <div className="flex items-center gap-2">
              {isQuoteLoading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
              <MoneyText amount={totalMinor} size="2xl" variant="success" />
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="xl"
          leftIcon={<CreditCard className="w-6 h-6" />}
          disabled={!canPay || cart.length === 0}
          onClick={onOpenPayment}
          className="w-full text-lg sm:text-xl py-4 sm:py-5 shadow-xl shadow-emerald-700/25"
        >
          BAYAR TUNAI (Space / Enter)
        </Button>
      </div>

      {/* Discount Dialog */}
      {discountTarget && (
        <DiscountDialog
          isOpen={true}
          onClose={() => setDiscountTarget(null)}
          targetName={discountTarget === 'cart' ? 'Seluruh Transaksi' : discountTarget.name}
          currentDiscount={discountTarget === 'cart' ? cartDiscount : discountTarget.discount}
          onApply={(disc) => {
            if (discountTarget === 'cart') {
              setCartDiscount(disc);
            } else {
              setItemDiscount(discountTarget.productId, disc);
            }
          }}
        />
      )}
    </div>
  );
};
