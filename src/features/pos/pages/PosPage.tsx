import React, { useState, useEffect } from 'react';
import { usePosStore } from '../pos.store';
import { useQuote } from '../hooks/useQuote';
import { usePosShortcuts } from '../hooks/usePosShortcuts';
import { productsApi } from '../../../api/products.api';
import { Product } from '../../../types/api';
import { useAppContextStore } from '../../../stores/app-context.store';
import { useToast } from '../../../components/feedback/Toast';
import { BarcodeInput } from '../../../components/scanner/BarcodeInput';
import { ShoppingBag, ChevronUp } from 'lucide-react';
import { ProductGrid } from '../components/ProductGrid';
import { CartPanel } from '../components/CartPanel';
import { PaymentDialog } from '../components/PaymentDialog';
import { ReceiptView, ReceiptData } from '../components/ReceiptView';
import { cacheCatalogProducts, getCachedProducts } from '../../../db/indexeddb';

// Fallback demo retail items for instant testing & demonstration
const DEFAULT_DEMO_PRODUCTS: Product[] = [
  {
    id: 'prod-kopi-01',
    sku: 'SKU-KOPI-01',
    barcode: '899123456001',
    name: 'Kopi Susu Gula Aren 250ml',
    unit: 'cup',
    base_price: 18000,
    price_minor: 18000,
    category_name: 'Minuman',
    is_active: true,
  },
  {
    id: 'prod-teh-02',
    sku: 'SKU-TEH-02',
    barcode: '899123456002',
    name: 'Es Teh Manis Melati Jumbo',
    unit: 'cup',
    base_price: 8000,
    price_minor: 8000,
    category_name: 'Minuman',
    is_active: true,
  },
  {
    id: 'prod-snack-03',
    sku: 'SKU-SNK-03',
    barcode: '899123456003',
    name: 'Keripik Kentang Balado 100g',
    unit: 'pack',
    base_price: 12500,
    price_minor: 12500,
    category_name: 'Makanan Ringan',
    is_active: true,
  },
  {
    id: 'prod-roti-04',
    sku: 'SKU-ROTI-04',
    barcode: '899123456004',
    name: 'Roti Panggang Cokelat Keju',
    unit: 'pcs',
    base_price: 15000,
    price_minor: 15000,
    category_name: 'Makanan',
    is_active: true,
  },
  {
    id: 'prod-air-05',
    sku: 'SKU-AIR-05',
    barcode: '899123456005',
    name: 'Air Mineral Pegunungan 600ml',
    unit: 'botol',
    base_price: 4500,
    price_minor: 4500,
    category_name: 'Minuman',
    is_active: true,
  },
  {
    id: 'prod-mie-06',
    sku: 'SKU-MIE-06',
    barcode: '899123456006',
    name: 'Mie Instan Goreng Spesial',
    unit: 'porsi',
    base_price: 13000,
    price_minor: 13000,
    category_name: 'Makanan',
    is_active: true,
  },
];

export const PosPage: React.FC = () => {
  const { activeStoreId } = useAppContextStore();
  const { cart, addItem, clearCart } = usePosStore();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const {
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor,
    quoteId,
    warnings,
    isQuoteLoading,
  } = useQuote();

  // Load products from API, or IndexedDB cache if offline
  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const data = await productsApi.listProducts();
      if (data && data.length > 0) {
        setProducts(data);
        if (activeStoreId) {
          // Cache to IndexedDB for offline capability
          await cacheCatalogProducts(
            activeStoreId,
            data.map((p) => ({ ...p, store_id: activeStoreId, cached_at: new Date().toISOString() }))
          );
        }
      } else {
        // Check IndexedDB
        if (activeStoreId) {
          const cached = await getCachedProducts(activeStoreId);
          if (cached && cached.length > 0) {
            setProducts(cached);
          } else {
            setProducts(DEFAULT_DEMO_PRODUCTS);
          }
        } else {
          setProducts(DEFAULT_DEMO_PRODUCTS);
        }
      }
    } catch {
      // Offline fallback: load from IndexedDB
      if (activeStoreId) {
        try {
          const cached = await getCachedProducts(activeStoreId);
          if (cached && cached.length > 0) {
            setProducts(cached);
          } else {
            setProducts(DEFAULT_DEMO_PRODUCTS);
          }
        } catch {
          setProducts(DEFAULT_DEMO_PRODUCTS);
        }
      } else {
        setProducts(DEFAULT_DEMO_PRODUCTS);
      }
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [activeStoreId]);

  const handleBarcodeScan = (barcodeOrSku: string) => {
    const clean = barcodeOrSku.toLowerCase().trim();
    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === clean) ||
        p.sku.toLowerCase() === clean ||
        p.name.toLowerCase().includes(clean)
    );

    if (found) {
      const stock = found.current_stock ?? found.stock;
      if (stock !== undefined && stock <= 0) {
        toast(`Stok ${found.name} habis (0)`, 'error');
        return;
      }

      addItem({
        productId: found.id,
        sku: found.sku,
        barcode: found.barcode,
        name: found.name,
        unitPriceMinor: found.effective_price || found.price_minor || found.base_price || 0,
      });
      toast(`+1 ${found.name} ditambahkan`, 'info');
    } else {
      toast(`Produk "${barcodeOrSku}" tidak ditemukan`, 'warning');
    }
  };

  const handleAddToCart = (product: Product) => {
    const stock = product.current_stock ?? product.stock;
    if (stock !== undefined && stock <= 0) {
      toast(`Stok ${product.name} habis (0)`, 'error');
      return;
    }

    addItem({
      productId: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      unitPriceMinor: product.effective_price || product.price_minor || product.base_price || 0,
    });
  };

  // Keyboard Shortcuts Hook
  usePosShortcuts({
    onFocusSearch: () => {
      const searchInput =
        document.getElementById('pos-barcode-input') as HTMLInputElement ||
        document.querySelector<HTMLInputElement>('#pos-barcode-input, input[placeholder*="Ketik nama"], input[placeholder*="barcode"]');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    },
    onOpenDiscount: () => {
      // Trigger cart discount
    },
    onOpenPayment: () => {
      if (cart.length > 0) {
        setIsPaymentOpen(true);
      }
    },
    onClearCart: () => {
      if (cart.length > 0 && window.confirm('Bersihkan keranjang kasir?')) {
        clearCart();
      }
    },
    canPay: cart.length > 0,
    isModalOpen: isPaymentOpen || !!receiptData,
  });

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="relative flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Left Pane (~60%): Search Barcode & Product Catalog */}
      <div className="flex-1 flex flex-col p-3 sm:p-5 lg:p-6 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 space-y-3 sm:space-y-4 pb-20 lg:pb-6">
        {/* Top Search & Barcode Wedge Input with Auto-suggestion */}
        <BarcodeInput
          products={products}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onScan={handleBarcodeScan}
          onSelectProduct={(product) => {
            handleAddToCart(product);
            setSearchQuery('');
          }}
          placeholder="Ketik nama / SKU produk atau scan barcode scanner (F1)..."
          autoFocus
        />

        {/* Product Catalog Grid - filtered in real-time when user types */}
        <div className="flex-1 overflow-hidden">
          <ProductGrid
            products={
              searchQuery.trim()
                ? products.filter(
                    (p) =>
                      p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                      p.sku.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.trim().toLowerCase()))
                  )
                : products
            }
            isLoading={isLoadingProducts}
            onAddToCart={handleAddToCart}
            onSeedDemo={() => setProducts(DEFAULT_DEMO_PRODUCTS)}
          />
        </div>
      </div>

      {/* Mobile Sticky Cart Trigger Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t-2 border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xl">
        <div
          onClick={() => setIsMobileCartOpen(true)}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="relative p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-700/25">
            <ShoppingBag className="w-5 h-5" />
            {totalItemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {totalItemCount}
              </span>
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">Keranjang ({totalItemCount} item)</div>
            <div className="text-base font-black text-slate-900 leading-tight">
              Rp {totalMinor.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Buka Keranjang</span>
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            disabled={cart.length === 0}
            onClick={() => {
              if (cart.length > 0) {
                setIsPaymentOpen(true);
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs sm:text-sm font-extrabold cursor-pointer transition-all shadow-md shadow-emerald-700/20 disabled:cursor-not-allowed"
          >
            Bayar
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Backdrop for Cart */}
      {isMobileCartOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsMobileCartOpen(false)}
        />
      )}

      {/* Right Pane: Cart Panel (Drawer on Mobile, Sidebar on Desktop) */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] md:w-[460px] bg-white transition-transform duration-300 ease-in-out lg:static lg:w-[440px] xl:w-[480px] lg:z-auto lg:h-full lg:translate-x-0 ${
          isMobileCartOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <CartPanel
          subtotalMinor={subtotalMinor}
          discountMinor={discountMinor}
          taxMinor={taxMinor}
          totalMinor={totalMinor}
          isQuoteLoading={isQuoteLoading}
          warnings={warnings}
          onOpenPayment={() => {
            setIsMobileCartOpen(false);
            setIsPaymentOpen(true);
          }}
          canPay={cart.length > 0}
          onCloseMobile={() => setIsMobileCartOpen(false)}
        />
      </div>

      {/* Payment Cash Modal */}
      {isPaymentOpen && (
        <PaymentDialog
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          totalMinor={totalMinor}
          subtotalMinor={subtotalMinor}
          discountMinor={discountMinor}
          taxMinor={taxMinor}
          quoteId={quoteId}
          onSuccess={(receipt) => {
            setReceiptData(receipt);
          }}
        />
      )}

      {/* Thermal Receipt Modal */}
      {receiptData && (
        <ReceiptView
          isOpen={true}
          onClose={() => setReceiptData(null)}
          data={receiptData}
          onNewTransaction={() => setReceiptData(null)}
        />
      )}
    </div>
  );
};
