import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { shiftsApi } from '../../../api/shifts.api';
import { useShiftStore } from '../../../stores/shift.store';
import { useAppContextStore } from '../../../stores/app-context.store';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/data-display/StatusBadge';
import { MoneyText } from '../../../components/data-display/MoneyText';
import { DateTimeText } from '../../../components/data-display/DateTimeText';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { OpenShiftModal } from '../components/OpenShiftModal';
import { CashMovementModal } from '../components/CashMovementModal';
import { CloseShiftModal } from '../components/CloseShiftModal';
import { Clock, PlusCircle, ArrowDownUp, CheckCircle, ShoppingBag, ShieldCheck } from 'lucide-react';

export const ShiftsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeTerminalId, activeStoreName, activeTerminalCode, user } = useAppContextStore();
  const { activeShift, setActiveShift } = useShiftStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  useEffect(() => {
    if ((location.state as { autoOpen?: boolean })?.autoOpen && !activeShift) {
      setIsOpenModalOpen(true);
    }
  }, [location.state, activeShift]);

  const loadActiveShift = async () => {
    setIsLoading(true);
    try {
      const shift = await shiftsApi.getActiveShift(activeTerminalId || undefined);
      setActiveShift(shift);
    } catch {
      setActiveShift(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActiveShift();
  }, [activeTerminalId]);

  if (isLoading) {
    return <LoadingState message="Memeriksa data shift kasir..." rows={3} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Shift Operasional Kasir
          </h1>
          <p className="text-sm sm:text-base font-semibold text-slate-600 mt-1">
            Kelola sesi kasir, pantau saldo kas fisik di laci (cash drawer), dan lakukan rekonsiliasi tutup shift.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeShift ? (
            <>
              <Button
                variant="secondary"
                size="md"
                leftIcon={<ArrowDownUp className="w-5 h-5 text-sky-700" />}
                onClick={() => setIsMovementModalOpen(true)}
              >
                Kas Masuk / Keluar
              </Button>
              <Button
                variant="danger"
                size="md"
                leftIcon={<CheckCircle className="w-5 h-5" />}
                onClick={() => setIsCloseModalOpen(true)}
              >
                Tutup Shift
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<ShoppingBag className="w-5 h-5" />}
                onClick={() => navigate('/pos')}
              >
                Buka Kasir POS
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="lg"
              leftIcon={<PlusCircle className="w-5 h-5" />}
              onClick={() => setIsOpenModalOpen(true)}
            >
              Buka Shift Baru
            </Button>
          )}
        </div>
      </div>

      {/* Main Shift Status Card */}
      {activeShift ? (
        <Card className="bg-white border-2 border-slate-200 shadow-md p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b-2 border-slate-200">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <StatusBadge status="OPEN" type="shift" size="md" />
                <span className="text-sm text-slate-500 font-mono font-bold">ID: {activeShift.id}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Kasir Bertugas: {user?.full_name || user?.username}
              </h2>
              <div className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <span>Cabang: {activeStoreName}</span>
                <span>&bull;</span>
                <span>Terminal: {activeTerminalCode}</span>
              </div>
            </div>

            <div className="text-right space-y-1 bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl">
              <div className="text-sm font-bold text-emerald-800">Modal Awal Kas Fisik</div>
              <MoneyText amount={activeShift.starting_cash} size="xl" variant="success" />
              <div className="text-xs font-semibold text-slate-600">
                Waktu Buka: <DateTimeText value={activeShift.opened_at} />
              </div>
            </div>
          </div>

          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-1">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Status Operasi</span>
              <div className="text-base sm:text-lg font-black text-emerald-700 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Siap Melayani Transaksi
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-1">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Terminal Register</span>
              <div className="text-base sm:text-lg font-black text-slate-900">
                {activeTerminalCode || 'Virtual POS'}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-1">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Catatan Sesi Kasir</span>
              <div className="text-sm sm:text-base font-semibold text-slate-700 italic">
                {activeShift.notes || 'Tidak ada catatan khusus.'}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center bg-white border-2 border-dashed border-slate-300 space-y-5">
          <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-500 mx-auto">
            <Clock className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-slate-900">
              Tidak Ada Shift Kasir yang Sedang Berjalan
            </h3>
            <p className="text-sm sm:text-base font-medium text-slate-600 max-w-lg mx-auto leading-relaxed">
              Buka shift kasir baru dengan modal awal uang fisik sebelum memulai transaksi checkout di terminal POS.
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            leftIcon={<PlusCircle className="w-5 h-5" />}
            onClick={() => setIsOpenModalOpen(true)}
            className="text-lg py-4 px-8 shadow-lg shadow-emerald-700/20"
          >
            Buka Shift Sekarang
          </Button>
        </Card>
      )}

      {/* Modals */}
      <OpenShiftModal
        isOpen={isOpenModalOpen}
        onClose={() => setIsOpenModalOpen(false)}
        onSuccess={loadActiveShift}
      />

      {activeShift && (
        <>
          <CashMovementModal
            isOpen={isMovementModalOpen}
            onClose={() => setIsMovementModalOpen(false)}
            shiftId={activeShift.id}
            onSuccess={loadActiveShift}
          />

          <CloseShiftModal
            isOpen={isCloseModalOpen}
            onClose={() => setIsCloseModalOpen(false)}
            shift={activeShift}
            expectedCashMinor={activeShift.starting_cash}
            salesCashMinor={0}
            cashInMinor={0}
            cashOutMinor={0}
            onSuccess={loadActiveShift}
          />
        </>
      )}
    </div>
  );
};
