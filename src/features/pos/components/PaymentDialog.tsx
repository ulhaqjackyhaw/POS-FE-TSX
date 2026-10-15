import React, { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { MoneyText } from '../../../components/data-display/MoneyText';
import { parseRupiahInput, formatRupiah } from '../../../utils/currency';
import { posApi } from '../../../api/pos.api';
import { usePosStore } from '../pos.store';
import { useShiftStore } from '../../../stores/shift.store';
import { useAppContextStore } from '../../../stores/app-context.store';
import { useNetworkStore } from '../../../stores/network.store';
import { useSyncStore } from '../../../stores/sync.store';
import { useToast } from '../../../components/feedback/Toast';
import { saveOfflineTransaction } from '../../../db/indexeddb';
import {
  generateIdempotencyKey,
  generateClientTransactionId,
  generateOfflineReceiptNumber,
} from '../../../utils/idempotency';
import { ReceiptData } from './ReceiptView';
import { Banknote, CheckCircle, WifiOff } from 'lucide-react';

export interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  totalMinor: number;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  quoteId?: string;
  onSuccess: (receipt: ReceiptData) => void;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  isOpen,
  onClose,
  totalMinor,
  subtotalMinor,
  discountMinor,
  taxMinor,
  quoteId,
  onSuccess,
}) => {
  const { cart, clearCart } = usePosStore();
  const { activeShift } = useShiftStore();
  const { activeStoreId, activeStoreName, activeTerminalId, activeTerminalCode, user } =
    useAppContextStore();
  const { isOnline } = useNetworkStore();
  const { refreshCounts } = useSyncStore();
  const { toast } = useToast();

  const [rawCashReceived, setRawCashReceived] = useState(String(totalMinor));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cashReceivedMinor = parseRupiahInput(rawCashReceived);
  const changeMinor = Math.max(0, cashReceivedMinor - totalMinor);
  const isCashSufficient = cashReceivedMinor >= totalMinor;

  // Quick denomination suggestions
  const denominations = [
    totalMinor,
    Math.ceil(totalMinor / 10000) * 10000,
    Math.ceil(totalMinor / 20000) * 20000,
    Math.ceil(totalMinor / 50000) * 50000,
    Math.ceil(totalMinor / 100000) * 100000,
  ].filter((val, index, self) => val >= totalMinor && self.indexOf(val) === index).slice(0, 4);

  const handleCompleteCheckout = async () => {
    if (!isCashSufficient) {
      setError('Uang tunai yang diterima kurang dari total pembayaran.');
      return;
    }
    if (!activeShift || !activeStoreId || !activeTerminalId) {
      setError('Shift kasir atau konteks terminal tidak aktif.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const idempotencyKey = generateIdempotencyKey('chk');
    const clientTxId = generateClientTransactionId();

    // 1. OFFLINE FLOW (PRD Section 8.1 & 8.3)
    if (!isOnline) {
      try {
        const offlineReceiptNumber = generateOfflineReceiptNumber(activeTerminalCode || 'POS');
        const nowIso = new Date().toISOString();

        await saveOfflineTransaction({
          clientTransactionId: clientTxId,
          idempotencyKey,
          storeId: activeStoreId,
          terminalId: activeTerminalId,
          shiftId: activeShift.id,
          cashierId: user?.id || 'cashier',
          cashierName: user?.full_name || user?.username,
          createdAt: nowIso,
          currency: 'IDR',
          paymentMethod: 'cash',
          items: cart.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            cachedUnitPriceMinor: i.unitPriceMinor,
          })),
          cashReceivedMinor,
          expectedTotalMinor: totalMinor,
          changeMinor,
          payloadVersion: 1,
          syncStatus: 'pending',
          retryCount: 0,
          receiptNumber: offlineReceiptNumber,
        });

        await refreshCounts();
        toast('Transaksi offline tersimpan secara lokal dan masuk antrean sinkronisasi!', 'info');

        const receiptData: ReceiptData = {
          transactionId: clientTxId,
          receiptNumber: offlineReceiptNumber,
          storeName: activeStoreName || 'Cabang POS',
          terminalCode: activeTerminalCode || 'POS',
          cashierName: user?.full_name || user?.username,
          createdAt: nowIso,
          items: [...cart],
          subtotalMinor,
          discountMinor,
          taxMinor,
          totalMinor,
          cashReceivedMinor,
          changeMinor,
          isOffline: true,
        };

        clearCart();
        onClose();
        onSuccess(receiptData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal menyimpan transaksi offline.';
        setError(msg);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 2. ONLINE FLOW (PRD Section 7.3 & 9.3)
    try {
      const res = await posApi.checkout({
        quote_id: quoteId,
        store_id: activeStoreId,
        shift_id: activeShift.id,
        terminal_id: activeTerminalId,
        items: cart.map((i) => ({
          product_id: i.productId,
          quantity: i.quantity,
          discount: i.discount,
        })),
        payment: {
          method: 'cash',
          received_minor: cashReceivedMinor,
        },
        idempotency_key: idempotencyKey,
        client_transaction_id: clientTxId,
      });

      toast('Pembayaran tunai berhasil diselesaikan!', 'success');

      const receiptData: ReceiptData = {
        transactionId: res.transaction_id || clientTxId,
        receiptNumber: res.receipt_number || `REC-${Date.now().toString().slice(-6)}`,
        storeName: activeStoreName || 'Cabang POS',
        terminalCode: activeTerminalCode || 'POS',
        cashierName: user?.full_name || user?.username,
        createdAt: res.created_at || new Date().toISOString(),
        items: [...cart],
        subtotalMinor,
        discountMinor,
        taxMinor,
        totalMinor: res.total_minor || totalMinor,
        cashReceivedMinor,
        changeMinor: res.change_minor !== undefined ? res.change_minor : changeMinor,
        isOffline: false,
      };

      clearCart();
      onClose();
      onSuccess(receiptData);
    } catch (err: unknown) {
      // PRD Section 10.2: If network timeout or offline during request, offer offline fallback
      const msg = err instanceof Error ? err.message : 'Gagal memproses checkout ke backend.';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Pembayaran Tunai (Cash Checkout)"
      description="Verifikasi jumlah uang tunai yang diterima dari pelanggan dan kembalian."
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" size="lg" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            variant="primary"
            size="xl"
            leftIcon={<CheckCircle className="w-6 h-6" />}
            isLoading={isSubmitting}
            disabled={!isCashSufficient}
            onClick={handleCompleteCheckout}
            className="px-8 font-bold"
          >
            Selesaikan Transaksi (Enter)
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-base font-bold text-rose-800">
            {error}
          </div>
        )}

        {/* Offline indicator if simulated or offline */}
        {!isOnline && (
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center gap-3 text-sm sm:text-base font-bold text-amber-900">
            <WifiOff className="w-6 h-6 shrink-0 text-amber-700" />
            <span>
              Mode Offline Aktif: Transaksi akan disimpan ke antrean lokal dan disinkronkan saat online.
            </span>
          </div>
        )}

        {/* Total to pay display */}
        <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
          <div>
            <span className="text-sm sm:text-base font-bold text-emerald-950 uppercase tracking-wide">Total Tagihan Belanja</span>
            <p className="text-xs sm:text-sm text-emerald-800 font-medium">Harus dibayar pelanggan</p>
          </div>
          <MoneyText amount={totalMinor} size="3xl" variant="default" className="text-emerald-950 font-black tracking-tight" />
        </div>

        {/* Denomination Quick Buttons */}
        <div>
          <label className="block text-sm sm:text-base font-bold text-slate-800 mb-2">
            Pilihan Cepat Uang Diterima:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {denominations.map((denom, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setRawCashReceived(String(denom))}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 text-base sm:text-lg font-mono font-bold cursor-pointer transition-all active:scale-95 shadow-sm text-center ${
                  cashReceivedMinor === denom
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-md ring-4 ring-emerald-200'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 hover:border-slate-400'
                }`}
              >
                {denom === totalMinor ? 'Uang Pas' : formatRupiah(denom)}
              </button>
            ))}
          </div>
        </div>

        {/* Input Cash Received */}
        <div>
          <Input
            label="Nominal Uang Diterima (IDR)"
            placeholder="0"
            size="lg"
            leftIcon={<Banknote className="w-6 h-6 text-slate-500" />}
            value={rawCashReceived}
            onChange={(e) => setRawCashReceived(e.target.value)}
            helperText={`Terbaca: ${formatRupiah(cashReceivedMinor)}`}
            required
            autoFocus
          />
        </div>

        {/* Change Preview */}
        <div
          className={`p-5 sm:p-6 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm ${
            isCashSufficient
              ? 'bg-blue-50 border-blue-300'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div>
            <span className="text-sm sm:text-base font-bold text-slate-800 uppercase tracking-wide">
              {isCashSufficient ? 'Uang Kembalian' : 'Uang Kurang'}
            </span>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {isCashSufficient ? 'Serahkan kembali ke pelanggan' : 'Pembayaran belum mencukupi'}
            </p>
          </div>
          <MoneyText
            amount={isCashSufficient ? changeMinor : totalMinor - cashReceivedMinor}
            size="2xl"
            variant={isCashSufficient ? 'default' : 'danger'}
            className="font-black"
          />
        </div>
      </div>
    </Dialog>
  );
};
