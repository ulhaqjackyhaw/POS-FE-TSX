import React, { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DiscountInput } from '../../../types/money';
import { parseRupiahInput, formatRupiah } from '../../../utils/currency';
import { Percent, Tag } from 'lucide-react';

export interface DiscountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  currentDiscount?: DiscountInput;
  onApply: (discount?: DiscountInput) => void;
}

export const DiscountDialog: React.FC<DiscountDialogProps> = ({
  isOpen,
  onClose,
  targetName,
  currentDiscount,
  onApply,
}) => {
  const [type, setType] = useState<'percent' | 'amount'>(currentDiscount?.type || 'percent');
  const [rawValue, setRawValue] = useState(
    currentDiscount ? String(currentDiscount.value) : ''
  );
  const [reason, setReason] = useState(currentDiscount?.reason || '');

  const numericValue = parseRupiahInput(rawValue);

  const handleApply = () => {
    if (numericValue <= 0) {
      onApply(undefined);
      onClose();
      return;
    }
    onApply({
      type,
      value: numericValue,
      reason: reason.trim() || undefined,
    });
    onClose();
  };

  const handleRemove = () => {
    onApply(undefined);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Atur Diskon Transaksi"
      description={`Terapkan potongan harga untuk ${targetName}`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          {currentDiscount ? (
            <Button variant="ghost" size="md" onClick={handleRemove} className="text-rose-600 hover:text-rose-700">
              Hapus Diskon
            </Button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="md" onClick={onClose}>
              Batal
            </Button>
            <Button variant="primary" size="md" onClick={handleApply}>
              Terapkan Diskon
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Toggle type */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('percent')}
            className={`p-3.5 rounded-xl border-2 flex items-center justify-center gap-2 text-sm sm:text-base font-extrabold cursor-pointer transition-all shadow-sm ${
              type === 'percent'
                ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>Persentase (%)</span>
          </button>
          <button
            type="button"
            onClick={() => setType('amount')}
            className={`p-3.5 rounded-xl border-2 flex items-center justify-center gap-2 text-sm sm:text-base font-extrabold cursor-pointer transition-all shadow-sm ${
              type === 'amount'
                ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Nominal (Rp)</span>
          </button>
        </div>

        <Input
          label={type === 'percent' ? 'Besar Diskon Persentase (%)' : 'Nominal Potongan Harga (Rp)'}
          placeholder={type === 'percent' ? 'Contoh: 10' : 'Contoh: 5000'}
          value={rawValue}
          onChange={(e) => setRawValue(e.target.value)}
          helperText={
            type === 'percent'
              ? `Diskon: ${numericValue}%`
              : `Diskon: ${formatRupiah(numericValue)}`
          }
          autoFocus
        />

        <Input
          label="Alasan Diskon (Opsional)"
          placeholder="Contoh: Promo member, diskon karyawan"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
    </Dialog>
  );
};
