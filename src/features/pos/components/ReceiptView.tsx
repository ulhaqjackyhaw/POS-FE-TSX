import React, { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { DateTimeText } from '../../../components/data-display/DateTimeText';
import { Printer, CheckCircle2, WifiOff, ArrowRight } from 'lucide-react';
import { CartItem } from '../../../types/api';
import { formatReceiptNumber } from '../../../utils/receipt';

export interface ReceiptData {
  transactionId: string;
  receiptNumber: string;
  storeName: string;
  storeAddress?: string;
  terminalCode?: string;
  cashierName?: string;
  createdAt: string;
  items: CartItem[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  cashReceivedMinor: number;
  changeMinor: number;
  isOffline?: boolean;
}

export interface ReceiptViewProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData | null;
  onNewTransaction: () => void;
}

export const ReceiptView: React.FC<ReceiptViewProps> = ({
  isOpen,
  onClose,
  data,
  onNewTransaction,
}) => {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [activeTab, setActiveTab] = useState<'success' | 'receipt'>('success');

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCloseAndNew = () => {
    onClose();
    onNewTransaction();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCloseAndNew}
      title={
        <div className="flex items-center gap-2.5 text-emerald-700">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          <span>Transaksi Berhasil Diselesaikan!</span>
        </div>
      }
      description={`No. Struk: ${formatReceiptNumber(data.receiptNumber, data.terminalCode, data.createdAt)}`}
      maxWidth="lg"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          {/* Paper width selector */}
          <div className="flex items-center gap-1.5 bg-slate-200 p-1 rounded-xl text-xs sm:text-sm font-bold">
            <button
              onClick={() => {
                setPaperWidth('58mm');
                setActiveTab('receipt');
              }}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                paperWidth === '58mm' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              58 mm
            </button>
            <button
              onClick={() => {
                setPaperWidth('80mm');
                setActiveTab('receipt');
              }}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                paperWidth === '80mm' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              80 mm
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              leftIcon={<Printer className="w-5 h-5" />}
              onClick={handlePrint}
              className="flex-1 sm:flex-none font-bold"
            >
              Cetak Struk Fisik
            </Button>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<ArrowRight className="w-5 h-5" />}
              onClick={handleCloseAndNew}
              className="flex-1 sm:flex-none font-extrabold px-6"
              autoFocus
            >
              Transaksi Baru (Enter)
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Success Banner Card */}
        <div className="p-5 sm:p-6 bg-emerald-50 border-2 border-emerald-300 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-700/25">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Pembayaran Tunai Berhasil
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                Rp {data.totalMinor.toLocaleString('id-ID')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Kasir: <strong>{data.cashierName || 'Staff'}</strong> &bull; Cabang:{' '}
                <strong>{data.storeName}</strong>
              </p>
            </div>
          </div>

          {/* Change pill */}
          <div className="p-3 sm:p-4 bg-white border border-emerald-200 rounded-2xl text-left sm:text-right">
            <div className="text-xs font-bold text-slate-500 uppercase">Uang Kembalian</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700">
              Rp {data.changeMinor.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-slate-400">
              Diterima: Rp {data.cashReceivedMinor.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* Offline Alert */}
        {data.isOffline && (
          <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center gap-3 text-sm font-bold text-amber-900">
            <WifiOff className="w-5 h-5 text-amber-700 shrink-0" />
            <span>
              Transaksi disimpan offline di terminal kasir ini dan otomatis tersinkron saat jaringan internet kembali stabil.
            </span>
          </div>
        )}

        {/* Tabs to toggle preview vs details */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('success')}
              className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors ${
                activeTab === 'success'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Rincian Belanja ({data.items.length} item)
            </button>
            <button
              onClick={() => setActiveTab('receipt')}
              className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors ${
                activeTab === 'receipt'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Simulasi Kertas Struk Kasir
            </button>
          </div>
        </div>

        {activeTab === 'success' ? (
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Produk</th>
                  <th className="py-2.5 px-4 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Harga Satuan</th>
                  <th className="py-2.5 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-xs font-mono text-slate-400">{item.sku}</div>
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600 font-mono">
                      Rp {item.unitPriceMinor.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-slate-900 font-mono">
                      Rp {(item.unitPriceMinor * item.quantity).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Thermal Printable Paper View */
          <div className="flex justify-center py-2 bg-slate-100 rounded-2xl p-4">
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #receipt-print-area, #receipt-print-area * {
                  visibility: visible !important;
                }
                #receipt-print-area {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
                  max-width: 100% !important;
                  box-shadow: none !important;
                  border: none !important;
                  padding: 4px !important;
                  margin: 0 !important;
                }
              }
            `}</style>
            <div
              id="receipt-print-area"
              style={{ width: paperWidth === '58mm' ? '300px' : '380px' }}
              className="bg-white text-slate-900 p-6 rounded-2xl border-2 border-slate-300 shadow-md font-mono text-xs sm:text-sm leading-relaxed"
            >
              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-400">
                <div className="font-bold text-base tracking-tight text-slate-950">{data.storeName}</div>
                {data.storeAddress && (
                  <div className="text-[11px] text-slate-600 line-clamp-2">{data.storeAddress}</div>
                )}
                <div className="text-[11px] text-slate-600 font-semibold">
                  Terminal: {data.terminalCode || 'POS'} &bull; Kasir: {data.cashierName || 'Staff'}
                </div>
              </div>

              {/* Transaction Metadata */}
              <div className="py-2 space-y-1 text-xs text-slate-700 border-b-2 border-dashed border-slate-300">
                <div className="flex justify-between items-start gap-2">
                  <span className="shrink-0 text-slate-600">No. Struk:</span>
                  <span className="font-bold text-slate-950 text-right break-all">
                    {formatReceiptNumber(data.receiptNumber, data.terminalCode, data.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Waktu:</span>
                  <DateTimeText value={data.createdAt} className="text-slate-800 text-xs font-semibold" />
                </div>
              </div>

              {/* Line items */}
              <div className="py-3 space-y-2 border-b-2 border-dashed border-slate-300">
                {data.items.map((item, idx) => {
                  const lineTotal = item.unitPriceMinor * item.quantity;
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold text-slate-900 break-words">{item.name}</div>
                      <div className="flex justify-between text-slate-600 text-xs">
                        <span>
                          {item.quantity} x Rp {item.unitPriceMinor.toLocaleString('id-ID')}
                        </span>
                        <span className="font-bold text-slate-900">
                          Rp {lineTotal.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="py-2.5 space-y-1.5 border-b-2 border-dashed border-slate-300 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Subtotal:</span>
                  <span>Rp {data.subtotalMinor.toLocaleString('id-ID')}</span>
                </div>
                {data.discountMinor > 0 && (
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>Diskon:</span>
                    <span>-Rp {data.discountMinor.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>PPN (11% Termasuk):</span>
                  <span>Rp {data.taxMinor.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base font-extrabold text-slate-950 pt-1 border-t border-slate-200">
                  <span>TOTAL:</span>
                  <span>Rp {data.totalMinor.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="py-2.5 space-y-1 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Metode:</span>
                  <span className="font-bold">Tunai (Cash)</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Diterima:</span>
                  <span>Rp {data.cashReceivedMinor.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Kembalian:</span>
                  <span>Rp {data.changeMinor.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 text-center text-[11px] text-slate-500 border-t-2 border-dashed border-slate-400 space-y-0.5">
                <div className="font-bold text-slate-700">Terima kasih atas kunjungan Anda!</div>
                <div>Barang yang dibeli tidak dapat ditukar/dikembalikan</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
