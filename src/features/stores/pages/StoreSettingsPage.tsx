import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storesApi } from '../../../api/stores.api';
import { warehousesApi } from '../../../api/warehouses.api';
import { Store, Terminal, Warehouse } from '../../../types/store';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Dialog } from '../../../components/ui/Dialog';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../components/feedback/Toast';
import { usePermission } from '../../../hooks/usePermission';
import { Plus, Monitor, Warehouse as WarehouseIcon, MapPin, ExternalLink, Sparkles } from 'lucide-react';

export const StoreSettingsPage: React.FC = () => {
  const { check, isOwnerOrAdmin } = usePermission();
  const canCreate = isOwnerOrAdmin || check('store.create') || check('org:manage');
  const { toast } = useToast();

  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Add store modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add warehouse modal for selected store
  const [isAddWarehouseModalOpen, setIsAddWarehouseModalOpen] = useState(false);
  const [newWhCode, setNewWhCode] = useState('');
  const [newWhName, setNewWhName] = useState('');
  const [isSubmittingWh, setIsSubmittingWh] = useState(false);
  const [whFormError, setWhFormError] = useState<string | null>(null);

  const loadStores = async () => {
    setIsLoading(true);
    try {
      const data = await storesApi.listStores();
      setStores(data || []);
      if (data && data.length > 0 && !selectedStore) {
        setSelectedStore(data[0]);
      }
    } catch {
      setStores([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  const loadStoreDetails = async (storeId: string) => {
    try {
      const [terms, whs] = await Promise.all([
        storesApi.listTerminals(storeId),
        storesApi.listWarehouses(storeId),
      ]);
      setTerminals(terms || []);
      setWarehouses(whs || []);
    } catch {
      setTerminals([]);
      setWarehouses([]);
    }
  };

  useEffect(() => {
    if (!selectedStore) return;
    loadStoreDetails(selectedStore.id);
  }, [selectedStore]);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setFormError('Kode dan nama cabang wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const newStore = await storesApi.createStore({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        address: address.trim() || undefined,
      });

      toast(`Cabang "${newStore.name}" beserta Gudang Utama & Terminal Kasir berhasil dibuat!`, 'success');
      setIsAddModalOpen(false);
      setCode('');
      setName('');
      setAddress('');
      await loadStores();
      setSelectedStore(newStore);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat cabang';
      setFormError(msg);
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;
    if (!newWhCode.trim() || !newWhName.trim()) {
      setWhFormError('Kode dan nama gudang wajib diisi.');
      return;
    }

    setIsSubmittingWh(true);
    setWhFormError(null);
    try {
      await warehousesApi.createWarehouse({
        store_id: selectedStore.id,
        code: newWhCode.trim().toUpperCase(),
        name: newWhName.trim(),
        is_active: true,
      });

      toast(`Gudang "${newWhName.trim()}" berhasil ditambahkan ke cabang ${selectedStore.name}!`, 'success');
      setIsAddWarehouseModalOpen(false);
      setNewWhCode('');
      setNewWhName('');
      await loadStoreDetails(selectedStore.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan gudang';
      setWhFormError(msg);
      toast(msg, 'error');
    } finally {
      setIsSubmittingWh(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Manajemen Jaringan Cabang & Terminal
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Konfigurasi cabang toko fisik, terminal register kasir, dan gudang penyimpanan stok.
          </p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => setIsAddModalOpen(true)}
            className="font-bold shadow-md"
          >
            Tambah Cabang Baru
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState message="Memuat konfigurasi jaringan cabang..." rows={4} />
      ) : stores.length === 0 ? (
        <EmptyState
          title="Belum Ada Cabang"
          description="Tambahkan cabang toko pertama untuk memulai operasional."
          actionLabel={canCreate ? 'Tambah Cabang' : undefined}
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Store List Column */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider px-2">
              Daftar Cabang Aktif ({stores.length})
            </div>
            {stores.map((s) => {
              const isSelected = selectedStore?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStore(s)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-slate-900">{s.name}</span>
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
                      {s.code}
                    </span>
                  </div>
                  {s.address && (
                    <div className="text-sm text-slate-600 mt-1.5 flex items-center gap-1.5 line-clamp-1 font-medium">
                      <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                      <span>{s.address}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Details Column (Terminals & Warehouses) */}
          <div className="lg:col-span-2 space-y-6">
            {selectedStore ? (
              <>
                {/* Store Header Card */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-sm text-emerald-700 font-black">
                        {selectedStore.code}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                        {selectedStore.name}
                      </h2>
                      <div className="text-sm text-slate-600 mt-1 font-medium">{selectedStore.address || 'Alamat belum diatur'}</div>
                    </div>
                  </div>
                </div>

                {/* Terminals Grid */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Monitor className="w-5 h-5 text-sky-600" />
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">Terminal Register POS</h3>
                    </div>
                    <span className="text-sm font-semibold text-slate-600">{terminals.length} terminal terdaftar</span>
                  </div>

                  {terminals.length === 0 ? (
                    <div className="text-sm text-slate-500 py-4 text-center font-medium">
                      Belum ada terminal kasir terdaftar di cabang ini.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {terminals.map((t) => (
                        <div
                          key={t.id}
                          className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-slate-900 text-base">{t.name}</div>
                            <div className="text-xs text-slate-500 font-mono font-bold">{t.code}</div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300">
                            Aktif
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Warehouses Grid */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <WarehouseIcon className="w-5 h-5 text-purple-600" />
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">Gudang Penyimpanan Cabang</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-600 hidden sm:inline">{warehouses.length} gudang terdaftar</span>
                      {canCreate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Plus className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setWhFormError(null);
                            setNewWhCode(selectedStore ? `WH-${selectedStore.code.replace('STORE-', '')}-02` : '');
                            setNewWhName('');
                            setIsAddWarehouseModalOpen(true);
                          }}
                          className="font-bold border border-purple-200 text-purple-700 hover:bg-purple-50 text-xs py-1.5 px-3"
                        >
                          Tambah Gudang
                        </Button>
                      )}
                      <Link
                        to="/warehouses"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all border border-indigo-200"
                      >
                        <span>Master Gudang</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {warehouses.length === 0 ? (
                    <div className="text-sm text-slate-500 py-4 text-center font-medium">
                      Belum ada gudang terdaftar di cabang ini.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {warehouses.map((w) => (
                        <div
                          key={w.id}
                          className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-slate-900 text-base">{w.name}</div>
                            <div className="text-xs text-slate-500 font-mono font-bold">{w.code}</div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-bold border border-purple-300">
                            Aktif
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Add Store Modal */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Daftarkan Cabang Toko Baru"
        description="Buat entitas cabang toko fisik baru dalam sistem ERP multi-outlet."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="ghost" size="lg" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button variant="primary" size="lg" isLoading={isSubmitting} onClick={handleCreateStore} className="font-bold">
              Simpan Cabang
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateStore} className="space-y-4">
          {formError && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-base font-bold text-rose-800">
              {formError}
            </div>
          )}

          <Input
            label="Kode Cabang (Wajib Unik)"
            placeholder="Contoh: STORE-BDG-01"
            size="lg"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Nama Cabang Toko"
            placeholder="Contoh: Cabang Dago - Bandung"
            size="lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Alamat Lengkap Cabang"
            placeholder="Contoh: Jl. Ir. H. Juanda No. 120, Bandung"
            size="lg"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {/* Live Auto-Connected Preview */}
          {code.trim() && (
            <div className="p-4 bg-emerald-50/90 border-2 border-emerald-300 rounded-2xl space-y-2.5">
              <div className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Otomatis Dibuatkan & Terhubung Langsung:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-sm">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <WarehouseIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>Gudang Utama</span>
                  </div>
                  <div className="font-mono text-emerald-800 font-black mt-1">
                    {code.trim().toUpperCase().startsWith('STORE-')
                      ? 'WH-' + code.trim().toUpperCase().replace('STORE-', '')
                      : 'WH-' + code.trim().toUpperCase()}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5 truncate">
                    Gudang Utama {name.trim() || 'Cabang'}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-sm">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-sky-600" />
                    <span>Terminal Kasir 1</span>
                  </div>
                  <div className="font-mono text-sky-800 font-black mt-1">
                    {code.trim().toUpperCase().startsWith('STORE-')
                      ? 'TERM-01-' + code.trim().toUpperCase().replace('STORE-', '')
                      : 'TERM-01-' + code.trim().toUpperCase()}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5 truncate">
                    Kasir 1 {name.trim() || 'Cabang'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </Dialog>

      {/* Add Warehouse Modal for Selected Store */}
      <Dialog
        isOpen={isAddWarehouseModalOpen}
        onClose={() => setIsAddWarehouseModalOpen(false)}
        title={`Tambah Gudang di ${selectedStore?.name || 'Cabang'}`}
        description="Daftarkan gudang penyimpanan tambahan untuk menampung stok khusus di cabang ini."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setIsAddWarehouseModalOpen(false)}
              disabled={isSubmittingWh}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="lg"
              isLoading={isSubmittingWh}
              onClick={handleCreateWarehouse}
              className="font-bold bg-purple-600 hover:bg-purple-700"
            >
              Simpan Gudang
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateWarehouse} className="space-y-4">
          {whFormError && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-sm font-bold text-rose-800">
              {whFormError}
            </div>
          )}

          <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs text-slate-700">
            Cabang Terhubung:{' '}
            <strong className="text-slate-900">{selectedStore?.name}</strong>{' '}
            <span className="font-mono text-indigo-700">({selectedStore?.code})</span>
          </div>

          <Input
            label="Kode Gudang *"
            placeholder="Contoh: WH-BDG-FROZEN"
            size="lg"
            value={newWhCode}
            onChange={(e) => setNewWhCode(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Nama Gudang *"
            placeholder="Contoh: Gudang Makanan Beku Lantai 2"
            size="lg"
            value={newWhName}
            onChange={(e) => setNewWhName(e.target.value)}
            required
          />
        </form>
      </Dialog>
    </div>
  );
};
