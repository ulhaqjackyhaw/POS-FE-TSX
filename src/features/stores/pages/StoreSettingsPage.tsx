import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storesApi } from '../../../api/stores.api';
import { Store, Terminal } from '../../../types/store';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Dialog } from '../../../components/ui/Dialog';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../components/feedback/Toast';
import { usePermission } from '../../../hooks/usePermission';
import { Plus, Monitor, Boxes, MapPin, ExternalLink, Sparkles } from 'lucide-react';

export const StoreSettingsPage: React.FC = () => {
  const { check, isOwnerOrAdmin } = usePermission();
  const canCreate = isOwnerOrAdmin || check('store.create') || check('org:manage');
  const { toast } = useToast();

  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [terminals, setTerminals] = useState<Terminal[]>([]);

  // Add store modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      const terms = await storesApi.listTerminals(storeId);
      setTerminals(terms || []);
    } catch {
      setTerminals([]);
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

      toast(`Cabang "${newStore.name}" beserta Terminal Kasir default berhasil dibuat!`, 'success');
      setIsAddModalOpen(false);
      setCode('');
      setName('');
      setAddress('');
      await loadStores();
      setSelectedStore(newStore);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat cabang toko';
      setFormError(msg);
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Pengaturan Cabang & Outlet</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Kelola master data cabang toko fisik, terminal kasir, dan penempatan operasional langsung.
          </p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="font-bold shadow-md"
          >
            Tambah Cabang Toko
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState message="Memuat daftar cabang..." rows={4} />
      ) : stores.length === 0 ? (
        <EmptyState
          title="Belum Ada Cabang Toko"
          description="Tambahkan cabang toko pertama Anda untuk mulai mengoperasikan POS."
          actionLabel={canCreate ? 'Tambah Cabang Sekarang' : undefined}
          onAction={canCreate ? () => setIsAddModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Store List Column */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider text-xs">
              Daftar Cabang ({stores.length})
            </h2>
            <div className="space-y-2.5">
              {stores.map((s) => {
                const isSelected = selectedStore?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStore(s)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-mono font-bold text-slate-600">{s.code}</div>
                        <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">{s.name}</div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          s.is_active
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {s.is_active ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </div>

                    {s.address && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{s.address}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Store Detail & Sub-entities Column */}
          <div className="lg:col-span-2 space-y-6">
            {selectedStore ? (
              <>
                {/* Store Info Card */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                        {selectedStore.code}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{selectedStore.name}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/stores/${selectedStore.id}/pricing`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs sm:text-sm font-bold transition-all border border-purple-200"
                      >
                        <span>Atur Harga Cabang</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Alamat Fisik</div>
                      <div className="font-bold text-slate-800 mt-1">{selectedStore.address || 'Tidak ditentukan'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Status Operasional</div>
                      <div className="font-bold text-slate-800 mt-1">
                        {selectedStore.is_active ? 'Buka / Beroperasi' : 'Tutup Sementara'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terminals Grid */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Monitor className="w-5 h-5 text-sky-600" />
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">Terminal Kasir POS</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-600 hidden sm:inline">{terminals.length} terminal terdaftar</span>
                      <Link
                        to="/terminals"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition-all border border-sky-200"
                      >
                        <span>Kelola Terminal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {terminals.length === 0 ? (
                    <div className="text-sm text-slate-500 py-4 text-center font-medium">
                      Belum ada terminal kasir yang terdaftar untuk cabang ini.
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

                {/* Direct Branch Stock Card */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Boxes className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900">Manajemen Stok Cabang Langsung</h3>
                        <p className="text-xs text-slate-500 font-medium">Stok dikelola langsung di cabang tanpa perantara gudang.</p>
                      </div>
                    </div>
                    <Link
                      to="/inventory"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs sm:text-sm font-bold transition-all shadow-sm"
                    >
                      <span>Buka Inventori Cabang</span>
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
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
        description="Buat entitas cabang toko fisik baru dalam sistem POS multi-outlet."
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
                <span>Otomatis Dibuatkan Terminal Kasir:</span>
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
          )}
        </form>
      </Dialog>
    </div>
  );
};
