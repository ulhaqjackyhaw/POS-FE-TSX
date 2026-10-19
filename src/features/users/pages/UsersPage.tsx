import React, { useState, useEffect, useMemo } from 'react';
import { usersApi } from '../../../api/users.api';
import { storesApi } from '../../../api/stores.api';
import { UserDetail, Role } from '../../../types/auth';
import { Store } from '../../../types/store';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Dialog } from '../../../components/ui/Dialog';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../components/feedback/Toast';
import { usePermission } from '../../../hooks/usePermission';
import { useAppContextStore } from '../../../stores/app-context.store';
import {
  Users,
  UserPlus,
  Search,
  Building2,
  Shield,
  Edit2,
  Power,
  RefreshCw,
  X,
  AlertTriangle,
  UserCheck,
  CheckSquare,
  Square,
  ShoppingBag,
  Briefcase,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'role-cashier',
    code: 'cashier',
    name: 'Kasir (Cashier)',
    description: 'Akses register POS penjualan & buka/tutup shift kasir.',
  },
  {
    id: 'role-manager',
    code: 'store_manager',
    name: 'Store Manager',
    description: 'Kelola operasional toko, penyesuaian stok, dan approval transaksi.',
  },
  {
    id: 'role-supervisor',
    code: 'supervisor',
    name: 'Supervisor',
    description: 'Supervisi transaksi kasir dan otorisasi tindakan khusus.',
  },
  {
    id: 'role-inventory',
    code: 'inventory_staff',
    name: 'Staf Gudang (Inventory)',
    description: 'Penerimaan barang masuk, mutasi stok, dan transfer antargudang.',
  },
  {
    id: 'role-auditor',
    code: 'auditor',
    name: 'Auditor (Read-Only)',
    description: 'Akses pemantauan audit log dan laporan keuangan tanpa hak ubah.',
  },
];

export const UsersPage: React.FC = () => {
  const { check, isOwnerOrAdmin, userRole } = usePermission();
  const { user: currentUser, activeStoreId, activeStoreName } = useAppContextStore();
  const isManager = userRole === 'store_manager';
  const canManage = isOwnerOrAdmin || isManager || check('user.create') || check('user.update') || check('org:manage');
  const { toast } = useToast();

  const [users, setUsers] = useState<UserDetail[]>([]);
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subordinate roles allowed for store managers
  const SUBORDINATE_ROLES = ['cashier', 'inventory_staff', 'supervisor'];
  const selectableRoles = isManager
    ? roles.filter((r) => SUBORDINATE_ROLES.includes(r.code))
    : roles;

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Create User Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleCode, setRoleCode] = useState('cashier');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setUsername('');
    setFullName('');
    setEmail('');
    setPassword('');
    setRoleCode('cashier');
    if (isManager) {
      const defaultStoreIds =
        currentUser?.store_ids && currentUser.store_ids.length > 0
          ? currentUser.store_ids
          : activeStoreId
            ? [activeStoreId]
            : [];
      setSelectedStoreIds(defaultStoreIds);
    } else {
      setSelectedStoreIds([]);
    }
    setCreateError(null);
    setIsCreateOpen(true);
  };

  // Edit User Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDetail | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRoleCode, setEditRoleCode] = useState('');
  const [editStoreIds, setEditStoreIds] = useState<string[]>([]);
  const [editIsActive, setEditIsActive] = useState(true);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const results = await Promise.allSettled([
        usersApi.listUsers(),
        usersApi.listRoles(),
        storesApi.listStores(),
      ]);

      if (results[0].status === 'fulfilled' && results[0].value) {
        setUsers(results[0].value);
      } else {
        setUsers([]);
      }

      if (results[1].status === 'fulfilled' && results[1].value && results[1].value.length > 0) {
        setRoles(results[1].value);
      } else {
        setRoles(DEFAULT_ROLES);
      }

      if (results[2].status === 'fulfilled' && results[2].value) {
        setStores(results[2].value);
      } else {
        setStores([]);
      }
    } catch {
      setRoles(DEFAULT_ROLES);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search filter
      const matchesSearch =
        !search.trim() ||
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());

      // Role filter
      const matchesRole = roleFilter === 'all' || u.role_code === roleFilter;

      // Store placement filter
      const matchesStore =
        storeFilter === 'all' ||
        (u.store_ids && u.store_ids.includes(storeFilter)) ||
        (u.stores && u.stores.some((s) => s.id === storeFilter));

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.is_active) ||
        (statusFilter === 'inactive' && !u.is_active);

      return matchesSearch && matchesRole && matchesStore && matchesStatus;
    });
  }, [users, search, roleFilter, storeFilter, statusFilter]);

  // Metrics
  const stats = useMemo(() => {
    const total = users.length;
    const managers = users.filter((u) => u.role_code === 'store_manager').length;
    const cashiers = users.filter((u) => u.role_code === 'cashier').length;
    const active = users.filter((u) => u.is_active).length;
    return { total, managers, cashiers, active };
  }, [users]);

  // Handle Create User
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim() || !email.trim()) {
      setCreateError('Username, Nama Lengkap, dan Email wajib diisi.');
      return;
    }
    if (password.length < 6) {
      setCreateError('Password minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const newUser = await usersApi.createUser({
        username: username.trim().toLowerCase(),
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role_code: roleCode,
        store_ids: selectedStoreIds,
      });

      toast(`Akun pengguna "${newUser.full_name}" (@${newUser.username}) berhasil dibuat!`, 'success');
      setIsCreateOpen(false);
      setUsername('');
      setFullName('');
      setEmail('');
      setPassword('');
      setRoleCode('cashier');
      setSelectedStoreIds([]);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat pengguna baru';
      setCreateError(msg);
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit User Modal
  const openEdit = (u: UserDetail) => {
    setEditingUser(u);
    setEditFullName(u.full_name);
    setEditEmail(u.email);
    setEditPassword('');
    setEditRoleCode(u.role_code || 'cashier');
    setEditStoreIds(u.store_ids || (u.stores ? u.stores.map((s) => s.id) : []));
    setEditIsActive(u.is_active);
    setEditError(null);
    setIsEditOpen(true);
  };

  // Handle Edit User
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editFullName.trim() || !editEmail.trim()) {
      setEditError('Nama lengkap dan email wajib diisi.');
      return;
    }
    if (editPassword && editPassword.length < 6) {
      setEditError('Password baru minimal 6 karakter.');
      return;
    }

    setIsEditSubmitting(true);
    setEditError(null);

    try {
      const updated = await usersApi.updateUser(editingUser.id, {
        full_name: editFullName.trim(),
        email: editEmail.trim().toLowerCase(),
        password: editPassword || undefined,
        role_code: editRoleCode,
        is_active: editIsActive,
        store_ids: editStoreIds,
      });

      toast(`Akun "${updated.full_name}" berhasil diperbarui!`, 'success');
      setIsEditOpen(false);
      setEditingUser(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui pengguna';
      setEditError(msg);
      toast(msg, 'error');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Quick Toggle Status
  const handleToggleStatus = async (u: UserDetail) => {
    try {
      const newStatus = !u.is_active;
      await usersApi.toggleUserStatus(u.id, newStatus);
      toast(`Status akun "${u.full_name}" diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}`, 'info');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status pengguna';
      toast(msg, 'error');
    }
  };

  // Toggle Store Selection Helper
  const toggleStoreSelection = (storeId: string, currentList: string[], setter: (val: string[]) => void) => {
    if (currentList.includes(storeId)) {
      setter(currentList.filter((id) => id !== storeId));
    } else {
      setter([...currentList, storeId]);
    }
  };

  // Role Badge Styling Helper
  const getRoleBadge = (code?: string, name?: string) => {
    switch (code) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black">
            <Shield className="w-3.5 h-3.5 text-emerald-700" />
            {name || 'Owner / Admin'}
          </span>
        );
      case 'store_manager':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-xs font-black">
            <Briefcase className="w-3.5 h-3.5 text-purple-700" />
            {name || 'Store Manager'}
          </span>
        );
      case 'cashier':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black">
            <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
            {name || 'Kasir'}
          </span>
        );
      case 'supervisor':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-900 border border-sky-300 text-xs font-black">
            <Shield className="w-3.5 h-3.5 text-sky-700" />
            {name || 'Supervisor'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold">
            {name || code || 'Staff'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {isManager ? `Manajemen Staf (${activeStoreName || 'Cabang Anda'})` : 'Manajemen Pengguna & Staf'}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-0.5 font-medium">
                {isManager
                  ? 'Daftarkan dan kelola staf bawahan (Kasir, Staf Gudang, dan Supervisor) khusus untuk cabang toko Anda.'
                  : 'Buat dan kelola akun kasir, store manager, supervisor, serta kustomisasi penempatan cabang toko.'}
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

          {canManage && (
            <Button
              variant="primary"
              size="lg"
              leftIcon={<UserPlus className="w-5 h-5" />}
              onClick={handleOpenCreate}
              className="font-bold shadow-md bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
            >
              {isManager ? '+ Tambah Staf Bawahan' : '+ Tambah Pengguna Baru'}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Staf / Akun</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Store Manager</div>
            <div className="text-2xl font-black text-purple-700 mt-1">{stats.managers}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kasir (Cashier)</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.cashiers}</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Akun Aktif</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <UserCheck className="w-6 h-6" />
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
              placeholder="Cari nama lengkap, username, atau email staf..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
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

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap hidden sm:inline">
              Jabatan:
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Semua Jabatan</option>
              {roles.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Store Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap hidden sm:inline">
              Penempatan:
            </span>
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Semua Penempatan Cabang</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'active'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nonaktif
            </button>
          </div>
        </div>
      </div>

      {/* Main Table / List */}
      {isLoading ? (
        <LoadingState message="Memuat daftar staf & pengguna..." rows={5} />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title={search || roleFilter !== 'all' || storeFilter !== 'all' || statusFilter !== 'all' ? 'Staf Tidak Ditemukan' : 'Belum Ada Akun Staf'}
          description={
            search || roleFilter !== 'all' || storeFilter !== 'all' || statusFilter !== 'all'
              ? 'Tidak ada akun pengguna yang sesuai dengan kriteria filter atau pencarian Anda.'
              : 'Tambahkan akun manajer toko dan kasir untuk mulai mendelegasikan operasional sistem POS.'
          }
          actionLabel={canManage ? 'Tambah Pengguna Baru' : undefined}
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-xs font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-5">Nama & Profil Staf</th>
                  <th className="py-4 px-5">Jabatan / Role</th>
                  <th className="py-4 px-5">Kustomisasi Penempatan Cabang</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100 text-sm font-medium text-slate-800">
                {filteredUsers.map((u) => {
                  const initials = u.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  const userStoreList = u.stores && u.stores.length > 0
                    ? u.stores
                    : stores.filter((s) => u.store_ids && u.store_ids.includes(s.id));

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Name & Username */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center shrink-0 shadow-sm text-sm">
                            {initials || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                              <span>{u.full_name}</span>
                              <span className="font-mono text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                                @{u.username}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-normal mt-0.5">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-5">
                        {getRoleBadge(u.role_code, u.role_name)}
                      </td>

                      {/* Store Placement */}
                      <td className="py-4 px-5">
                        {userStoreList.length === 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            Seluruh Cabang (Akses Global)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {userStoreList.map((st) => (
                              <span
                                key={st.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 text-xs font-bold border border-indigo-200"
                              >
                                <Building2 className="w-3 h-3 text-indigo-600" />
                                <span>{st.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-300 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canManage && (
                            <>
                              <button
                                onClick={() => handleToggleStatus(u)}
                                title={u.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                                className={`p-2 rounded-xl transition-all border border-transparent text-xs font-semibold ${
                                  u.is_active
                                    ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50 hover:border-amber-200'
                                    : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200'
                                }`}
                              >
                                <Power className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => openEdit(u)}
                                title="Ubah Data & Penempatan Cabang"
                                className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-200"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Tambah Pengguna Baru */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Daftarkan Akun Pengguna / Staf Baru"
        description="Buat kredensial akun kasir, manajer, atau supervisor baru beserta hak penempatan cabang toko."
        maxWidth="xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              onClick={handleCreate}
              className="font-bold bg-blue-600 hover:bg-blue-700"
            >
              Simpan Akun
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nama Lengkap Staf *"
              placeholder="Contoh: Budi Santoso"
              size="lg"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Username (Login) *"
              placeholder="Contoh: kasir_budi"
              size="lg"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Alamat Email *"
              type="email"
              placeholder="Contoh: budi@toko.com"
              size="lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password Awal (Min. 6 Karakter) *"
              type="password"
              placeholder="Minimal 6 karakter"
              size="lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Jabatan / Role Akun *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {selectableRoles.map((r) => {
                const isSelected = roleCode === r.code;
                return (
                  <div
                    key={r.id}
                    onClick={() => setRoleCode(r.code)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-600 shadow-sm ring-2 ring-blue-200'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-black text-slate-900 leading-tight">
                        {r.name}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">
                        {r.description || r.code}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Penempatan Cabang Toko */}
          <div className="pt-2 border-t-2 border-slate-100">
            {isManager ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    🎯 Penempatan Cabang Staf Baru
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    Otomatis Terkunci
                  </span>
                </div>
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-black text-emerald-950 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-700" />
                      <span>{activeStoreName || 'Cabang Penugasan Manager'}</span>
                    </div>
                    <p className="text-xs font-semibold text-emerald-800 leading-relaxed">
                      Sebagai Store Manager, staf bawahan yang Anda daftarkan otomatis ditempatkan di cabang Anda.
                    </p>
                  </div>
                  <div className="px-3.5 py-1.5 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-xs whitespace-nowrap">
                    Terkunci
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      🎯 Kustomisasi Penempatan Cabang Toko
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      Centang cabang mana saja tempat kasir / manager ini diizinkan login dan bertugas.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStoreIds(stores.map((s) => s.id))}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStoreIds([])}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                {stores.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 text-center bg-slate-50 rounded-xl border">
                    Belum ada data cabang toko terdaftar.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
                    {stores.map((s) => {
                      const isChecked = selectedStoreIds.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleStoreSelection(s.id, selectedStoreIds, setSelectedStoreIds)}
                          className={`p-3 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all select-none ${
                            isChecked
                              ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Building2 className={`w-4 h-4 ${isChecked ? 'text-blue-600' : 'text-slate-400'}`} />
                            <div>
                              <div className="text-sm font-bold leading-tight">{s.name}</div>
                              <div className="text-xs text-slate-400 font-mono font-semibold">{s.code}</div>
                            </div>
                          </div>
                          <div>
                            {isChecked ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {selectedStoreIds.length === 0 && (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-2 font-medium">
                    ⚠️ Catatan: Jika tidak ada cabang yang dipilih, staf ini akan dianggap memiliki akses ke seluruh cabang.
                  </div>
                )}
              </>
            )}
          </div>
        </form>
      </Dialog>

      {/* Modal: Edit Pengguna & Penempatan */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Ubah Pengguna: ${editingUser?.full_name || ''}`}
        description="Perbarui informasi profil, jabatan, hak akses cabang, atau atur ulang password akun."
        maxWidth="xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setIsEditOpen(false)}
              disabled={isEditSubmitting}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="lg"
              isLoading={isEditSubmitting}
              onClick={handleEdit}
              className="font-bold bg-blue-600 hover:bg-blue-700"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nama Lengkap Staf *"
              size="lg"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              required
            />

            <Input
              label="Alamat Email *"
              type="email"
              size="lg"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              required
            />
          </div>

          <Input
            label="Reset Password Baru (Opsional)"
            type="password"
            placeholder="Kosongkan jika tidak ingin mengubah password"
            size="lg"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Jabatan / Role *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roles.map((r) => {
                const isSelected = editRoleCode === r.code;
                return (
                  <div
                    key={r.id}
                    onClick={() => setEditRoleCode(r.code)}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-600 shadow-sm ring-2 ring-blue-200'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-black text-slate-900 leading-tight">
                        {r.name}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                        {r.description || r.code}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded-lg border-2 border-slate-300 focus:ring-blue-500"
              />
              <span className="text-sm font-bold text-slate-800">
                Akun Aktif (Boleh Login ke Sistem)
              </span>
            </label>
          </div>

          {/* Edit Penempatan Cabang */}
          <div className="pt-2 border-t-2 border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  🎯 Kustomisasi Penempatan Cabang Toko
                </label>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Tentukan cabang toko yang diizinkan untuk akun ini.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditStoreIds(stores.map((s) => s.id))}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setEditStoreIds([])}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
              {stores.map((s) => {
                const isChecked = editStoreIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleStoreSelection(s.id, editStoreIds, setEditStoreIds)}
                    className={`p-3 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all select-none ${
                      isChecked
                        ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className={`w-4 h-4 ${isChecked ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-sm font-bold leading-tight">{s.name}</div>
                        <div className="text-xs text-slate-400 font-mono font-semibold">{s.code}</div>
                      </div>
                    </div>
                    <div>
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
