import React, { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { MoneyText } from '../../../components/data-display/MoneyText';
import { DateTimeText } from '../../../components/data-display/DateTimeText';
import { Printer, Check, WifiOff } from 'lucide-react';
import { CartItem } from '../../../types/api';

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

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Struk Bukti Pembayaran"
      description="Transaksi berhasil diselesaikan. Cetak struk fisik atau mulai transaksi baru."
      maxWidth="md"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          {/* Paper width selector */}
          <div className="flex items-center gap-1.5 bg-slate-200 p-1.5 rounded-xl text-sm font-bold">
            <button
              onClick={() => setPaperWidth('58mm')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                paperWidth === '58mm' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              58 mm
            </button>
            <button
              onClick={() => setPaperWidth('80mm')}
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
              Cetak Struk
            </Button>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Check className="w-5 h-5" />}
              onClick={() => {
                onClose();
                onNewTransaction();
              }}
              className="flex-1 sm:flex-none font-bold"
            >
              Transaksi Baru
            </Button>
          </div>
        </div>
      }
    >
      {/* Printable Receipt Paper Container */}
      <div className="flex justify-center py-2">
        <div
          id="receipt-print-area"
          style={{ width: paperWidth === '58mm' ? '300px' : '380px' }}
          className="bg-white text-slate-900 p-6 rounded-2xl border-2 border-slate-300 shadow-lg font-mono text-xs sm:text-sm leading-relaxed transition-all"
        >
          {/* Header */}
          <div className="text-center space-y-1.5 pb-4 border-b-2 border-dashed border-slate-400">
            <div className="font-bold text-base sm:text-lg tracking-tight text-slate-950">{data.storeName}</div>
            {data.storeAddress && (
              <div className="text-xs text-slate-600 line-clamp-2">{data.storeAddress}</div>
            )}
            <div className="text-xs text-slate-600 font-semibold">
              Terminal: {data.terminalCode || 'POS'} &bull; Kasir: {data.cashierName || 'Staff'}
            </div>
          </div>

          {/* Offline Notice if applicable */}
          {data.isOffline && (
            <div className="my-3 p-2 bg-amber-100 border-2 border-amber-400 text-amber-950 text-center font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
              <WifiOff className="w-4 h-4 text-amber-800" />
              <span>TRANSAKSI OFFLINE (PENDING SYNC)</span>
            </div>
          )}

          {/* Transaction Metadata */}
          <div className="py-2.5 space-y-1 text-xs text-slate-700 border-b-2 border-dashed border-slate-300">
            <div className="flex justify-between">
              <span>No. Struk:</span>
              <span className="font-bold text-slate-950">{data.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu:</span>
              <DateTimeText value={data.createdAt} className="text-slate-800 text-xs font-medium" />
            </div>
          </div>

          {/* Line items */}
          <div className="py-3.5 space-y-2.5 border-b-2 border-dashed border-slate-400">
            {data.items.map((item, idx) => {
              const lineTotal = item.unitPriceMinor * item.quantity;
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="font-bold text-slate-950 text-xs sm:text-sm">{item.name}</div>
                  <div className="flex justify-between text-slate-700 text-xs">
                    <span>
                      {item.quantity} &times; <MoneyText amount={item.unitPriceMinor} size="sm" className="text-slate-800 font-medium" />
                    </span>
                    <MoneyText amount={lineTotal} size="sm" className="text-slate-950 font-bold" />
                  </div>
                  {item.discount && (
                    <div className="text-xs text-amber-800 font-bold">
                      Diskon: -{item.discount.type === 'percent' ? `${item.discount.value}%` : `Rp ${item.discount.value}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="py-3 space-y-1.5 text-slate-700 border-b-2 border-dashed border-slate-400 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <MoneyText amount={data.subtotalMinor} size="sm" className="text-slate-900 font-semibold" />
            </div>

            {data.discountMinor > 0 && (
              <div className="flex justify-between text-amber-800 font-semibold">
                <span>Diskon Transaksi:</span>
                <MoneyText amount={-data.discountMinor} size="sm" className="text-amber-900 font-bold" />
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-600">
              <span>PPN 11% (Termasuk):</span>
              <MoneyText amount={data.taxMinor} size="sm" className="text-slate-700" />
            </div>

            <div className="flex justify-between font-black text-sm sm:text-base text-slate-950 pt-2 border-t-2 border-slate-300">
              <span>TOTAL AKHIR:</span>
              <MoneyText amount={data.totalMinor} size="lg" className="text-slate-950 font-black" />
            </div>

            <div className="flex justify-between pt-1.5">
              <span>Tunai Diterima:</span>
              <MoneyText amount={data.cashReceivedMinor} size="sm" className="text-slate-950 font-bold" />
            </div>

            <div className="flex justify-between font-bold text-slate-950">
              <span>Kembalian:</span>
              <MoneyText amount={data.changeMinor} size="sm" className="text-slate-950 font-bold" />
            </div>
          </div>

          {/* Footer message */}
          <div className="text-center pt-4 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800">Terima Kasih Atas Kunjungan Anda</div>
            <div>Barang yang sudah dibeli tidak dapat ditukar</div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
