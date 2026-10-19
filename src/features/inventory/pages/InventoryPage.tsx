import React, { useState, useEffect, useMemo } from 'react';
import { inventoryApi } from '../../../api/inventory.api';
import { productsApi } from '../../../api/products.api';
import { Product, InventoryLedger, CurrentStockItem } from '../../../types/api';
import { useAppContextStore } from '../../../stores/app-context.store';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Dialog } from '../../../components/ui/Dialog';
import { DateTimeText } from '../../../components/data-display/DateTimeText';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../components/feedback/Toast';
import { usePermission } from '../../../hooks/usePermission';
import { Boxes, ArrowDownUp, Plus, Minus, History, Store as StoreIcon, Search, Upload } from 'lucide-react';
import { ImportStockAdjustmentModal } from '../components/ImportStockAdjustmentModal';

export const InventoryPage: React.FC = () => {
  const { activeStoreId, activeStoreName } = useAppContextStore();
  const { check, isOwnerOrAdmin } = usePermission();
  const canAdjust = isOwnerOrAdmin || check('inventory.adjust');
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'stock' | 'ledger'>('stock');
  const [stockItems, setStockItems] = useState<CurrentStockItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ledgers, setLedgers] = useState<InventoryLedger[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Adjust stock modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [deltaQty, setDeltaQty] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodList, stockList, ledgerList] = await Promise.all([
        productsApi.listProducts(),
        inventoryApi.listStock(activeStoreId || undefined),
        inventoryApi.listLedgers({ store_id: activeStoreId || undefined }),
      ]);

      setProducts(prodList || []);
      setStockItems(stockList || []);
      setLedgers(ledgerList || []);

      if (prodList && prodList.length > 0 && !selectedProductId) {
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
  }, [activeStoreId]);

  // Merge products with their stock quantities for activeStoreId
  const displayItems = useMemo(() => {
    const stockMap = new Map<string, CurrentStockItem>();
    stockItems.forEach((si) => stockMap.set(si.product_id, si));

    return products.map((p) => {
      const stockInfo = stockMap.get(p.id);
      return {
        product_id: p.id,
        product_name: p.name,
        sku: p.sku,
        unit: p.unit || stockInfo?.unit || 'pcs',
        quantity: stockInfo ? stockInfo.quantity : 0,
      };
    });
  }, [products, stockItems]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStoreId) {
      setModalError('Cabang toko aktif belum dipilih.');
      return;
    }
    if (!selectedProductId) {
      setModalError('Produk wajib dipilih.');
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
        product_id: selectedProductId,
        quantity_delta: finalDelta,
        reason: reason.trim(),
        reference: reference.trim() || undefined,
      });

      if (res.approval_required) {
        toast('Permintaan penyesuaian stok diajukan dan menunggu persetujuan supervisor.', 'info');
      } else {
        toast('Stok berhasil disesuaikan langsung untuk cabang ini!', 'success');
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
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-1">
            <StoreIcon className="w-4 h-4" />
            <span>Cabang: {activeStoreName || 'Semua Cabang'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Manajemen Stok & Ledger Cabang</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Kelola saldo stok fisik cabang langsung tanpa perantara gudang terpisah, lengkap dengan audit trail mutasi.
          </p>
        </div>

        {canAdjust && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              leftIcon={<Upload className="w-5 h-5 text-emerald-600" />}
              onClick={() => setIsImportModalOpen(true)}
              className="font-bold shadow-sm"
            >
              Import Excel / CSV
            </Button>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<ArrowDownUp className="w-5 h-5" />}
              onClick={() => {
                setProductSearch('');
                setIsAdjustModalOpen(true);
              }}
              className="font-bold shadow-md"
            >
              Penyesuaian Stok Langsung
            </Button>
          </div>
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
          <span>Stok Cabang ({displayItems.length})</span>
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
        <LoadingState message="Memuat data stok cabang..." rows={5} />
      ) : activeTab === 'stock' ? (
        /* Stock List */
        displayItems.length === 0 ? (
          <EmptyState title="Belum Ada Produk" description="Tambahkan master produk terlebih dahulu." />
        ) : (
          <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-xs sm:text-sm">
                    <th className="py-4 px-5">SKU / Nama Produk</th>
                    <th className="py-4 px-5">Satuan</th>
                    <th className="py-4 px-5 text-center">Stok Fisik Tersedia</th>
                    <th className="py-4 px-5 text-center">Penempatan Lokasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {displayItems.map((item) => (
                    <tr key={item.product_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 text-base sm:text-lg">{item.product_name}</div>
                        <div className="text-xs text-slate-500 font-mono font-semibold">{item.sku}</div>
                      </td>
                      <td className="py-4 px-5 text-slate-700 font-medium text-sm sm:text-base">{item.unit || 'pcs'}</td>
                      <td className="py-4 px-5 text-center font-mono">
                        <span className={`px-4 py-1.5 rounded-full font-black text-base border ${
                          item.quantity > 10 
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900' 
                            : item.quantity > 0 
                            ? 'bg-amber-100 border-amber-300 text-amber-900'
                            : 'bg-rose-100 border-rose-300 text-rose-900'
                        }`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center text-slate-700 font-semibold text-sm sm:text-base">
                        {activeStoreName || 'Toko Cabang'}
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
            title="Belum Ada Riwayat Mutasi Stok"
            description="Semua mutasi penjualan kasir atau adjustment di cabang ini tercatat otomatis di ledger."
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
        title="Penyesuaian Stok Cabang Langsung"
        description={`Input stok masuk atau opname stok untuk cabang: ${activeStoreName || 'Cabang Aktif'}`}
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

          {/* Store information banner */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <StoreIcon className="w-5 h-5 text-emerald-700" />
            <div>
              <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Lokasi Stok Cabang:</div>
              <div className="text-base font-black text-emerald-900">{activeStoreName || 'Cabang Aktif'}</div>
            </div>
          </div>

          {/* Select Product with Live Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm sm:text-base font-bold text-slate-800">Pilih Produk</label>
              <span className="text-xs text-slate-500 font-semibold">
                {filteredProducts.length} produk ditemukan
              </span>
            </div>

            {/* Search filter input */}
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama produk, SKU, atau barcode..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            {/* Scrollable list of selectable products */}
            <div className="max-h-48 overflow-y-auto border-2 border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-xs font-semibold text-slate-500">
                  Tidak ada produk yang cocok dengan kata kunci &quot;{productSearch}&quot;
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = p.id === selectedProductId;
                  const curStock = stockItems.find((s) => s.product_id === p.id)?.quantity ?? 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProductId(p.id)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950 font-bold border-l-4 border-emerald-600'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>{p.name}</span>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-black uppercase">
                              Dipilih
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="font-mono font-bold bg-slate-100 px-1 rounded text-slate-700">{p.sku}</span>
                          {p.barcode && <span>Barcode: {p.barcode}</span>}
                          <span>Satuan: {p.unit}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-slate-500 font-semibold">Stok Saat Ini:</div>
                        <div className="text-sm font-mono font-black text-slate-900">
                          {curStock} {p.unit}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
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
            placeholder="Contoh: Stok opname bulanan, barang masuk dari supplier, barang rusak/expired, dll."
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

      {/* Import Stock Adjustment Modal (Excel / CSV) */}
      <ImportStockAdjustmentModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        activeStoreId={activeStoreId || ''}
        activeStoreName={activeStoreName || ''}
        products={products}
        onSuccess={loadData}
      />
    </div>
  );
};
