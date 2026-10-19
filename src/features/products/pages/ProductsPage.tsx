import React, { useState, useEffect } from 'react';
import { productsApi } from '../../../api/products.api';
import { Product } from '../../../types/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Dialog } from '../../../components/ui/Dialog';
import { MoneyText } from '../../../components/data-display/MoneyText';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../components/feedback/Toast';
import { usePermission } from '../../../hooks/usePermission';
import { Plus, Search, Check, Tag, Upload } from 'lucide-react';
import { parseRupiahInput, formatRupiah } from '../../../utils/currency';
import { ImportProductsModal } from '../components/ImportProductsModal';

export const ProductsPage: React.FC = () => {
  const { check, isOwnerOrAdmin } = usePermission();
  const canCreate = isOwnerOrAdmin || check('product.create') || check('catalog:write');
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form states for Create Product
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [rawPrice, setRawPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const priceMinor = parseRupiahInput(rawPrice);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await productsApi.listProducts({ search: search.trim() || undefined });
      setProducts(data || []);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [search]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      setFormError('SKU dan Nama Produk wajib diisi.');
      return;
    }
    if (priceMinor < 0) {
      setFormError('Harga dasar produk tidak boleh negatif.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await productsApi.createProduct({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        barcode: barcode.trim() || undefined,
        unit: unit.trim() || 'pcs',
        base_price: priceMinor,
        is_active: true,
      });

      toast('Master produk baru berhasil ditambahkan!', 'success');
      setIsModalOpen(false);
      setSku('');
      setName('');
      setBarcode('');
      setRawPrice('');
      await loadProducts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat produk';
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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Master Katalog Produk</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Kelola master data produk retail, SKU, barcode, satuan jual, dan harga dasar nasional.
          </p>
        </div>

        {canCreate && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              leftIcon={<Upload className="w-5 h-5 text-emerald-600" />}
              onClick={() => setIsImportModalOpen(true)}
              className="font-bold shadow-sm"
            >
              Upload Excel / CSV
            </Button>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Plus className="w-5 h-5" />}
              onClick={() => setIsModalOpen(true)}
              className="font-bold shadow-md"
            >
              Tambah Produk Baru
            </Button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3">
        <div className="w-full max-w-md">
          <Input
            placeholder="Cari SKU, barcode, atau nama produk..."
            size="lg"
            leftIcon={<Search className="w-5 h-5 text-slate-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <LoadingState message="Memuat data master produk..." rows={6} />
      ) : products.length === 0 ? (
        <EmptyState
          title="Tidak Ada Produk Ditemukan"
          description={
            search
              ? `Tidak ditemukan produk yang cocok dengan pencarian "${search}".`
              : 'Belum ada master produk yang terdaftar dalam katalog toko.'
          }
          actionLabel={canCreate ? 'Tambah Produk Pertama' : undefined}
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-xs sm:text-sm">
                  <th className="py-4 px-5">SKU / Barcode</th>
                  <th className="py-4 px-5">Nama Produk</th>
                  <th className="py-4 px-5">Kategori</th>
                  <th className="py-4 px-5">Satuan</th>
                  <th className="py-4 px-5 text-right">Harga Dasar</th>
                  <th className="py-4 px-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono">
                      <div className="font-bold text-slate-900 text-base">{p.sku}</div>
                      {p.barcode && <div className="text-xs text-slate-500 font-semibold">{p.barcode}</div>}
                    </td>
                    <td className="py-4 px-5 font-bold text-slate-900 text-base sm:text-lg">{p.name}</td>
                    <td className="py-4 px-5">
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-900 font-bold text-xs sm:text-sm">
                        {p.category_name || 'Umum'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-700 font-medium text-sm sm:text-base">{p.unit || 'pcs'}</td>
                    <td className="py-4 px-5 text-right">
                      <MoneyText amount={p.base_price || 0} size="md" variant="default" className="text-emerald-700 font-black text-lg" />
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs sm:text-sm">
                        <Check className="w-4 h-4" /> Aktif
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Master Produk Baru"
        description="Daftarkan item produk retail baru ke database master toko."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="ghost" size="lg" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button variant="primary" size="lg" isLoading={isSubmitting} onClick={handleCreateProduct} className="font-bold">
              Simpan Master Produk
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {formError && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-base font-bold text-rose-800">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Kode SKU (Wajib Unik)"
              placeholder="Contoh: SKU-KOPI-02"
              size="lg"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Barcode / EAN (Opsional)"
              placeholder="Contoh: 899123456789"
              size="lg"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </div>

          <Input
            label="Nama Produk Retail (Wajib)"
            placeholder="Contoh: Kopi Susu Aren Botol 1 Liter"
            size="lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Satuan Jual"
              placeholder="pcs, cup, box, botol"
              size="lg"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
            />
            <Input
              label="Harga Dasar Nasional (IDR)"
              placeholder="0"
              size="lg"
              leftIcon={<Tag className="w-5 h-5 text-slate-500" />}
              value={rawPrice}
              onChange={(e) => setRawPrice(e.target.value)}
              helperText={`Terbaca: ${formatRupiah(priceMinor)}`}
              required
            />
          </div>
        </form>
      </Dialog>

      {/* Import Products Modal (Excel / CSV) */}
      <ImportProductsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadProducts}
      />
    </div>
  );
};
