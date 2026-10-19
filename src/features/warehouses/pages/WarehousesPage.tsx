import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { warehousesApi } from '../../../api/warehouses.api';
import { storesApi } from '../../../api/stores.api';
import { Warehouse, Store } from '../../../types/store';
import { useAppContextStore } from '../../../stores/app-context.store';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Dialog } from '../../../components/ui/Dialog';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../components/feedback/Toast';
import { usePermission } from '../../../hooks/usePermission';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Search,
  Building2,
  Boxes,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  SlidersHorizontal,
  X,
  AlertTriangle,
} from 'lucide-react';

export const WarehousesPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeStoreId, setActiveWarehouse } = useAppContextStore();
  const { check, isOwnerOrAdmin } = usePermission();
  const canManage = isOwnerOrAdmin || check('warehouse.create') || check('warehouse.update') || check('org:manage');
  const canDelete = isOwnerOrAdmin || check('warehouse.delete') || check('org:manage');
  const { toast } = useToast();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Create Warehouse Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStoreId, setCreateStoreId] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createIsActive, setCreateIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Warehouse Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [editStoreId, setEditStoreId] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete/Deactivate Confirmation Dialog
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  // Load initial stores and warehouses
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [whList, stList] = await Promise.all([
        warehousesApi.listWarehouses(),
        storesApi.listStores(),
      ]);
      setWarehouses(whList || []);
      setStores(stList || []);

      if (stList && stList.length > 0 && !createStoreId) {
        setCreateStoreId(activeStoreId || stList[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat master data gudang';
      toast(msg, 'error');
      setWarehouses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered warehouses
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((wh) => {
      // Search filter
      const matchesSearch =
        !search.trim() ||
        wh.name.toLowerCase().includes(search.toLowerCase()) ||
        wh.code.toLowerCase().includes(search.toLowerCase()) ||
        (wh.store_name && wh.store_name.toLowerCase().includes(search.toLowerCase())) ||
        (wh.store_code && wh.store_code.toLowerCase().includes(search.toLowerCase()));

      // Store filter
      const matchesStore =
        selectedStoreFilter === 'all' || wh.store_id === selectedStoreFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && wh.is_active) ||
        (statusFilter === 'inactive' && !wh.is_active);

      return matchesSearch && matchesStore && matchesStatus;
    });
  }, [warehouses, search, selectedStoreFilter, statusFilter]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = warehouses.length;
    const active = warehouses.filter((w) => w.is_active).length;
    const inactive = total - active;
    const uniqueStores = new Set(warehouses.map((w) => w.store_id)).size;
    return { total, active, inactive, uniqueStores };
  }, [warehouses]);

  // Handle Create Warehouse
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createStoreId) {
      setCreateError('Silakan pilih cabang toko terlebih dahulu.');
      return;
    }
    if (!createCode.trim() || !createName.trim()) {
      setCreateError('Kode gudang dan nama gudang wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const newWh = await warehousesApi.createWarehouse({
        store_id: createStoreId,
        code: createCode.trim().toUpperCase(),
        name: createName.trim(),
        is_active: createIsActive,
      });

      toast(`Gudang "${newWh.name}" (${newWh.code}) berhasil ditambahkan!`, 'success');
      setIsCreateOpen(false);
      setCreateCode('');
      setCreateName('');
      setCreateIsActive(true);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan gudang';
      setCreateError(msg);
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEdit = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setEditStoreId(wh.store_id);
    setEditCode(wh.code);
    setEditName(wh.name);
    setEditIsActive(wh.is_active);
    setEditError(null);
    setIsEditOpen(true);
  };

  // Handle Edit Warehouse
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;

    if (!editCode.trim() || !editName.trim()) {
      setEditError('Kode dan nama gudang wajib diisi.');
      return;
    }

    setIsEditSubmitting(true);
    setEditError(null);

    try {
      const updated = await warehousesApi.updateWarehouse(editingWarehouse.id, {
        store_id: editStoreId || editingWarehouse.store_id,
        code: editCode.trim().toUpperCase(),
        name: editName.trim(),
        is_active: editIsActive,
      });

      toast(`Gudang "${updated.name}" berhasil diperbarui!`, 'success');
      setIsEditOpen(false);
      setEditingWarehouse(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui data gudang';
      setEditError(msg);
      toast(msg, 'error');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Quick Toggle Status
  const handleToggleStatus = async (wh: Warehouse) => {
    try {
      const newStatus = !wh.is_active;
      await warehousesApi.updateWarehouse(wh.id, {
        store_id: wh.store_id,
        code: wh.code,
        name: wh.name,
        is_active: newStatus,
      });

      toast(`Status gudang "${wh.name}" diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}`, 'info');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status gudang';
      toast(msg, 'error');
    }
  };

  // Open Delete Dialog
  const openDelete = (wh: Warehouse) => {
    setDeletingWarehouse(wh);
    setIsDeleteOpen(true);
  };

  // Handle Delete Warehouse
  const handleDelete = async () => {
    if (!deletingWarehouse) return;

    setIsDeleteSubmitting(true);
    try {
      await warehousesApi.deleteWarehouse(deletingWarehouse.id);
      toast(`Gudang "${deletingWarehouse.name}" berhasil dihapus!`, 'success');
      setIsDeleteOpen(false);
      setDeletingWarehouse(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus gudang';
      toast(msg, 'error');
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  // Go to inventory page focused on this warehouse
  const handleViewInventory = (wh: Warehouse) => {
    setActiveWarehouse(wh.id);
    navigate('/inventory');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
              <WarehouseIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Master Data Gudang
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-0.5 font-medium">
                Pusat manajemen dan konfigurasi gudang penyimpanan stok fisik per cabang toko.
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
              leftIcon={<Plus className="w-5 h-5" />}
              onClick={() => {
                setCreateError(null);
                setCreateCode('');
                setCreateName('');
                setCreateIsActive(true);
                if (stores.length > 0 && !createStoreId) {
                  setCreateStoreId(activeStoreId || stores[0].id);
                }
                setIsCreateOpen(true);
              }}
              className="font-bold shadow-md bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
            >
              Tambah Gudang Baru
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Gudang</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <WarehouseIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gudang Aktif</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Power className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gudang Nonaktif</div>
            <div className="text-2xl font-black text-slate-500 mt-1">{stats.inactive}</div>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-500">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cabang Terhubung</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{stats.uniqueStores}</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode gudang, nama gudang, atau nama cabang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
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

          {/* Store Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap hidden sm:inline">
              Cabang:
            </span>
            <select
              value={selectedStoreFilter}
              onChange={(e) => setSelectedStoreFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Semua Cabang ({stores.length})</option>
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

      {/* Main Content List / Table */}
      {isLoading ? (
        <LoadingState message="Memuat daftar master gudang..." rows={5} />
      ) : filteredWarehouses.length === 0 ? (
        <EmptyState
          title={search || selectedStoreFilter !== 'all' || statusFilter !== 'all' ? 'Gudang Tidak Ditemukan' : 'Belum Ada Gudang Terdaftar'}
          description={
            search || selectedStoreFilter !== 'all' || statusFilter !== 'all'
              ? 'Tidak ada gudang yang sesuai dengan kata kunci pencarian atau filter yang dipilih.'
              : 'Daftarkan gudang penyimpanan baru untuk mulai mengelola stok produk per cabang.'
          }
          actionLabel={canManage ? 'Tambah Gudang Baru' : undefined}
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-xs font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-5">Kode Gudang</th>
                  <th className="py-4 px-5">Nama Gudang</th>
                  <th className="py-4 px-5">Cabang Toko</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Aksi & Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100 text-sm font-medium text-slate-800">
                {filteredWarehouses.map((wh) => {
                  const storeInfo = stores.find((s) => s.id === wh.store_id);
                  const storeName = wh.store_name || storeInfo?.name || 'Cabang Tidak Dikenal';
                  const storeCode = wh.store_code || storeInfo?.code || '';

                  return (
                    <tr
                      key={wh.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Code */}
                      <td className="py-4 px-5">
                        <span className="font-mono text-xs font-black text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg">
                          {wh.code}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 text-base">{wh.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">ID: {wh.id}</div>
                      </td>

                      {/* Store */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-800">{storeName}</span>
                            {storeCode && (
                              <span className="ml-1.5 font-mono text-xs text-slate-500 font-semibold">
                                ({storeCode})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        {wh.is_active ? (
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
                          {/* View Inventory */}
                          <button
                            onClick={() => handleViewInventory(wh)}
                            title="Buka Inventori & Stok Gudang Ini"
                            className="p-2 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-all border border-transparent hover:border-teal-200 font-semibold text-xs flex items-center gap-1"
                          >
                            <Boxes className="w-4 h-4 text-teal-600" />
                            <span className="hidden md:inline">Lihat Stok</span>
                          </button>

                          {/* Quick Toggle Status */}
                          {canManage && (
                            <button
                              onClick={() => handleToggleStatus(wh)}
                              title={wh.is_active ? 'Nonaktifkan Gudang' : 'Aktifkan Gudang'}
                              className={`p-2 rounded-xl transition-all border border-transparent text-xs font-semibold ${
                                wh.is_active
                                  ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50 hover:border-amber-200'
                                  : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200'
                              }`}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Button */}
                          {canManage && (
                            <button
                              onClick={() => openEdit(wh)}
                              title="Ubah Data Gudang"
                              className="p-2 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-200"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Button */}
                          {canDelete && (
                            <button
                              onClick={() => openDelete(wh)}
                              title="Hapus Gudang"
                              className="p-2 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* Modal: Tambah Gudang Baru */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Daftarkan Gudang Baru"
        description="Tambahkan entitas gudang penyimpanan fisik untuk menampung stok barang di cabang toko."
        maxWidth="lg"
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
              className="font-bold bg-indigo-600 hover:bg-indigo-700"
            >
              Simpan Gudang
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

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Cabang Toko Pemilik *
            </label>
            <select
              value={createStoreId}
              onChange={(e) => setCreateStoreId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
              required
            >
              <option value="" disabled>
                -- Pilih Cabang Toko --
              </option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Kode Gudang (Wajib Unik) *"
            placeholder="Contoh: WH-BDG-01 atau WH-UTAMA"
            size="lg"
            value={createCode}
            onChange={(e) => setCreateCode(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Nama Gudang *"
            placeholder="Contoh: Gudang Utama Bandung"
            size="lg"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            required
          />

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createIsActive}
                onChange={(e) => setCreateIsActive(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded-lg border-2 border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-sm font-bold text-slate-800">
                Gudang Aktif dan Siap Operasional
              </span>
            </label>
            <p className="text-xs text-slate-500 ml-8 mt-0.5">
              Gudang yang aktif dapat menerima transaksi stok, mutasi inventori, dan order penjualan POS.
            </p>
          </div>
        </form>
      </Dialog>

      {/* Modal: Edit Gudang */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Ubah Data Gudang"
        description="Perbarui informasi kode, nama, cabang penempatan, atau status aktif gudang."
        maxWidth="lg"
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
              className="font-bold bg-indigo-600 hover:bg-indigo-700"
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
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Cabang Toko Pemilik *
            </label>
            <select
              value={editStoreId}
              onChange={(e) => setEditStoreId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
              required
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Kode Gudang *"
            size="lg"
            value={editCode}
            onChange={(e) => setEditCode(e.target.value)}
            required
          />

          <Input
            label="Nama Gudang *"
            size="lg"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded-lg border-2 border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-sm font-bold text-slate-800">
                Gudang Aktif dan Siap Operasional
              </span>
            </label>
          </div>
        </form>
      </Dialog>

      {/* Modal: Konfirmasi Hapus Gudang */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Hapus Gudang Penyimpanan"
        description="Apakah Anda yakin ingin menghapus gudang ini dari sistem?"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleteSubmitting}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="lg"
              isLoading={isDeleteSubmitting}
              onClick={handleDelete}
              className="font-bold"
            >
              Hapus Gudang
            </Button>
          </div>
        }
      >
        {deletingWarehouse && (
          <div className="space-y-3">
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-900 text-sm font-semibold flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                Tindakan ini akan menghapus entitas gudang{' '}
                <span className="font-black text-amber-950">
                  {deletingWarehouse.name} ({deletingWarehouse.code})
                </span>
                . Jika gudang memiliki riwayat transaksi stok atau keterkaitan data lain, sistem akan otomatis menonaktifkan statusnya (soft delete).
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
