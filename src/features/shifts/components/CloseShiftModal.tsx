import React, { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { MoneyText } from '../../../components/data-display/MoneyText';
import { parseRupiahInput, formatRupiah } from '../../../utils/currency';
import { shiftsApi } from '../../../api/shifts.api';
import { useShiftStore } from '../../../stores/shift.store';
import { useToast } from '../../../components/feedback/Toast';
import { Shift } from '../../../types/store';
import { DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift;
  expectedCashMinor: number;
  salesCashMinor: number;
  cashInMinor: number;
  cashOutMinor: number;
  onSuccess?: () => void;
}

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({
  isOpen,
  onClose,
  shift,
  expectedCashMinor,
  salesCashMinor,
  cashInMinor,
  cashOutMinor,
  onSuccess,
}) => {
  const { clearShift } = useShiftStore();
  const { toast } = useToast();

  const [rawActualCash, setRawActualCash] = useState(String(expectedCashMinor || 0));
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actualCashMinor = parseRupiahInput(rawActualCash);
  const varianceMinor = actualCashMinor - expectedCashMinor;
  const hasDiscrepancy = varianceMinor !== 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasDiscrepancy && !discrepancyReason.trim()) {
      setError('Terdapat selisih kas fisik. Anda wajib memberikan alasan selisih kas.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await shiftsApi.closeShift(shift.id, {
        actual_cash_minor: actualCashMinor,
        discrepancy_reason: hasDiscrepancy ? discrepancyReason.trim() : undefined,
        note: note.trim() || undefined,
      });

      clearShift();
      toast('Shift kasir berhasil ditutup dan direkonsiliasi!', 'success');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menutup shift';
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
      title="Tutup Shift & Rekonsiliasi Kas"
      description="Hitung total fisik uang tunai di laci kasir dan bandingkan dengan pencatatan sistem."
      maxWidth="lg"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            variant="danger"
            size="md"
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            Konfirmasi & Tutup Shift
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

        {/* Breakdown table */}
        <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3 text-sm sm:text-base">
          <div className="flex justify-between py-1.5 border-b border-slate-200 text-slate-700 font-semibold">
            <span>Modal Awal Kas</span>
            <MoneyText amount={shift.starting_cash} size="sm" />
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-200 text-slate-700 font-semibold">
            <span>Total Penjualan Tunai</span>
            <MoneyText amount={salesCashMinor} size="sm" variant="success" />
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-200 text-slate-700 font-semibold">
            <span>Total Kas Masuk (In)</span>
            <MoneyText amount={cashInMinor} size="sm" />
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-200 text-slate-700 font-semibold">
            <span>Total Kas Keluar (Out)</span>
            <MoneyText amount={-cashOutMinor} size="sm" variant="danger" />
          </div>
          <div className="flex justify-between py-3 text-base sm:text-lg font-black text-slate-900 border-t-2 border-slate-300">
            <span>Kas Ekspektasi Sistem</span>
            <MoneyText amount={expectedCashMinor} size="lg" />
          </div>
        </div>

        {/* Actual Cash Input */}
        <div>
          <Input
            label="Total Kas Fisik Aktual di Drawer (IDR)"
            placeholder="0"
            leftIcon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            value={rawActualCash}
            onChange={(e) => setRawActualCash(e.target.value)}
            helperText={`Terbaca: ${formatRupiah(actualCashMinor)}`}
            required
            autoFocus
          />
        </div>

        {/* Variance Display */}
        <div
          className={`p-4 rounded-2xl border-2 flex items-center justify-between text-sm sm:text-base ${
            varianceMinor === 0
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
              : varianceMinor > 0
              ? 'bg-sky-50 border-sky-300 text-sky-900 font-bold'
              : 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {varianceMinor === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-700" />
            )}
            <span className="font-extrabold">
              {varianceMinor === 0
                ? 'Kas Fisik Seimbang (Cocok)'
                : varianceMinor > 0
                ? 'Kas Fisik Lebih (Surplus)'
                : 'Kas Fisik Kurang (Defisit)'}
            </span>
          </div>
          <MoneyText
            amount={varianceMinor}
            size="md"
            variant={varianceMinor === 0 ? 'success' : varianceMinor > 0 ? 'default' : 'danger'}
          />
        </div>

        {hasDiscrepancy && (
          <div>
            <Input
              label="Alasan Selisih Kas (Wajib Diisi Karena Ada Selisih)"
              placeholder="Contoh: Kesalahan pembulatan kembalian atau uang tercecer"
              value={discrepancyReason}
              onChange={(e) => setDiscrepancyReason(e.target.value)}
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm sm:text-base font-bold text-slate-800 mb-2">
            Catatan Penutupan Shift (Opsional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan serah terima shift ke kasir berikutnya..."
            rows={2}
            className="w-full rounded-xl bg-white border-2 border-slate-300 text-slate-900 placeholder-slate-400 text-base p-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-sm font-medium"
          />
        </div>
      </form>
    </Dialog>
  );
};
