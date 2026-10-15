import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { productsApi } from '../../../api/products.api';
import { Product } from '../../../types/api';
import { useAppContextStore } from '../../../stores/app-context.store';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Dialog } from '../../../components/ui/Dialog';
import { MoneyText } from '../../../components/data-display/MoneyText';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../components/feedback/Toast';
import { usePermission } from '../../../hooks/usePermission';
import { parseRupiahInput, formatRupiah } from '../../../utils/currency';
import { Edit3, DollarSign, Store as StoreIcon } from 'lucide-react';

export const BranchPricingPage: React.FC = () => {
  const { id: routeStoreId } = useParams<{ id: string }>();
  const { activeStoreId, activeStoreName } = useAppContextStore();
  const currentStoreId = routeStoreId || activeStoreId;

  const { check, isOwnerOrAdmin } = usePermission();
  const canOverride = isOwnerOrAdmin || check('pricing.override') || check('price:override');
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [rawPrice, setRawPrice] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const newPriceMinor = parseRupiahInput(rawPrice);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await productsApi.listProducts();
      setProducts(data || []);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [currentStoreId]);

  const handleOpenOverride = (product: Product) => {
    setSelectedProduct(product);
    setRawPrice(String(product.price_minor || product.base_price || 0));
    setReason('');
    setFormError(null);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !currentStoreId) return;

    if (newPriceMinor <= 0) {
      setFormError('Harga cabang harus lebih besar dari 0.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await productsApi.setBranchPrice(
        currentStoreId,
        selectedProduct.id,
        newPriceMinor,
        new Date().toISOString(),
        reason.trim() || undefined
      );

      toast(`Harga cabang untuk "${selectedProduct.name}" berhasil diperbarui!`, 'success');
      setSelectedProduct(null);
      await loadProducts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui harga cabang';
      setFormError(msg);
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Kustomisasi Harga Cabang</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Terapkan penyesuaian harga jual khusus untuk cabang {activeStoreName || 'ini'} (Store-Level Price Override).
          </p>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-sm font-bold text-emerald-950 shadow-sm">
          <StoreIcon className="w-5 h-5 text-emerald-700" />
          <span>{activeStoreName || 'Cabang Aktif'}</span>
        </div>
      </div>

      {/* Table of Products and Branch Prices */}
      {isLoading ? (
        <LoadingState message="Memuat harga produk cabang..." rows={5} />
      ) : products.length === 0 ? (
        <EmptyState
          title="Tidak Ada Produk"
          description="Tambahkan master produk terlebih dahulu di menu Master Produk."
        />
      ) : (
        <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-xs sm:text-sm">
                  <th className="py-4 px-5">SKU / Nama Produk</th>
                  <th className="py-4 px-5 text-right">Harga Dasar (Nasional)</th>
                  <th className="py-4 px-5 text-right">Harga Khusus Cabang Ini</th>
                  <th className="py-4 px-5 text-center">Status Harga</th>
                  {canOverride && <th className="py-4 px-5 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {products.map((p) => {
                  const base = p.base_price || 0;
                  const branch = p.price_minor || base;
                  const isOverridden = branch !== base;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 text-base sm:text-lg">{p.name}</div>
                        <div className="text-xs text-slate-500 font-mono font-semibold">{p.sku}</div>
                      </td>
                      <td className="py-4 px-5 text-right font-mono">
                        <MoneyText amount={base} size="md" variant="muted" className="text-base" />
                      </td>
                      <td className="py-4 px-5 text-right font-mono">
                        <MoneyText
                          amount={branch}
                          size="md"
                          variant="default"
                          className={isOverridden ? 'text-emerald-700 font-black text-lg' : 'text-slate-900 font-bold text-base'}
                        />
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${
                            isOverridden
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isOverridden ? 'Harga Cabang Khusus' : 'Harga Standar'}
                        </span>
                      </td>
                      {canOverride && (
                        <td className="py-4 px-5 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Edit3 className="w-4 h-4 text-slate-600" />}
                            onClick={() => handleOpenOverride(p)}
                            className="font-bold"
                          >
                            Ubah Harga
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Override Price Modal */}
      {selectedProduct && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedProduct(null)}
          title="Ubah Harga Khusus Cabang"
          description={`Atur harga jual produk "${selectedProduct.name}" khusus untuk cabang ${activeStoreName}.`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setSelectedProduct(null)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button variant="primary" size="lg" isLoading={isSubmitting} onClick={handleSaveOverride} className="font-bold">
                Simpan Harga Cabang
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSaveOverride} className="space-y-4">
            {formError && (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-base font-bold text-rose-800">
                {formError}
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-600">Harga Dasar Nasional:</span>
              <MoneyText amount={selectedProduct.base_price || 0} size="lg" className="font-bold text-slate-900" />
            </div>

            <Input
              label="Harga Jual Khusus Cabang (IDR)"
              placeholder="0"
              size="lg"
              leftIcon={<DollarSign className="w-5 h-5 text-slate-500" />}
              value={rawPrice}
              onChange={(e) => setRawPrice(e.target.value)}
              helperText={`Terbaca: ${formatRupiah(newPriceMinor)}`}
              required
              autoFocus
            />

            <Input
              label="Alasan Perubahan Harga (Opsional)"
              placeholder="Contoh: Penyesuaian UMR lokal / biaya sewa mall"
              size="lg"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </form>
        </Dialog>
      )}
    </div>
  );
};
