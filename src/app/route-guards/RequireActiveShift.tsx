import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useShiftStore } from '../../stores/shift.store';
import { shiftsApi } from '../../api/shifts.api';
import { useAppContextStore } from '../../stores/app-context.store';
import { Button } from '../../components/ui/Button';
import { Clock, PlusCircle, Monitor, RefreshCw } from 'lucide-react';

export const RequireActiveShift: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeShift, setActiveShift } = useShiftStore();
  const { activeTerminalId, activeTerminalCode, user } = useAppContextStore();
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

  // If cashier role has not selected a terminal, redirect to terminal selector
  if (user?.role === 'cashier' && !activeTerminalId) {
    return <Navigate to="/select-terminal" replace />;
  }

  if (!activeShift) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-amber-400 mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Shift Kasir Belum Dibuka</h2>
          <p className="text-xs text-slate-400 mt-2 mb-4 leading-relaxed">
            Untuk melakukan transaksi penjualan dan checkout di kasir, Anda wajib membuka shift baru dengan memasukkan modal awal kas fisik.
          </p>

          {/* Active Terminal Indicator */}
          {activeTerminalCode && (
            <div className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 mb-6">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-400" />
                <span>Terminal POS: <strong className="text-white">{activeTerminalCode}</strong></span>
              </div>
              <button
                onClick={() => navigate('/select-terminal')}
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline text-[11px] flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Ganti Meja
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            {user?.role !== 'cashier' && (
              <Button
                variant="outline"
                size="md"
                className="w-full sm:flex-1"
                onClick={() => navigate('/products')}
              >
                Ke Backoffice
              </Button>
            )}
            <Button
              variant="outline"
              size="md"
              className="w-full sm:flex-1 border-slate-700 text-slate-300"
              onClick={() => navigate('/select-terminal')}
            >
              Pilih Terminal Lain
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500"
              onClick={() => navigate('/shifts', { state: { autoOpen: true } })}
            >
              Buka Shift
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
