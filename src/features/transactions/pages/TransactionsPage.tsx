import React, { useState, useEffect } from 'react';
import { posApi } from '../../../api/pos.api';
import { SalesTransaction } from '../../../types/api';
import { MoneyText } from '../../../components/data-display/MoneyText';
import { DateTimeText } from '../../../components/data-display/DateTimeText';
import { StatusBadge } from '../../../components/data-display/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Dialog } from '../../../components/ui/Dialog';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../components/feedback/Toast';
import { usePermission } from '../../../hooks/usePermission';
import { generateIdempotencyKey } from '../../../utils/idempotency';
import { ReceiptView, ReceiptData } from '../../pos/components/ReceiptView';
import { useAppContextStore } from '../../../stores/app-context.store';
import { formatReceiptNumber } from '../../../utils/receipt';
import {
  Eye,
  XCircle,
  RotateCcw,
  Printer,
  AlertTriangle,
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { activeStoreName, activeTerminalCode } = useAppContextStore();
  const { check, isOwnerOrAdmin } = usePermission();
  const canVoid = isOwnerOrAdmin || check('transaction.void') || check('pos:void');
  const canRefund = isOwnerOrAdmin || check('transaction.refund') || check('pos:refund');
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [selectedTx, setSelectedTx] = useState<SalesTransaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Form states
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const data = await posApi.listTransactions({
        status: statusFilter || undefined,
      });
      setTransactions(data || []);
    } catch {
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [statusFilter]);

  const handleOpenDetail = (tx: SalesTransaction) => {
    setSelectedTx(tx);
    setIsDetailOpen(true);
  };

  const handleOpenVoid = (tx: SalesTransaction) => {
    setSelectedTx(tx);
    setActionReason('');
    setModalError(null);
    setIsVoidModalOpen(true);
  };

  const handleOpenRefund = (tx: SalesTransaction) => {
    setSelectedTx(tx);
    setActionReason('');
    setModalError(null);
    setIsRefundModalOpen(true);
  };

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    if (!actionReason.trim()) {
      setModalError('Alasan pembatalan (void) transaksi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await posApi.voidTransaction(selectedTx.id, {
        reason: actionReason.trim(),
        idempotency_key: generateIdempotencyKey('void'),
      });

      toast(`Transaksi ${selectedTx.receipt_number} berhasil di-void!`, 'success');
      setIsVoidModalOpen(false);
      setIsDetailOpen(false);
      await loadTransactions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal void transaksi';
      setModalError(msg);
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    if (!actionReason.trim()) {
      setModalError('Alasan pengembalian (refund) transaksi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await posApi.refundTransaction(selectedTx.id, {
        reason: actionReason.trim(),
        amount_minor: selectedTx.total_amount,
        idempotency_key: generateIdempotencyKey('ref'),
      });

      toast(`Transaksi ${selectedTx.receipt_number} berhasil di-refund!`, 'success');
      setIsRefundModalOpen(false);
      setIsDetailOpen(false);
      await loadTransactions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal refund transaksi';
      setModalError(msg);
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReprintReceipt = (tx: SalesTransaction) => {
    const formattedReceipt = formatReceiptNumber(
      tx.receipt_number || tx.invoice_number,
      activeTerminalCode,
      tx.created_at
    );
    setReceiptData({
      transactionId: tx.id,
      receiptNumber: formattedReceipt,
      storeName: activeStoreName || 'Cabang Retail',
      terminalCode: activeTerminalCode || 'POS',
      cashierName: 'Kasir',
      createdAt: tx.created_at,
      items: (tx.items || []).map((i) => ({
        productId: i.product_id,
        sku: i.product_id,
        name: i.product_name,
        quantity: i.quantity,
        unitPriceMinor: i.unit_price,
      })),
      subtotalMinor: tx.subtotal,
      discountMinor: tx.discount_amount,
      taxMinor: tx.tax_amount,
      totalMinor: tx.total_amount,
      cashReceivedMinor: tx.cash_received || tx.total_amount,
      changeMinor: tx.cash_change || 0,
      isOffline: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Riwayat Transaksi Penjualan</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Daftar seluruh transaksi kasir, struk pembayaran, void nota, dan refund dana pelanggan.
          </p>
        </div>

        {/* Status filter buttons */}
        <div className="flex items-center gap-2 bg-slate-200 p-1.5 rounded-2xl text-sm font-bold">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-xl cursor-pointer transition-all ${
              statusFilter === '' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-4 py-2 rounded-xl cursor-pointer transition-all ${
              statusFilter === 'COMPLETED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Selesai
          </button>
          <button
            onClick={() => setStatusFilter('VOIDED')}
            className={`px-4 py-2 rounded-xl cursor-pointer transition-all ${
              statusFilter === 'VOIDED' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Void
          </button>
          <button
            onClick={() => setStatusFilter('REFUNDED')}
            className={`px-4 py-2 rounded-xl cursor-pointer transition-all ${
              statusFilter === 'REFUNDED' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Refund
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingState message="Memuat riwayat transaksi penjualan..." rows={6} />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="Belum Ada Transaksi"
          description="Transaksi yang dilakukan kasir di POS akan muncul secara real-time di sini."
        />
      ) : (
        <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-xs sm:text-sm">
                  <th className="py-4 px-5">No. Struk</th>
                  <th className="py-4 px-5">Waktu</th>
                  <th className="py-4 px-5">Metode</th>
                  <th className="py-4 px-5 text-right">Total Tagihan</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-slate-900 text-sm sm:text-base whitespace-nowrap">
                      {formatReceiptNumber(tx.receipt_number || tx.invoice_number, activeTerminalCode, tx.created_at)}
                    </td>
                    <td className="py-4 px-5">
                      <DateTimeText value={tx.created_at} className="text-slate-800 text-sm font-semibold" />
                    </td>
                    <td className="py-4 px-5 font-mono uppercase text-xs font-bold text-slate-600">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <MoneyText amount={tx.total_amount} size="md" variant="default" className="text-emerald-700 font-black text-lg" />
                    </td>
                    <td className="py-4 px-5 text-center">
                      <StatusBadge status={tx.status} type="transaction" size="md" />
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(tx)}
                          leftIcon={<Eye className="w-4 h-4 text-slate-600" />}
                          className="font-bold"
                          title="Lihat Detail Transaksi"
                        >
                          Detail
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReprintReceipt(tx)}
                          leftIcon={<Printer className="w-4 h-4 text-slate-600" />}
                          className="font-bold"
                          title="Cetak Ulang Struk"
                        >
                          Cetak
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <Dialog
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Detail Transaksi: ${formatReceiptNumber(selectedTx.receipt_number || selectedTx.invoice_number, activeTerminalCode, selectedTx.created_at)}`}
          description={`ID Referensi: ${selectedTx.id}`}
          maxWidth="lg"
          footer={
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {selectedTx.status === 'COMPLETED' && canVoid && (
                  <Button
                    variant="danger"
                    size="lg"
                    leftIcon={<XCircle className="w-5 h-5" />}
                    onClick={() => handleOpenVoid(selectedTx)}
                    className="font-bold"
                  >
                    Void Transaksi
                  </Button>
                )}
                {selectedTx.status === 'COMPLETED' && canRefund && (
                  <Button
                    variant="secondary"
                    size="lg"
                    leftIcon={<RotateCcw className="w-5 h-5 text-amber-600" />}
                    onClick={() => handleOpenRefund(selectedTx)}
                    className="font-bold border-2 border-slate-300"
                  >
                    Refund
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="lg"
                  leftIcon={<Printer className="w-5 h-5 text-slate-600" />}
                  onClick={() => handleReprintReceipt(selectedTx)}
                  className="font-bold"
                >
                  Cetak Ulang
                </Button>
                <Button variant="ghost" size="lg" onClick={() => setIsDetailOpen(false)}>
                  Tutup
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Waktu Pembayaran:</span>
                <div className="mt-0.5">
                  <DateTimeText value={selectedTx.created_at} className="text-slate-900 font-bold text-base" />
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Status Transaksi:</span>
                <div className="mt-0.5">
                  <StatusBadge status={selectedTx.status} type="transaction" size="md" />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="border-2 border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200">
              <div className="p-3.5 bg-slate-100 font-bold text-slate-800 text-sm sm:text-base">
                Daftar Item Pembelian ({selectedTx.items?.length || 0})
              </div>
              {selectedTx.items && selectedTx.items.length > 0 ? (
                selectedTx.items.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-base">{item.product_name}</div>
                      <div className="text-xs text-slate-500 font-mono font-semibold">
                        {item.quantity} &times; <MoneyText amount={item.unit_price} size="sm" />
                      </div>
                    </div>
                    <MoneyText amount={item.total} size="md" className="font-bold text-slate-900 text-base" />
                  </div>
                ))
              ) : (
                <div className="p-4 text-slate-500 text-center font-medium">
                  Detail item tersimpan dalam struk transaksi.
                </div>
              )}
            </div>

            {/* Financial breakdown */}
            <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200 space-y-2">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Subtotal</span>
                <MoneyText amount={selectedTx.subtotal} size="sm" className="font-bold" />
              </div>
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Diskon Transaksi</span>
                <MoneyText amount={-selectedTx.discount_amount} size="sm" variant="danger" className="font-bold" />
              </div>
              <div className="flex justify-between text-slate-600 text-xs font-medium">
                <span>Pajak PPN (11%)</span>
                <MoneyText amount={selectedTx.tax_amount} size="sm" variant="muted" />
              </div>
              <div className="flex justify-between font-black text-lg sm:text-xl text-emerald-950 pt-2 border-t-2 border-emerald-300">
                <span>Total Akhir</span>
                <MoneyText amount={selectedTx.total_amount} size="xl" className="font-black text-emerald-950" />
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Void Modal */}
      {selectedTx && (
        <Dialog
          isOpen={isVoidModalOpen}
          onClose={() => setIsVoidModalOpen(false)}
          title={`Void Transaksi #${formatReceiptNumber(selectedTx.receipt_number || selectedTx.invoice_number, activeTerminalCode, selectedTx.created_at)}`}
          description="Tindakan kritis: Pembatalan transaksi ini akan mengembalikan stok barang ke gudang dan mencatat audit trail."
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setIsVoidModalOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button variant="danger" size="lg" isLoading={isSubmitting} onClick={handleConfirmVoid} className="font-bold">
                Konfirmasi Void
              </Button>
            </div>
          }
        >
          <form onSubmit={handleConfirmVoid} className="space-y-4">
            {modalError && (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-base font-bold text-rose-800">
                {modalError}
              </div>
            )}

            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-sm font-bold text-rose-900 flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>Void tidak dapat dibatalkan. Nilai transaksi yang dibatalkan: Rp {selectedTx.total_amount.toLocaleString('id-ID')}.</span>
            </div>

            <Input
              label="Alasan Pembatalan / Void Transaksi (Wajib Diisi)"
              placeholder="Contoh: Pelanggan salah pesan, transaksi ganda, salah input kasir"
              size="lg"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              required
              autoFocus
            />
          </form>
        </Dialog>
      )}

      {/* Refund Modal */}
      {selectedTx && (
        <Dialog
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          title={`Refund Transaksi #${formatReceiptNumber(selectedTx.receipt_number || selectedTx.invoice_number, activeTerminalCode, selectedTx.created_at)}`}
          description="Tindakan kritis: Pengembalian dana tunai kepada pelanggan."
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setIsRefundModalOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button variant="primary" size="lg" isLoading={isSubmitting} onClick={handleConfirmRefund} className="font-bold">
                Proses Refund
              </Button>
            </div>
          }
        >
          <form onSubmit={handleConfirmRefund} className="space-y-4">
            {modalError && (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-base font-bold text-rose-800">
                {modalError}
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 flex justify-between items-center">
              <span className="text-base font-bold text-slate-700">Total Nilai Refund:</span>
              <MoneyText amount={selectedTx.total_amount} size="xl" className="text-emerald-700 font-black" />
            </div>

            <Input
              label="Alasan Pengembalian Dana / Refund (Wajib Diisi)"
              placeholder="Contoh: Barang cacat pabrik, komplain pelanggan disetujui"
              size="lg"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              required
              autoFocus
            />
          </form>
        </Dialog>
      )}

      {/* Thermal Receipt Print Dialog */}
      {receiptData && (
        <ReceiptView
          isOpen={true}
          onClose={() => setReceiptData(null)}
          data={receiptData}
          onNewTransaction={() => setReceiptData(null)}
        />
      )}
    </div>
  );
};
