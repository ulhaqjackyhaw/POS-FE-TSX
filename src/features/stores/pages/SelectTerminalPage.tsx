import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { terminalsApi } from '../../../api/terminals.api';
import { shiftsApi } from '../../../api/shifts.api';
import { storesApi } from '../../../api/stores.api';
import { Terminal, Shift, Store } from '../../../types/store';
import { useAppContextStore } from '../../../stores/app-context.store';
import { useShiftStore } from '../../../stores/shift.store';
import { isGlobalRole } from '../../../utils/roleNavigation';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { useToast } from '../../../components/feedback/Toast';
import {
  Monitor,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Building2,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

export const SelectTerminalPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    activeStoreId,
    activeStoreName,
    activeTerminalId,
    setActiveTerminal,
    setActiveStore,
    user,
    logout,
  } = useAppContextStore();
  const { setActiveShift } = useShiftStore();

  const isGlobal = isGlobalRole(user?.role);
  const userAssignedStoreId = !isGlobal && user?.store_ids && user.store_ids.length > 0 ? user.store_ids[0] : null;

  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [activeUserShift, setActiveUserShift] = useState<Shift | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied'>('all');
  const [isSelecting, setIsSelecting] = useState<string | null>(null);

  // Auto-resolve branch for manager ke bawah if not yet synced with user.store_ids
  useEffect(() => {
    let isMounted = true;
    async function syncAssignedBranch() {
      // If manager ke bawah, branch MUST be userAssignedStoreId
      if (!isGlobal && userAssignedStoreId) {
        if (!activeStoreId || activeStoreId !== userAssignedStoreId || !activeStoreName) {
          try {
            const storeData = await storesApi.getStore(userAssignedStoreId);
            if (isMounted) {
              setActiveStore(storeData.id, storeData.name);
              setCurrentStore(storeData);
            }
          } catch (e) {
            console.warn('Sync store error in SelectTerminalPage:', e);
          }
        }
      }
    }
    syncAssignedBranch();
    return () => {
      isMounted = false;
    };
  }, [userAssignedStoreId, activeStoreId, activeStoreName, isGlobal, setActiveStore]);

  // Load stores list (for global roles dropdown or active store lookup)
  useEffect(() => {
    let isMounted = true;
    async function loadStores() {
      try {
        const storeList = await storesApi.listStores();
        if (isMounted) {
          setStores(storeList);
          const effectiveId = userAssignedStoreId || activeStoreId;
          if (effectiveId) {
            const found = storeList.find((s) => s.id === effectiveId);
            if (found) setCurrentStore(found);
          }
        }
      } catch (e) {
        console.warn('Load stores error in SelectTerminalPage:', e);
      }
    }
    loadStores();
    return () => {
      isMounted = false;
    };
  }, [userAssignedStoreId, activeStoreId]);

  const loadData = async () => {
    const targetStoreId = userAssignedStoreId || activeStoreId;
    if (!targetStoreId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [termList, shift] = await Promise.all([
        terminalsApi.listTerminals({ store_id: targetStoreId }),
        shiftsApi.getActiveShift(),
      ]);

      // For manager ke bawah: strictly filter to ONLY terminals belonging to targetStoreId
      const branchOnlyTerminals = !isGlobal
        ? termList.filter((t) => t.store_id === targetStoreId)
        : termList;

      setTerminals(branchOnlyTerminals);
      setActiveUserShift(shift);
      if (shift) {
        setActiveShift(shift);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat status terminal POS';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userAssignedStoreId, activeStoreId]);

  const handleGlobalStoreChange = (newStoreId: string) => {
    const st = stores.find((s) => s.id === newStoreId);
    if (st) {
      setActiveStore(st.id, st.name);
      setCurrentStore(st);
      toast(`Cabang dialihkan ke: ${st.name}`, 'info');
    }
  };

  const filteredTerminals = useMemo(() => {
    return terminals.filter((t) => {
      const matchesSearch =
        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.cashier_name && t.cashier_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.active_cashier_name && t.active_cashier_name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'available') {
        return !t.has_active_shift && t.is_active;
      }
      if (statusFilter === 'occupied') {
        return t.has_active_shift;
      }
      return true;
    });
  }, [terminals, searchQuery, statusFilter]);

  const availableCount = terminals.filter((t) => !t.has_active_shift && t.is_active).length;
  const occupiedCount = terminals.filter((t) => t.has_active_shift).length;

  const handleSelectTerminal = async (term: Terminal) => {
    if (term.has_active_shift) {
      toast(
        `Terminal ${term.code} sedang aktif digunakan oleh kasir lain (${
          term.active_cashier_name || term.active_cashier_username || 'Kasir Aktif'
        }). Anda hanya dapat memilih terminal yang tidak aktif.`,
        'warning'
      );
      return;
    }

    if (!term.is_active) {
      toast(`Terminal ${term.code} sedang non-aktif/maintenance.`, 'warning');
      return;
    }

    try {
      setIsSelecting(term.id);
      setActiveTerminal(term.id, term.code);
      toast(`Terminal ${term.code} (${term.name}) berhasil dipilih. Mengarahkan ke kasir...`, 'success');
      navigate('/pos', { replace: true });
    } catch {
      toast('Gagal mengatur terminal aktif', 'error');
    } finally {
      setIsSelecting(null);
    }
  };

  const handleResumeActiveShift = () => {
    if (!activeUserShift) return;
    const term = terminals.find((t) => t.id === activeUserShift.terminal_id);
    if (term) {
      setActiveTerminal(term.id, term.code);
    }
    toast('Melanjutkan sesi kasir Anda...', 'info');
    navigate('/pos', { replace: true });
  };

  const effectiveStoreName =
    currentStore?.name || activeStoreName || (userAssignedStoreId ? 'Cabang Penugasan' : 'Cabang Utama');

  if (!activeStoreId && !userAssignedStoreId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-2xl border-2 border-slate-200">
          <Building2 className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Cabang Belum Ditentukan</h2>
          <p className="text-sm text-slate-600 mt-2 mb-6">
            Akun Anda belum memiliki cabang penugasan aktif. Silakan hubungi Administrator atau Store Manager.
          </p>
          {isGlobal ? (
            <Button
              variant="primary"
              onClick={() => navigate('/select-store')}
              className="w-full"
            >
              Pilih Cabang Toko
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full"
            >
              Keluar & Ganti Akun
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100">Pilih POS Kasir</h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Shift Mandiri
              </span>
            </div>

            {/* Branch badge / selector */}
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {isGlobal ? (
                /* Global roles (Owner/Auditor) can toggle branch view */
                <div className="relative inline-flex items-center">
                  <select
                    value={activeStoreId || ''}
                    onChange={(e) => handleGlobalStoreChange(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-xs font-semibold text-emerald-300 rounded-lg px-2.5 py-1 pr-7 appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        Cabang: {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-emerald-400 absolute right-2 pointer-events-none" />
                </div>
              ) : (
                /* Manager down: Locked strictly to their assigned branch */
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 font-semibold text-xs">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Cabang: <strong>{effectiveStoreName}</strong></span>
                  <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-900/50 px-1 rounded">
                    Terkunci
                  </span>
                </div>
              )}
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="hidden sm:inline">Kasir: <strong className="text-slate-200 font-semibold">{user?.full_name || user?.username}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Refresh Status
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            leftIcon={<LogOut className="w-4 h-4 text-rose-400" />}
            className="border-slate-700 text-rose-400 hover:bg-rose-950/30"
          >
            Keluar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* Active Shift Notice if cashier already has an active shift */}
        {activeUserShift && (
          <div className="bg-gradient-to-r from-emerald-950/70 to-teal-950/70 border-2 border-emerald-500/50 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-emerald-950/40">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-emerald-200 flex items-center gap-2">
                  <span>Anda Sudah Memiliki Shift Aktif</span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    OPEN
                  </span>
                </h2>
                <p className="text-xs text-emerald-300/80 mt-1 leading-relaxed">
                  Sesi kasir Anda masih berjalan. Anda dapat langsung melanjutkan transaksi penjualan di terminal yang sedang aktif.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleResumeActiveShift}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 w-full sm:w-auto"
            >
              Lanjutkan ke Kasir POS
            </Button>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  Daftar Terminal Kasir ({effectiveStoreName})
                </h2>
                {!isGlobal && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Khusus Cabang Ini
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Pilih meja kasir yang <strong className="text-emerald-400 font-semibold">TIDAK AKTIF / KOSONG</strong> untuk memulai sesi shift Anda. Terminal yang sedang aktif tidak dapat dimasuki untuk mencegah konflik transaksi.
              </p>
            </div>

            {/* Quick Status Stats */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-center">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Tersedia</span>
                <span className="text-lg font-black text-emerald-300">{availableCount}</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-amber-950/40 border border-amber-800/60 text-center">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Digunakan</span>
                <span className="text-lg font-black text-amber-300">{occupiedCount}</span>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 pt-5 border-t border-slate-800/80">
            <input
              type="text"
              placeholder={`Cari kode/nama terminal di ${effectiveStoreName}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-slate-100 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua ({terminals.length})
              </button>
              <button
                onClick={() => setStatusFilter('available')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'available'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                Tersedia ({availableCount})
              </button>
              <button
                onClick={() => setStatusFilter('occupied')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'occupied'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                Digunakan ({occupiedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Terminal Cards Grid */}
        {isLoading ? (
          <div className="py-12">
            <LoadingState message={`Memeriksa status terminal POS kasir di ${effectiveStoreName}...`} />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : filteredTerminals.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 p-8">
            <Monitor className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">Tidak Ada Terminal Ditemukan di {effectiveStoreName}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Tidak ada terminal yang sesuai dengan pencarian Anda.'
                : `Belum ada terminal POS yang terdaftar di cabang ${effectiveStoreName}. Silakan hubungi Store Manager.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTerminals.map((term) => {
              const isOccupied = term.has_active_shift;
              const isAvailable = !isOccupied && term.is_active;
              const isAssignedToCurrent = term.assigned_cashier_id === user?.id;
              const isCurrentlySelected = activeTerminalId === term.id;

              return (
                <div
                  key={term.id}
                  className={`relative flex flex-col justify-between rounded-2xl p-5 border-2 transition-all duration-200 ${
                    isOccupied
                      ? 'bg-slate-900/60 border-slate-800 opacity-90'
                      : isAvailable
                      ? isAssignedToCurrent
                        ? 'bg-slate-900/90 border-emerald-500 shadow-lg shadow-emerald-950/20 hover:border-emerald-400'
                        : 'bg-slate-900/90 border-slate-700/80 hover:border-emerald-500/70 hover:shadow-md'
                      : 'bg-slate-900/40 border-slate-800 opacity-60'
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isOccupied
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                            : isAvailable
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-800 border border-slate-700 text-slate-500'
                        }`}
                      >
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-base text-slate-100">{term.code}</span>
                          {isCurrentlySelected && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              Terpilih
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">{term.name}</p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    {isOccupied ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800/80 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        Aktif Digunakan
                      </span>
                    ) : isAvailable ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Tidak Aktif / Kosong
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                        Non-Aktif
                      </span>
                    )}
                  </div>

                  {/* Cashier Assignment / Occupancy info */}
                  <div className="my-3 space-y-2 text-xs">
                    {isOccupied ? (
                      <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-200">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>Sedang Dipakai Kasir:</span>
                        </div>
                        <div className="mt-1 text-slate-300 pl-5">
                          <span className="font-bold text-rose-300">
                            {term.active_cashier_name || term.active_cashier_username || 'Kasir Lain'}
                          </span>
                        </div>
                        <p className="text-[10px] text-rose-300/70 mt-1 pl-5">
                          Terminal terkunci selama sesi kasir lain berlangsung.
                        </p>
                      </div>
                    ) : isAvailable ? (
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                        {isAssignedToCurrent ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Terminal Penugasan Anda</span>
                          </div>
                        ) : term.cashier_name ? (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                            <span>Kasir Terjadwal: <strong className="text-slate-300">{term.cashier_name}</strong></span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Siap digunakan untuk buka shift kasir baru.</span>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-500">
                          Bebas digunakan & tidak ada shift yang bertabrakan di {effectiveStoreName}.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400">
                        <AlertCircle className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                        Terminal dinonaktifkan oleh administrator.
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    {isOccupied ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        leftIcon={<Lock className="w-4 h-4 text-slate-500" />}
                        className="w-full border-slate-800 text-slate-500 bg-slate-900/50 cursor-not-allowed justify-center"
                      >
                        Terminal Sedang Digunakan
                      </Button>
                    ) : isAvailable ? (
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isSelecting === term.id}
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                        onClick={() => handleSelectTerminal(term)}
                        className={`w-full justify-center ${
                          isAssignedToCurrent
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold'
                            : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                        }`}
                      >
                        {isAssignedToCurrent ? 'Masuk Terminal Saya' : 'Pilih & Masuk Terminal'}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="w-full border-slate-800 text-slate-600 bg-slate-900/30 cursor-not-allowed justify-center"
                      >
                        Tidak Tersedia
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Guidance Footer */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-400">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <p>
            <strong>Isolasi Cabang & Kasir:</strong> Untuk peran operasional (Manager, Supervisor, Kasir), daftar terminal terkunci hanya pada cabang <strong>{effectiveStoreName}</strong>. Setiap terminal hanya dapat digunakan oleh 1 kasir dalam satu waktu.
          </p>
        </div>
      </main>
    </div>
  );
};
