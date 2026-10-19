import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storesApi } from '../../../api/stores.api';
import { shiftsApi } from '../../../api/shifts.api';
import { Store, Terminal } from '../../../types/store';
import { useAppContextStore } from '../../../stores/app-context.store';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { useToast } from '../../../components/feedback/Toast';
import { isGlobalRole, getFocusMenuForRole } from '../../../utils/roleNavigation';
import {
  Store as StoreIcon,
  Monitor,
  ArrowRight,
  Building,
  Check,
  Lock,
  LogOut,
} from 'lucide-react';

export const SelectStorePage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveStore, setActiveTerminal, activeStoreId, activeStoreName, user, logout } = useAppContextStore();
  const { toast } = useToast();

  const isGlobal = isGlobalRole(user?.role);
  const targetMenu = getFocusMenuForRole(user?.role);

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);

  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStores = async () => {
    setIsLoadingStores(true);
    setError(null);
    try {
      const data = await storesApi.listStores();

      // If user is not global (e.g. cashier, manager, staff) filter to only assigned stores
      let accessibleStores = data;
      if (!isGlobal && user?.store_ids && user.store_ids.length > 0) {
        const allowedSet = new Set(user.store_ids);
        accessibleStores = data.filter((s) => allowedSet.has(s.id));
      }

      setStores(accessibleStores);

      // If branch is already determined for non-global user:
      // Case 1: activeStoreId is already validly set
      if (!isGlobal && activeStoreId && accessibleStores.some((s) => s.id === activeStoreId)) {
        toast(`Cabang Anda telah ditentukan (${activeStoreName}). Mengarahkan ke menu utama...`, 'info');
        navigate(targetMenu, { replace: true });
        return;
      }

      // Case 2: Only 1 store is accessible -> Auto-resolve and redirect immediately
      if (!isGlobal && accessibleStores.length === 1) {
        const onlyStore = accessibleStores[0];
        try {
          const termList = await storesApi.listTerminals(onlyStore.id);
          setActiveStore(onlyStore.id, onlyStore.name);

          if (user?.role === 'cashier') {
            const activeShift = await shiftsApi.getActiveShift();
            if (activeShift && activeShift.terminal_id) {
              const shiftTerm = termList.find((t) => t.id === activeShift.terminal_id);
              setActiveTerminal(activeShift.terminal_id, shiftTerm?.code || 'POS');
              navigate('/pos', { replace: true });
              return;
            }
            navigate('/select-terminal', { replace: true });
            return;
          }

          if (termList.length > 0) setActiveTerminal(termList[0].id, termList[0].code);

          toast(`Cabang operasional Anda: ${onlyStore.name}`, 'info');
          navigate(targetMenu, { replace: true });
          return;
        } catch (e) {
          console.warn('Auto configuration error:', e);
        }
      }

      // If more than 1 store or global user
      if (accessibleStores.length === 1) {
        setSelectedStore(accessibleStores[0]);
      } else if (activeStoreId) {
        const current = accessibleStores.find((s) => s.id === activeStoreId);
        if (current) setSelectedStore(current);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat daftar cabang';
      setError(msg);
    } finally {
      setIsLoadingStores(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, [user]);

  useEffect(() => {
    if (!selectedStore) {
      setTerminals([]);
      setSelectedTerminal(null);
      return;
    }

    async function loadStoreDetails(storeId: string) {
      setIsLoadingDetails(true);
      try {
        const termList = await storesApi.listTerminals(storeId);
        setTerminals(termList);

        if (termList.length > 0) setSelectedTerminal(termList[0]);
      } catch {
        // ignore
      } finally {
        setIsLoadingDetails(false);
      }
    }

    loadStoreDetails(selectedStore.id);
  }, [selectedStore]);

  const handleConfirm = () => {
    if (!selectedStore) {
      toast('Silakan pilih cabang terlebih dahulu.', 'warning');
      return;
    }

    setActiveStore(selectedStore.id, selectedStore.name);

    if (selectedTerminal) {
      setActiveTerminal(selectedTerminal.id, selectedTerminal.code);
    }

    toast(`Cabang aktif diubah ke: ${selectedStore.name}`, 'success');

    if (user?.role === 'cashier') {
      navigate('/select-terminal');
    } else {
      navigate(targetMenu);
    }
  };

  if (isLoadingStores) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <LoadingState message="Memuat daftar cabang operasional..." type="card" rows={2} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <ErrorState title="Gagal Memuat Cabang" message={error} onRetry={loadStores} />
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4">
        <div className="bg-white border-2 border-amber-300 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-amber-100 border-2 border-amber-300 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-700">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Akses Cabang Belum Diberikan</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 font-medium">
            Akun Anda ({user?.username} - Role: {user?.role}) belum memiliki cabang penugasan resmi. Hubungi Administrator atau Owner toko untuk mendaftarkan penempatan cabang Anda.
          </p>
          <Button
            variant="outline"
            size="md"
            leftIcon={<LogOut className="w-4 h-4" />}
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full text-rose-600 border-rose-300 hover:bg-rose-50"
          >
            Keluar dari Akun
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="text-center mb-8">
        {!isGlobal && user?.store_ids && user.store_ids.length > 1 && (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-black text-amber-800 mb-3 shadow-xs">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Dibatasi pada {stores.length} Cabang Penugasan Anda</span>
          </div>
        )}
        <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-300 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-700 shadow-sm">
          <Building className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Pilih Cabang Operasional
        </h1>
        <p className="text-base font-semibold text-slate-600 mt-1.5">
          Tentukan cabang toko dan terminal register yang akan digunakan sesi ini
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Select Store */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900">
            <StoreIcon className="w-6 h-6 text-emerald-600" />
            <span>1. Pilih Cabang Toko</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stores.map((s) => {
              const isSelected = selectedStore?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStore(s)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-extrabold text-base sm:text-lg text-slate-900">{s.name}</div>
                      <div className="text-sm font-mono font-bold text-slate-600 mt-1">{s.code}</div>
                    </div>
                    {isSelected && (
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  {s.address && (
                    <div className="text-xs sm:text-sm font-medium text-slate-600 mt-3 line-clamp-2">
                      {s.address}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Terminal & Warehouse */}
        {selectedStore && (
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in duration-200">
            {/* Terminal register */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900">
                <Monitor className="w-6 h-6 text-sky-600" />
                <span>2. Pilih Terminal POS / Register</span>
              </div>

              {isLoadingDetails ? (
                <div className="text-base text-slate-600 py-3 font-semibold">Memuat terminal...</div>
              ) : terminals.length === 0 ? (
                <div className="text-sm text-slate-700 font-medium bg-slate-100 p-4 rounded-xl border border-slate-200">
                  Tidak ada terminal register aktif untuk cabang ini. (Terminal virtual default akan digunakan).
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {terminals.map((t) => {
                    const isSelected = selectedTerminal?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTerminal(t)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-sky-50 border-sky-600 text-sky-950 shadow-md ring-2 ring-sky-500/20'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-extrabold text-base text-slate-900">{t.name}</div>
                            <div className="text-sm font-mono font-bold text-slate-600 mt-0.5">{t.code}</div>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        <Button
          variant="primary"
          size="xl"
          rightIcon={<ArrowRight className="w-6 h-6" />}
          disabled={!selectedStore}
          onClick={handleConfirm}
          className="w-full text-lg sm:text-xl py-4 sm:py-5 shadow-xl shadow-emerald-700/20"
        >
          Konfirmasi & Mulai Bekerja
        </Button>
      </div>
    </div>
  );
};
