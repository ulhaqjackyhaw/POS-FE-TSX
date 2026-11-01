import React, { useState } from 'react';
import { Product } from '../../../types/api';
import { MoneyText } from '../../../components/data-display/MoneyText';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { Plus, Coffee, Sparkles, Ban } from 'lucide-react';

export interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
  onAddToCart: (product: Product) => void;
  onSeedDemo?: () => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading,
  onAddToCart,
  onSeedDemo,
}) => {
  const [activeTab, setActiveTab] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category_name || 'Umum')))];

  const filteredProducts = products.filter((p) => {
    if (activeTab === 'all') return true;
    const cat = p.category_name || 'Umum';
    return cat === activeTab;
  });

  if (isLoading) {
    return <LoadingState message="Memuat katalog produk cabang..." type="card" rows={8} />;
  }

  if (products.length === 0) {
    return (
      <div className="h-full flex flex-col justify-center items-center p-8 bg-white rounded-3xl border-2 border-dashed border-slate-300">
        <EmptyState
          title="Belum Ada Produk di Katalog Cabang"
          description="Tambahkan master produk di menu Backoffice atau klik tombol di bawah untuk mengisi contoh produk retail cepat."
        />
        {onSeedDemo && (
          <button
            onClick={onSeedDemo}
            className="mt-5 inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold shadow-lg shadow-emerald-700/20 cursor-pointer transition-all"
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>Muat Contoh Produk Retail Cepat</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3.5">
      {/* Category Tabs */}
      {categories.length > 2 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-extrabold whitespace-nowrap transition-all cursor-pointer shadow-sm ${
                activeTab === cat
                  ? 'bg-emerald-600 text-white shadow-emerald-700/20'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
              }`}
            >
              {cat === 'all' ? 'Semua Kategori' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Product Cards Grid with Large Font and Touch Targets */}
      <div className="grid grid-cols-1 min-[440px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-3.5 overflow-y-auto pr-1 flex-1">
        {filteredProducts.map((p) => {
          const price = p.effective_price || p.price_minor || p.base_price || 0;
          const stock = p.current_stock ?? p.stock;
          const isOutOfStock = stock !== undefined && stock <= 0;

          return (
            <div
              key={p.id}
              onClick={() => {
                if (!isOutOfStock) {
                  onAddToCart(p);
                }
              }}
              className={`group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all select-none shadow-sm ${
                isOutOfStock
                  ? 'bg-rose-50/70 border-rose-300 opacity-90 cursor-not-allowed hover:border-rose-400'
                  : 'bg-white hover:bg-emerald-50/40 border-slate-200 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-950/10 cursor-pointer active:scale-[0.98]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                      isOutOfStock
                        ? 'bg-rose-100 border-rose-200 text-rose-600'
                        : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    {isOutOfStock ? <Ban className="w-5 h-5 text-rose-600" /> : <Coffee className="w-5 h-5" />}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {p.sku}
                    </span>
                    {isOutOfStock && (
                      <span className="text-[11px] font-black uppercase tracking-wider text-white bg-rose-600 px-2 py-0.5 rounded-md shadow-xs animate-pulse">
                        Stok Habis (0)
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`font-extrabold text-base sm:text-lg line-clamp-2 leading-snug transition-colors ${
                    isOutOfStock
                      ? 'text-rose-950 line-through decoration-rose-400'
                      : 'text-slate-900 group-hover:text-emerald-700'
                  }`}
                >
                  {p.name}
                </div>
              </div>

              <div
                className={`mt-4 pt-3 border-t-2 flex items-center justify-between ${
                  isOutOfStock ? 'border-rose-200' : 'border-slate-100'
                }`}
              >
                <div>
                  <MoneyText amount={price} size="md" variant={isOutOfStock ? 'muted' : 'success'} />
                  <div
                    className={`text-xs font-semibold mt-0.5 ${
                      isOutOfStock ? 'text-rose-600 font-bold' : 'text-slate-500'
                    }`}
                  >
                    {isOutOfStock ? 'Habis (0 ' + (p.unit || 'pcs') + ')' : (stock !== undefined ? `Sisa ${stock} ${p.unit || 'pcs'}` : (p.unit || 'pcs'))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm font-bold ${
                    isOutOfStock
                      ? 'bg-rose-200 text-rose-500 cursor-not-allowed border border-rose-300'
                      : 'bg-slate-100 group-hover:bg-emerald-600 text-slate-700 group-hover:text-white cursor-pointer'
                  }`}
                  title={isOutOfStock ? 'Stok produk ini habis' : 'Tambah ke Keranjang'}
                >
                  {isOutOfStock ? <Ban className="w-5 h-5 text-rose-500" /> : <Plus className="w-5 h-5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
