import React, { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { parseRupiahInput, formatRupiah } from '../../../utils/currency';
import { shiftsApi } from '../../../api/shifts.api';
import { useToast } from '../../../components/feedback/Toast';
import { ArrowDownRight, ArrowUpRight, DollarSign } from 'lucide-react';

export interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
  onSuccess?: () => void;
}

export const CashMovementModal: React.FC<CashMovementModalProps> = ({
  isOpen,
  onClose,
  shiftId,
  onSuccess,
}) => {
  const { toast } = useToast();

  const [type, setType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [rawAmount, setRawAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountMinor = parseRupiahInput(rawAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountMinor <= 0) {
      setError('Nominal pergerakan kas harus lebih besar dari 0.');
      return;
    }
    if (!reason.trim()) {
      setError('Alasan pergerakan kas wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await shiftsApi.createMovement(shiftId, {
        type,
        amount_minor: amountMinor,
        reason: reason.trim(),
        reference: reference.trim() || undefined,
      });

      toast(`Pergerakan ${type === 'cash_in' ? 'Kas Masuk' : 'Kas Keluar'} berhasil dicatat!`, 'success');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mencatat kas';
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
      title="Pergerakan Kas Fisik (Cash Movement)"
      description="Catat penambahan kas masuk atau pengeluaran kas keluar dari drawer selama shift berjalan."
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            Simpan Pergerakan
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-xl text-sm font-bold text-rose-800">
            {error}
          </div>
        )}

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('cash_in')}
            className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2.5 text-sm sm:text-base font-extrabold cursor-pointer transition-all shadow-sm ${
              type === 'cash_in'
                ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowDownRight className="w-5 h-5 text-emerald-600" />
            <span>Kas Masuk (In)</span>
          </button>

          <button
            type="button"
            onClick={() => setType('cash_out')}
            className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2.5 text-sm sm:text-base font-extrabold cursor-pointer transition-all shadow-sm ${
              type === 'cash_out'
                ? 'bg-rose-50 border-rose-600 text-rose-950 ring-2 ring-rose-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowUpRight className="w-5 h-5 text-rose-600" />
            <span>Kas Keluar (Out)</span>
          </button>
        </div>

        <div>
          <Input
            label="Nominal Uang Kas (IDR)"
            placeholder="0"
            leftIcon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            value={rawAmount}
            onChange={(e) => setRawAmount(e.target.value)}
            helperText={`Terbaca: ${formatRupiah(amountMinor)}`}
            required
            autoFocus
          />
        </div>

        <div>
          <Input
            label="Alasan / Keperluan (Wajib Diisi)"
            placeholder="Contoh: Tambah uang receh kembalian, beli galon air"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            label="No. Referensi / Bukti Nota (Opsional)"
            placeholder="Contoh: NOTA-12345"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
      </form>
    </Dialog>
  );
};
