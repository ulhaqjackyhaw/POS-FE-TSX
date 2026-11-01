import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode, Search, X, ArrowRight } from 'lucide-react';
import { Product } from '../../types/api';

export interface BarcodeInputProps {
  products?: Product[];
  onScan: (barcodeOrSku: string) => void;
  onSelectProduct?: (product: Product) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const BarcodeInput: React.FC<BarcodeInputProps> = ({
  products = [],
  onScan,
  onSelectProduct,
  searchQuery,
  onSearchChange,
  placeholder = 'Ketik nama / SKU produk atau scan barcode scanner (F1)...',
  autoFocus = false,
  className = '',
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Filter suggestion list based on searchQuery
  const cleanQuery = searchQuery.trim().toLowerCase();
  const suggestions = cleanQuery.length > 0
    ? products
        .filter((p) => {
          const nameMatch = p.name.toLowerCase().includes(cleanQuery);
          const skuMatch = p.sku.toLowerCase().includes(cleanQuery);
          const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(cleanQuery) : false;
          return nameMatch || skuMatch || barcodeMatch;
        })
        .slice(0, 6)
    : [];

  useEffect(() => {
    // Reset selection when query changes
    setSelectedIndex(-1);
  }, [searchQuery]);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        if (trimmed) {
          onScan(trimmed);
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        // Select highlighted product from dropdown
        const chosen = suggestions[selectedIndex];
        if (onSelectProduct) {
          onSelectProduct(chosen);
        } else {
          onScan(chosen.sku);
        }
        setIsDropdownOpen(false);
      } else if (suggestions.length === 1 && suggestions[0].barcode?.toLowerCase() === cleanQuery) {
        // Exact hardware barcode scan
        onScan(cleanQuery);
        setIsDropdownOpen(false);
      } else if (suggestions.length > 0) {
        // User pressed Enter on search text: select the first match
        const chosen = suggestions[0];
        if (onSelectProduct) {
          onSelectProduct(chosen);
        } else {
          onScan(chosen.sku);
        }
        setIsDropdownOpen(false);
      } else {
        onScan(cleanQuery);
        setIsDropdownOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleSelect = (product: Product) => {
    if (onSelectProduct) {
      onSelectProduct(product);
    } else {
      onScan(product.sku);
    }
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-4 text-emerald-600 pointer-events-none flex items-center">
          <ScanBarcode className="w-6 h-6 shrink-0" />
        </div>

        <input
          id="pos-barcode-input"
          data-testid="pos-barcode-input"
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => {
            if (cleanQuery.length > 0) {
              setIsDropdownOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-white text-slate-900 placeholder-slate-400 text-sm sm:text-base font-bold pl-13 sm:pl-14 pr-24 sm:pr-28 py-3.5 sm:py-4 rounded-2xl border-2 border-slate-300 hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20 focus:outline-none transition-all shadow-sm"
        />

        <div className="absolute right-3 flex items-center gap-1.5 sm:gap-2">
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                setIsDropdownOpen(false);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <kbd className="hidden md:inline-block px-2.5 py-1 text-xs font-mono font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-lg shadow-sm">
            F1
          </kbd>

          <button
            type="button"
            onClick={() => {
              const trimmed = searchQuery.trim();
              if (trimmed) onScan(trimmed);
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-700/20 transition-colors cursor-pointer"
            title="Cari atau Tambah ke Keranjang"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Auto-suggest Dropdown List */}
      {isDropdownOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border-2 border-slate-200 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-2 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Saran Produk Cocok ({suggestions.length})</span>
            <span className="font-normal text-slate-400 lowercase">Gunakan panah &uarr;&darr; lalu Enter</span>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {suggestions.map((p, idx) => {
              const stock = p.current_stock ?? p.stock;
              const isOutOfStock = stock !== undefined && stock <= 0;
              const isSelected = selectedIndex === idx;
              const price = p.effective_price || p.price_minor || p.base_price || 0;

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-50/80 text-emerald-950' : 'hover:bg-slate-50'
                  } ${isOutOfStock ? 'opacity-70 bg-rose-50/30' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-700'
                          : isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {p.sku.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 truncate">
                          {p.name}
                        </span>
                        {isOutOfStock && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white shrink-0">
                            Habis
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{p.sku}</span>
                        {p.barcode && <span>&bull; {p.barcode}</span>}
                        {stock !== undefined && (
                          <span className={isOutOfStock ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            &bull; Sisa {stock} {p.unit || 'pcs'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <div className="text-sm font-black text-emerald-700">
                        Rp {price.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[11px] text-slate-400">/{p.unit || 'pcs'}</div>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
