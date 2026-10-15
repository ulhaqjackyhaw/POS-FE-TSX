import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShiftStore } from '../../stores/shift.store';
import { shiftsApi } from '../../api/shifts.api';
import { useAppContextStore } from '../../stores/app-context.store';
import { Button } from '../../components/ui/Button';
import { Clock, PlusCircle } from 'lucide-react';

export const RequireActiveShift: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeShift, setActiveShift } = useShiftStore();
  const { activeTerminalId } = useAppContextStore();
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    async function checkShift() {
      setChecking(true);
      try {
        const shift = await shiftsApi.getActiveShift(activeTerminalId || undefined);
        if (isMounted) {
          setActiveShift(shift);
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setChecking(false);
      }
    }
    checkShift();
    return () => {
      isMounted = false;
    };
  }, [activeTerminalId, setActiveShift]);

  if (checking) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
        <span className="text-xs">Memeriksa status shift kasir...</span>
      </div>
    );
  }

  if (!activeShift) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-amber-400 mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Shift Kasir Belum Dibuka</h2>
          <p className="text-xs text-slate-400 mt-2 mb-6 leading-relaxed">
            Untuk melakukan transaksi penjualan dan checkout di kasir, Anda wajib membuka shift baru dengan memasukkan modal awal kas fisik.
          </p>
          <div className="flex items-center gap-3 w-full">
            <Button
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => navigate('/products')}
            >
              Ke Backoffice
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              className="flex-1"
              onClick={() => navigate('/shifts', { state: { autoOpen: true } })}
            >
              Buka Shift Sekarang
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
