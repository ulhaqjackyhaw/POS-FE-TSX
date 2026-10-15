import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode, Search } from 'lucide-react';

export interface BarcodeInputProps {
  onScan: (barcodeOrSku: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const BarcodeInput: React.FC<BarcodeInputProps> = ({
  onScan,
  placeholder = 'Scan barcode scanner atau ketik SKU / Nama (F1)...',
  autoFocus = false,
  className = '',
}) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = value.trim();
    if (clean) {
      onScan(clean);
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`relative flex items-center ${className}`}>
      <div className="absolute left-4 text-emerald-600 pointer-events-none flex items-center">
        <ScanBarcode className="w-6 h-6 shrink-0" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white text-slate-900 placeholder-slate-400 text-base sm:text-lg font-bold pl-14 pr-28 py-3.5 sm:py-4 rounded-2xl border-2 border-slate-300 hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20 focus:outline-none transition-all shadow-sm"
      />
      <div className="absolute right-3 flex items-center gap-2">
        <kbd className="hidden sm:inline-block px-2.5 py-1 text-xs font-mono font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-lg shadow-sm">
          F1
        </kbd>
        <button
          type="submit"
          className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-700/20 transition-colors cursor-pointer"
          title="Cari atau Tambah ke Keranjang"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
};
