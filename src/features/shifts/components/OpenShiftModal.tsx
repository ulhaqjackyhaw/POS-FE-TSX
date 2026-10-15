import React, { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { parseRupiahInput, formatRupiah } from '../../../utils/currency';
import { shiftsApi } from '../../../api/shifts.api';
import { useShiftStore } from '../../../stores/shift.store';
import { useAppContextStore } from '../../../stores/app-context.store';
import { useToast } from '../../../components/feedback/Toast';
import { DollarSign, Check } from 'lucide-react';

export interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { activeStoreId, activeTerminalId } = useAppContextStore();
  const { setActiveShift } = useShiftStore();
  const { toast } = useToast();

  const [rawCash, setRawCash] = useState('500000');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cashMinor = parseRupiahInput(rawCash);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStoreId || !activeTerminalId) {
      setError('Cabang dan Terminal kasir harus dipilih terlebih dahulu.');
      return;
    }
    if (cashMinor < 0) {
      setError('Modal awal kas fisik tidak boleh bernilai negatif.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const newShift = await shiftsApi.openShift({
        store_id: activeStoreId,
        terminal_id: activeTerminalId,
        opening_cash_minor: cashMinor,
        note: note.trim() || undefined,
      });

      setActiveShift(newShift);
      toast('Shift kasir berhasil dibuka!', 'success');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuka shift';
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
      title="Buka Shift Kasir Baru"
      description="Masukkan modal awal uang fisik di dalam laci kasir (cash drawer)."
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Check className="w-5 h-5" />}
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            Buka Shift Sekarang
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

        <div>
          <Input
            label="Modal Awal Kas Fisik (IDR)"
            placeholder="0"
            leftIcon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            value={rawCash}
            onChange={(e) => setRawCash(e.target.value)}
            helperText={`Terbaca: ${formatRupiah(cashMinor)}`}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm sm:text-base font-bold text-slate-800 mb-2">
            Catatan Buka Shift (Opsional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: Buka shift pagi, uang kembalian pecahan kecil siap"
            rows={2}
            className="w-full rounded-xl bg-white border-2 border-slate-300 text-slate-900 placeholder-slate-400 text-base p-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-sm font-medium"
          />
        </div>
      </form>
    </Dialog>
  );
};
