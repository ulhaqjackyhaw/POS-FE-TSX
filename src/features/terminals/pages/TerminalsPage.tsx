import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { terminalsApi } from '../../../api/terminals.api';
import { storesApi } from '../../../api/stores.api';
import { usersApi } from '../../../api/users.api';
import { Terminal, Store } from '../../../types/store';
import { UserDetail } from '../../../types/auth';
import { useAppContextStore } from '../../../stores/app-context.store';
import { usePermission } from '../../../hooks/usePermission';
import { isGlobalRole } from '../../../utils/roleNavigation';
import { useToast } from '../../../components/feedback/Toast';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Dialog } from '../../../components/ui/Dialog';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import {
  Monitor,
  PlusCircle,
  Search,
  Building2,
  User,
  CheckCircle2,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  ShoppingBag,
  Lock,
  X,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

export const TerminalsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeStoreId, activeStoreName, setActiveTerminal, setActiveStore } =
    useAppContextStore();
  const { userRole } = usePermission();
  const isGlobal = isGlobalRole(userRole);
  const isManager = !isGlobal; // Manager ke bawah locked to their assigned branch
  const { toast } = useToast();

  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [cashiers, setCashiers] = useState<UserDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [cashierFilter, setCashierFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStoreId, setCreateStoreId] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createCashierId, setCreateCashierId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);
  const [editName, setEditName] = useState('');
  const [editCashierId, setEditCashierId] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [termList, storeList, userList] = await Promise.all([
        terminalsApi.listTerminals(),
        storesApi.listStores(),
        usersApi.listUsers({ role: 'cashier' }).catch(() => [] as UserDetail[]),
      ]);

      let finalTermList = termList;
      let finalStoreList = storeList;
      let finalCashierList = userList;

      // Restrict role manager ke bawah strictly to their assigned branch
      if (!isGlobal && activeStoreId) {
        finalTermList = termList.filter((t) => t.store_id === activeStoreId);
        finalStoreList = storeList.filter((s) => s.id === activeStoreId);
        finalCashierList = userList.filter(
          (u) => !u.store_ids || u.store_ids.length === 0 || u.store_ids.includes(activeStoreId)
        );
        setStoreFilter(activeStoreId);
      }

      setTerminals(finalTermList);
      setStores(finalStoreList);
      setCashiers(finalCashierList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data master terminal POS';
      toast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Terminals
  const filteredTerminals = useMemo(() => {
    return terminals.filter((t) => {
      const matchesSearch =
        !search.trim() ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase()) ||
        (t.cashier_name && t.cashier_name.toLowerCase().includes(search.toLowerCase())) ||
        (t.store_name && t.store_name.toLowerCase().includes(search.toLowerCase()));

      const matchesStore = storeFilter === 'all' || t.store_id === storeFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && t.is_active) ||
        (statusFilter === 'inactive' && !t.is_active);

      const matchesCashier =
        cashierFilter === 'all' ||
        (cashierFilter === 'assigned' && !!t.assigned_cashier_id) ||
        (cashierFilter === 'unassigned' && !t.assigned_cashier_id);

      return matchesSearch && matchesStore && matchesStatus && matchesCashier;
    });
  }, [terminals, search, storeFilter, statusFilter, cashierFilter]);

  // Metrics
  const stats = useMemo(() => {
    const total = terminals.length;
    const active = terminals.filter((t) => t.is_active).length;
    const assigned = terminals.filter((t) => !!t.assigned_cashier_id).length;
    const storeCount = new Set(terminals.map((t) => t.store_id)).size;
    return { total, active, assigned, storeCount };
  }, [terminals]);

  // Cashiers eligible for selected store
  const getCashiersForStore = (storeId: string) => {
    if (!storeId) return cashiers;
    return cashiers.filter(
      (c) =>
        !c.store_ids ||
        c.store_ids.length === 0 ||
        c.store_ids.includes(storeId) ||
        (c.stores && c.stores.some((s) => s.id === storeId))
    );
  };

  const handleOpenCreate = () => {
    const defaultStore = isManager && activeStoreId
      ? activeStoreId
      : stores.length > 0
        ? stores[0].id
        : '';

    setCreateStoreId(defaultStore);
    const storeObj = stores.find((s) => s.id === defaultStore);
    const storeCode = storeObj ? storeObj.code.replace('STORE-', '') : '01';
    const nextNum = (terminals.filter((t) => t.store_id === defaultStore).length + 1)
      .toString()
      .padStart(2, '0');

    setCreateCode(`TERM-${nextNum}-${storeCode}`);
    setCreateName(`Register Kasir ${nextNum}`);
    setCreateCashierId('');
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createStoreId) {
      setCreateError('Pilih cabang toko terlebih dahulu.');
      return;
    }
    if (!createCode.trim() || !createName.trim()) {
      setCreateError('Kode dan nama terminal wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const created = await terminalsApi.createTerminal({
        store_id: createStoreId,
        code: createCode.trim().toUpperCase(),
        name: createName.trim(),
        assigned_cashier_id: createCashierId || null,
      });

      toast(`Terminal POS "${created.name}" (${created.code}) berhasil ditambahkan!`, 'success');
      setIsCreateOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan terminal POS';
      setCreateError(msg);
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (t: Terminal) => {
    setEditingTerminal(t);
    setEditName(t.name);
    setEditCashierId(t.assigned_cashier_id || '');
    setEditIsActive(t.is_active);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerminal) return;
    if (!editName.trim()) {
      setEditError('Nama terminal wajib diisi.');
      return;
    }

    setIsEditSubmitting(true);
    setEditError(null);

    try {
      const updated = await terminalsApi.updateTerminal(editingTerminal.id, {
        name: editName.trim(),
        is_active: editIsActive,
        assigned_cashier_id: editCashierId || null,
      });

      toast(`Terminal POS "${updated.name}" berhasil diperbarui!`, 'success');
      setIsEditOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui terminal POS';
      setEditError(msg);
      toast(msg, 'error');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleToggleStatus = async (t: Terminal) => {
    try {
      await terminalsApi.updateTerminal(t.id, {
        name: t.name,
        is_active: !t.is_active,
        assigned_cashier_id: t.assigned_cashier_id,
      });
      toast(`Terminal ${t.code} berhasil ${!t.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status terminal';
      toast(msg, 'error');
    }
  };

  const handleDelete = async (t: Terminal) => {
    if (!window.confirm(`Yakin ingin menghapus atau menonaktifkan terminal POS "${t.name}" (${t.code})?`)) {
      return;
    }
    try {
      await terminalsApi.deleteTerminal(t.id);
      toast(`Terminal POS ${t.code} berhasil diproses`, 'success');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus terminal';
      toast(msg, 'error');
    }
  };

  const handleLaunchPos = (t: Terminal) => {
    if (t.store_id) {
      const storeObj = stores.find((s) => s.id === t.store_id);
      setActiveStore(t.store_id, storeObj ? storeObj.name : t.store_name || 'Cabang Aktif');
    }
    setActiveTerminal(t.id, t.code);
    toast(`Menggunakan terminal register: ${t.code}`, 'info');
    navigate('/pos');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-100 text-sky-700 rounded-2xl shadow-xs">
              <Monitor className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {isManager ? `Master POS Cabang (${activeStoreName || 'Cabang Anda'})` : 'Master Data Terminal POS'}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-0.5 font-medium">
                Kelola terminal register kasir. 1 Terminal POS dapat dikaitkan dengan 1 akun kasir spesifik.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="md"
            onClick={loadData}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            className="font-bold border-2 border-slate-200"
          >
            Segarkan
          </Button>

          <Button
            variant="primary"
            size="lg"
            leftIcon={<PlusCircle className="w-5 h-5" />}
            onClick={handleOpenCreate}
            className="font-bold shadow-md bg-sky-600 hover:bg-sky-700 focus:ring-sky-500"
          >
            + Tambah Terminal POS
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Terminal POS</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
            <Monitor className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Terminal Aktif</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kasir Tertugas</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">{stats.assigned}</div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cabang Toko</div>
            <div className="text-2xl font-black text-purple-700 mt-1">{stats.storeCount}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode terminal, nama register, kasir tertugas, atau cabang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Store Filter (Global role can filter, manager down is locked to assigned store) */}
          {isGlobal ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap hidden sm:inline">
                Cabang:
              </span>
              <select
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="all">Semua Cabang Toko</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-700">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Cabang: <strong>{activeStoreName || 'Cabang Penugasan'}</strong></span>
              <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                Terkunci
              </span>
            </div>
          )}

          {/* Cashier Assignment Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap hidden sm:inline">
              Penugasan:
            </span>
            <select
              value={cashierFilter}
              onChange={(e) => setCashierFilter(e.target.value as 'all' | 'assigned' | 'unassigned')}
              className="px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="all">Semua Terminal</option>
              <option value="assigned">Kasir Sudah Ditugaskan</option>
              <option value="unassigned">Belum Ada Kasir</option>
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-slate-700 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nonaktif
            </button>
          </div>
        </div>
      </div>

      {/* Terminals Grid */}
      {isLoading ? (
        <LoadingState message="Memuat data master terminal POS..." type="card" rows={3} />
      ) : filteredTerminals.length === 0 ? (
        <EmptyState
          icon={<Monitor className="w-12 h-12 text-slate-400" />}
          title="Tidak Ada Terminal POS"
          description={
            search || storeFilter !== 'all' || statusFilter !== 'all' || cashierFilter !== 'all'
              ? 'Tidak ada terminal POS yang cocok dengan kriteria filter Anda.'
              : 'Belum ada terminal POS yang terdaftar pada cabang ini.'
          }
          actionLabel="+ Tambah Terminal POS Sekarang"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTerminals.map((t) => {
            const hasCashier = !!t.assigned_cashier_id;
            return (
              <div
                key={t.id}
                className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top: Code & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-lg text-xs font-mono font-bold text-sky-800">
                        <Monitor className="w-3.5 h-3.5 text-sky-600" />
                        <span>{t.code}</span>
                      </div>
                      <h3 className="font-black text-lg text-slate-900 mt-1.5 leading-snug">
                        {t.name}
                      </h3>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                        t.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${t.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {t.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  {/* Store info */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate">
                      {t.store_name || 'Cabang Utama'} {t.store_code ? `(${t.store_code})` : ''}
                    </span>
                  </div>

                  {/* Assigned Cashier Box (1 Terminal = 1 Kasir) */}
                  <div className="p-3.5 rounded-2xl border-2 transition-all bg-gradient-to-br from-slate-50 to-white border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        1 Terminal POS : 1 Kasir
                      </span>
                      {hasCashier ? (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                          Tertugas
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          Siap Ditugaskan
                        </span>
                      )}
                    </div>

                    {hasCashier ? (
                      <div className="flex items-center gap-2.5 mt-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm border border-indigo-200">
                          {t.cashier_name ? t.cashier_name[0].toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                        <div className="truncate">
                          <div className="text-sm font-extrabold text-slate-900 truncate">
                            {t.cashier_name || 'Kasir Terdaftar'}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            @{t.cashier_username || 'kasir'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 mt-1 leading-snug">
                        Belum ada kasir spesifik yang dikaitkan. Kasir cabang ini dapat memilih register ini saat buka shift.
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 mt-4 border-t-2 border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<ShoppingBag className="w-4 h-4" />}
                    onClick={() => handleLaunchPos(t)}
                    className="font-bold text-xs bg-sky-600 hover:bg-sky-700"
                  >
                    Buka Kasir POS
                  </Button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
                      title="Ubah & Penugasan Kasir"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(t)}
                      className={`p-2 rounded-xl transition-colors ${
                        t.is_active
                          ? 'text-emerald-600 hover:text-amber-600 hover:bg-amber-50'
                          : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={t.is_active ? 'Nonaktifkan Terminal' : 'Aktifkan Terminal'}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(t)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Hapus Terminal POS"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Tambah Terminal POS */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Daftarkan Terminal POS Baru"
        description="Tambahkan register kasir baru dan tautkan ke cabang toko serta akun kasir bertugas."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="ghost" size="lg" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              onClick={handleCreate}
              className="font-bold bg-sky-600 hover:bg-sky-700"
            >
              Simpan Terminal POS
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-sm font-bold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{createError}</span>
            </div>
          )}

          {/* Cabang Toko */}
          {isManager ? (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Cabang Toko Terkunci
                </div>
                <div className="text-base font-black text-emerald-950 mt-0.5">
                  {activeStoreName || 'Cabang Manager'}
                </div>
              </div>
              <Lock className="w-5 h-5 text-emerald-700" />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Pilih Cabang Toko *
              </label>
              <select
                value={createStoreId}
                onChange={(e) => {
                  const sId = e.target.value;
                  setCreateStoreId(sId);
                  const storeObj = stores.find((s) => s.id === sId);
                  const storeCode = storeObj ? storeObj.code.replace('STORE-', '') : '01';
                  const nextNum = (terminals.filter((t) => t.store_id === sId).length + 1)
                    .toString()
                    .padStart(2, '0');
                  setCreateCode(`TERM-${nextNum}-${storeCode}`);
                  setCreateName(`Register Kasir ${nextNum}`);
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-sky-500 cursor-pointer"
                required
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kode Terminal Register *
              </label>
              <Input
                type="text"
                placeholder="Contoh: TERM-02-JKT"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Terminal Register *
              </label>
              <Input
                type="text"
                placeholder="Contoh: Kasir Meja Depan 2"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Penugasan Kasir (1 Terminal = 1 Kasir) */}
          <div className="pt-2 border-t-2 border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                👤 Penugasan Akun Kasir (1 Terminal = 1 Kasir)
              </label>
              <span className="text-[11px] font-bold text-slate-500">Opsional</span>
            </div>
            <p className="text-xs text-slate-500 mb-2 font-medium">
              Pilih akun staf kasir yang ditugaskan khusus untuk terminal register ini saat buka shift.
            </p>

            <select
              value={createCashierId}
              onChange={(e) => setCreateCashierId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="">-- Tanpa Penugasan Tetap (Dapat Digunakan Bergantian) --</option>
              {getCashiersForStore(createStoreId).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} (@{c.username})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Dialog>

      {/* Modal: Ubah Terminal POS */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Ubah Terminal POS: ${editingTerminal?.code || ''}`}
        description="Perbarui nama register, status operasional, atau ganti akun kasir yang ditugaskan."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="ghost" size="lg" onClick={() => setIsEditOpen(false)} disabled={isEditSubmitting}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="lg"
              isLoading={isEditSubmitting}
              onClick={handleEdit}
              className="font-bold bg-sky-600 hover:bg-sky-700"
            >
              Simpan Perubahan
            </Button>
          </div>
        }
      >
        <form onSubmit={handleEdit} className="space-y-4">
          {editError && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-sm font-bold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{editError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kode Terminal (Terkunci)
            </label>
            <Input type="text" value={editingTerminal?.code || ''} disabled className="bg-slate-100 font-mono font-bold" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Terminal Register *
            </label>
            <Input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </div>

          {/* Penugasan Kasir */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
              👤 Penugasan Akun Kasir (1 Terminal = 1 Kasir)
            </label>
            <select
              value={editCashierId}
              onChange={(e) => setEditCashierId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="">-- Tanpa Penugasan Tetap (Dapat Digunakan Bergantian) --</option>
              {getCashiersForStore(editingTerminal?.store_id || '').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} (@{c.username})
                </option>
              ))}
            </select>
          </div>

          {/* Status Switch */}
          <div className="pt-3 border-t-2 border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">Status Operasional Terminal</div>
              <div className="text-xs text-slate-500">Terminal aktif dapat digunakan untuk shift kasir dan transaksi POS.</div>
            </div>
            <button
              type="button"
              onClick={() => setEditIsActive(!editIsActive)}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors ${
                editIsActive ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${
                  editIsActive ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
