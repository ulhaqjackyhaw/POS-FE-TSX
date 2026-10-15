import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../../../api/inventory.api';
import { productsApi } from '../../../api/products.api';
import { storesApi } from '../../../api/stores.api';
import { Product, InventoryLedger } from '../../../types/api';
import { Warehouse } from '../../../types/store';
import { useAppContextStore } from '../../../stores/app-context.store';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Dialog } from '../../../components/ui/Dialog';
import { DateTimeText } from '../../../components/data-display/DateTimeText';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../components/feedback/Toast';
import { usePermission } from '../../../hooks/usePermission';
import { Boxes, ArrowDownUp, Plus, Minus, History } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { activeStoreId, activeWarehouseId } = useAppContextStore();
  const { check, isOwnerOrAdmin } = usePermission();
  const canAdjust = isOwnerOrAdmin || check('inventory.adjust');
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'stock' | 'ledger'>('stock');
  const [products, setProducts] = useState<Product[]>([]);
  const [ledgers, setLedgers] = useState<InventoryLedger[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Adjust stock modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [deltaQty, setDeltaQty] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodList, whList, ledgerList] = await Promise.all([
        productsApi.listProducts(),
        activeStoreId ? storesApi.listWarehouses(activeStoreId) : Promise.resolve([]),
        inventoryApi.listLedgers({ warehouse_id: activeWarehouseId || undefined }),
      ]);

      setProducts(prodList || []);
      setWarehouses(whList || []);
      setLedgers(ledgerList || []);

      if (whList.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(activeWarehouseId || whList[0].id);
      }
      if (prodList.length > 0 && !selectedProductId) {
        setSelectedProductId(prodList[0].id);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeStoreId, activeWarehouseId]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStoreId || !selectedWarehouseId || !selectedProductId) {
      setModalError('Produk dan gudang wajib dipilih.');
      return;
    }
    const qty = parseInt(deltaQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setModalError('Kuantitas penyesuaian harus lebih dari 0.');
      return;
    }
    if (!reason.trim()) {
      setModalError('Alasan penyesuaian stok wajib diisi.');
      return;
    }

    const finalDelta = adjustmentType === 'add' ? qty : -qty;

    setIsSubmitting(true);
    setModalError(null);
    try {
      const res = await inventoryApi.adjustStock({
        store_id: activeStoreId,
        warehouse_id: selectedWarehouseId,
        product_id: selectedProductId,
        quantity_delta: finalDelta,
        reason: reason.trim(),
        reference: reference.trim() || undefined,
      });

      if (res.approval_required) {
        toast('Permintaan penyesuaian stok diajukan dan menunggu persetujuan supervisor.', 'info');
      } else {
        toast('Stok berhasil disesuaikan dan dicatat di ledger!', 'success');
      }

      setIsAdjustModalOpen(false);
      setDeltaQty('');
      setReason('');
      setReference('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyesuaikan stok';
      setModalError(msg);
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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Manajemen Inventori & Ledger Stok</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Pantau stok fisik per gudang dan audit histori mutasi stok (Inventory Ledger) atomik.
          </p>
        </div>

        {canAdjust && (
          <Button
            variant="primary"
            size="lg"
            leftIcon={<ArrowDownUp className="w-5 h-5" />}
            onClick={() => setIsAdjustModalOpen(true)}
            className="font-bold shadow-md"
          >
            Penyesuaian Stok (Adjust)
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-base font-bold cursor-pointer transition-all ${
            activeTab === 'stock'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-5 h-5" />
          <span>Stok Produk</span>
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-base font-bold cursor-pointer transition-all ${
            activeTab === 'ledger'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <History className="w-5 h-5" />
          <span>Histori Mutasi & Ledger ({ledgers.length})</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingState message="Memuat data inventori..." rows={5} />
      ) : activeTab === 'stock' ? (
        /* Stock List */
        products.length === 0 ? (
          <EmptyState title="Belum Ada Produk" description="Tambahkan master produk terlebih dahulu." />
        ) : (
          <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-xs sm:text-sm">
                    <th className="py-4 px-5">SKU / Nama Produk</th>
                    <th className="py-4 px-5">Satuan</th>
                    <th className="py-4 px-5 text-center">Estimasi Stok Tercatat</th>
                    <th className="py-4 px-5 text-center">Gudang Penyimpanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 text-base sm:text-lg">{p.name}</div>
                        <div className="text-xs text-slate-500 font-mono font-semibold">{p.sku}</div>
                      </td>
                      <td className="py-4 px-5 text-slate-700 font-medium text-sm sm:text-base">{p.unit || 'pcs'}</td>
                      <td className="py-4 px-5 text-center font-mono">
                        <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 font-black text-emerald-900 text-base">
                          {p.stock !== undefined ? p.stock : 'Tersedia'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center text-slate-700 font-semibold text-sm sm:text-base">
                        {warehouses[0]?.name || 'Gudang Utama'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Ledger Table */
        ledgers.length === 0 ? (
          <EmptyState
            title="Belum Ada Riwayat Mutasi"
            description="Semua perubahan stok dari penjualan POS atau adjustment akan tercatat otomatis di sini."
          />
        ) : (
          <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-xs sm:text-sm">
                    <th className="py-4 px-5">Waktu</th>
                    <th className="py-4 px-5">Produk</th>
                    <th className="py-4 px-5">Tipe Mutasi</th>
                    <th className="py-4 px-5 text-right">Perubahan Qty</th>
                    <th className="py-4 px-5 text-right">Saldo Akhir</th>
                    <th className="py-4 px-5">Alasan & Referensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {ledgers.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-5">
                        <DateTimeText value={l.created_at} className="text-slate-800 text-sm font-semibold" />
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-900 text-base">
                        {l.product_name || l.product_id}
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold font-mono">
                          {l.mutation_type}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right font-mono font-black text-lg">
                        <span className={l.quantity_change > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {l.quantity_change > 0 ? `+${l.quantity_change}` : l.quantity_change}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right font-mono font-bold text-slate-900 text-base">
                        {l.balance_after}
                      </td>
                      <td className="py-4 px-5 text-slate-700 text-sm font-medium">
                        <div className="font-bold text-slate-900">{l.reason}</div>
                        {l.reference_id && (
                          <div className="text-xs text-slate-500 font-mono font-semibold">Ref: {l.reference_id}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Adjust Stock Modal */}
      <Dialog
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Penyesuaian Stok Fisik (Inventory Adjustment)"
        description="Lakukan opname stok, mutasi masuk barang baru, atau koreksi barang rusak/hilang."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setIsAdjustModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button variant="primary" size="lg" isLoading={isSubmitting} onClick={handleAdjustSubmit} className="font-bold">
              Simpan Penyesuaian
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          {modalError && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-base font-bold text-rose-800">
              {modalError}
            </div>
          )}

          {/* Select Product */}
          <div>
            <label className="block text-sm sm:text-base font-bold text-slate-800 mb-2">Pilih Produk</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-2xl bg-white border-2 border-slate-300 text-slate-900 text-base font-semibold p-3.5 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Select Warehouse */}
          <div>
            <label className="block text-sm sm:text-base font-bold text-slate-800 mb-2">Gudang Penyimpanan</label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full rounded-2xl bg-white border-2 border-slate-300 text-slate-900 text-base font-semibold p-3.5 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Adjustment type toggle */}
          <div>
            <label className="block text-sm sm:text-base font-bold text-slate-800 mb-2">Jenis Penyesuaian</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 text-base font-bold cursor-pointer transition-all ${
                  adjustmentType === 'add'
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-md'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Plus className="w-5 h-5" />
                <span>Tambah Stok (Masuk)</span>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('subtract')}
                className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 text-base font-bold cursor-pointer transition-all ${
                  adjustmentType === 'subtract'
                    ? 'bg-rose-600 border-rose-700 text-white shadow-md'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Minus className="w-5 h-5" />
                <span>Kurangi Stok (Keluar/Rusak)</span>
              </button>
            </div>
          </div>

          {/* Quantity delta */}
          <Input
            label="Jumlah Kuantitas"
            type="number"
            min="1"
            size="lg"
            placeholder="Contoh: 10"
            value={deltaQty}
            onChange={(e) => setDeltaQty(e.target.value)}
            required
          />

          {/* Reason (mandatory per PRD) */}
          <Input
            label="Alasan Penyesuaian (Wajib Diisi)"
            placeholder="Contoh: Stok opname bulanan, barang rusak/expired, dll."
            size="lg"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />

          {/* Reference */}
          <Input
            label="No. Dokumen / Referensi (Opsional)"
            placeholder="Contoh: OPNAME-2026-10"
            size="lg"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </form>
      </Dialog>
    </div>
  );
};
