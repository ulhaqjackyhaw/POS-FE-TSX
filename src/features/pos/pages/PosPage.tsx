import React, { useState, useEffect } from 'react';
import { usePosStore } from '../pos.store';
import { useQuote } from '../hooks/useQuote';
import { usePosShortcuts } from '../hooks/usePosShortcuts';
import { productsApi } from '../../../api/products.api';
import { Product } from '../../../types/api';
import { useAppContextStore } from '../../../stores/app-context.store';
import { useToast } from '../../../components/feedback/Toast';
import { BarcodeInput } from '../../../components/scanner/BarcodeInput';
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
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
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
      addItem({
        productId: found.id,
        sku: found.sku,
        barcode: found.barcode,
        name: found.name,
        unitPriceMinor: found.price_minor || found.base_price || 0,
      });
      toast(`+1 ${found.name} ditambahkan`, 'info');
    } else {
      toast(`Produk "${barcodeOrSku}" tidak ditemukan`, 'warning');
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem({
      productId: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      unitPriceMinor: product.price_minor || product.base_price || 0,
    });
  };

  // Keyboard Shortcuts Hook
  usePosShortcuts({
    onFocusSearch: () => {
      const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Scan barcode"]');
      searchInput?.focus();
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

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Left Pane (~60%): Search Barcode & Product Catalog */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 space-y-4">
        {/* Top Search & Barcode Wedge Input */}
        <BarcodeInput
          onScan={handleBarcodeScan}
          placeholder="Scan barcode scanner atau ketik SKU / Nama produk (F1)..."
          autoFocus
        />

        {/* Product Catalog Grid */}
        <div className="flex-1 overflow-hidden">
          <ProductGrid
            products={products}
            isLoading={isLoadingProducts}
            onAddToCart={handleAddToCart}
            onSeedDemo={() => setProducts(DEFAULT_DEMO_PRODUCTS)}
          />
        </div>
      </div>

      {/* Right Pane (~40%): Cart, Calculation & Pay */}
      <div className="w-full lg:w-[460px] xl:w-[500px] shrink-0 h-full overflow-hidden flex flex-col bg-white">
        <CartPanel
          subtotalMinor={subtotalMinor}
          discountMinor={discountMinor}
          taxMinor={taxMinor}
          totalMinor={totalMinor}
          isQuoteLoading={isQuoteLoading}
          warnings={warnings}
          onOpenPayment={() => setIsPaymentOpen(true)}
          canPay={cart.length > 0}
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
