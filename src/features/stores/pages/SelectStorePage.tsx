import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storesApi } from '../../../api/stores.api';
import { Store, Terminal, Warehouse } from '../../../types/store';
import { useAppContextStore } from '../../../stores/app-context.store';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { useToast } from '../../../components/feedback/Toast';
import { Store as StoreIcon, Monitor, Warehouse as WarehouseIcon, ArrowRight, Building, Check } from 'lucide-react';

export const SelectStorePage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveStore, setActiveTerminal, setActiveWarehouse, user } = useAppContextStore();
  const { toast } = useToast();

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStores = async () => {
    setIsLoadingStores(true);
    setError(null);
    try {
      const data = await storesApi.listStores();
      setStores(data);
      if (data.length === 1) {
        setSelectedStore(data[0]);
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
  }, []);

  useEffect(() => {
    if (!selectedStore) {
      setTerminals([]);
      setWarehouses([]);
      setSelectedTerminal(null);
      setSelectedWarehouse(null);
      return;
    }

    async function loadStoreDetails(storeId: string) {
      setIsLoadingDetails(true);
      try {
        const [termList, whList] = await Promise.all([
          storesApi.listTerminals(storeId),
          storesApi.listWarehouses(storeId),
        ]);
        setTerminals(termList);
        setWarehouses(whList);

        if (termList.length > 0) setSelectedTerminal(termList[0]);
        if (whList.length > 0) setSelectedWarehouse(whList[0]);
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

    if (selectedWarehouse) {
      setActiveWarehouse(selectedWarehouse.id);
    }

    toast(`Cabang aktif diubah ke: ${selectedStore.name}`, 'success');

    if (user?.role === 'cashier') {
      navigate('/shifts');
    } else {
      navigate('/pos');
    }
  };

  if (isLoadingStores) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <LoadingState message="Memuat daftar cabang..." type="card" rows={2} />
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

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="text-center mb-8">
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

            {/* Warehouse */}
            <div className="space-y-4 pt-5 border-t-2 border-slate-200">
              <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900">
                <WarehouseIcon className="w-6 h-6 text-purple-600" />
                <span>3. Gudang Penyimpanan Default</span>
              </div>

              {warehouses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {warehouses.map((w) => {
                    const isSelected = selectedWarehouse?.id === w.id;
                    return (
                      <div
                        key={w.id}
                        onClick={() => setSelectedWarehouse(w)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-50 border-purple-600 text-purple-950 shadow-md ring-2 ring-purple-500/20'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-extrabold text-base text-slate-900">{w.name}</div>
                            <div className="text-sm font-mono font-bold text-slate-600 mt-0.5">{w.code}</div>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-slate-700 font-medium bg-slate-100 p-4 rounded-xl border border-slate-200">
                  Gudang utama cabang otomatis digunakan.
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
