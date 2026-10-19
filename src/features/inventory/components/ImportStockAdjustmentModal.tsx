import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { inventoryApi } from '../../../api/inventory.api';
import { Product } from '../../../types/api';
import { useToast } from '../../../components/feedback/Toast';
import {
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Store as StoreIcon,
} from 'lucide-react';

interface ParsedStockRow {
  sku: string;
  product_id: string;
  product_name: string;
  type: 'TAMBAH' | 'KURANG';
  quantity: number;
  quantity_delta: number;
  reason: string;
  reference?: string;
  isValid: boolean;
  error?: string;
}

interface ImportStockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStoreId: string;
  activeStoreName?: string;
  products: Product[];
  onSuccess: () => void;
}

export const ImportStockAdjustmentModal: React.FC<ImportStockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  activeStoreId,
  activeStoreName,
  products,
  onSuccess,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedStockRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSummary, setImportSummary] = useState<{ success: number; failed: number } | null>(null);

  const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
    const templateData = [
      {
        sku: 'PRD-SAMPLE-01',
        nama_produk: 'Kopi Robusta Lampung 250gr',
        tipe_penyesuaian: 'TAMBAH',
        jumlah: 50,
        alasan: 'Penerimaan barang dari supplier',
        referensi: 'SJ-2026-001',
      },
      {
        sku: 'PRD-SAMPLE-02',
        nama_produk: 'Susu UHT Full Cream 1L',
        tipe_penyesuaian: 'TAMBAH',
        jumlah: 30,
        alasan: 'Stok awal pembukaan cabang',
        referensi: 'REF-INIT',
      },
      {
        sku: 'PRD-SAMPLE-03',
        nama_produk: 'Gula Pasir Kristal 1kg',
        tipe_penyesuaian: 'KURANG',
        jumlah: 5,
        alasan: 'Barang rusak kemasan bocor',
        referensi: 'OPNAME-01',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Penyesuaian_Stok');

    const extension = format === 'xlsx' ? 'xlsx' : 'csv';
    const bookType = format === 'xlsx' ? 'xlsx' : 'csv';
    XLSX.writeFile(workbook, `template_penyesuaian_stok.${extension}`, { bookType });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportSummary(null);

    const productMap = new Map<string, Product>();
    products.forEach((p) => {
      productMap.set(p.sku.toUpperCase(), p);
      if (p.barcode) productMap.set(p.barcode.toUpperCase(), p);
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          toast('File Excel/CSV kosong atau format tidak sesuai.', 'error');
          setRows([]);
          return;
        }

        const parsedRows: ParsedStockRow[] = rawJson.map((row) => {
          const rawSku = String(row.sku || row.SKU || row['Kode Produk'] || row.barcode || '').trim().toUpperCase();
          const rawType = String(row.tipe_penyesuaian || row.type || row.aksi || 'TAMBAH').trim().toUpperCase();
          const rawQty = Math.abs(parseInt(String(row.jumlah || row.qty || row.quantity || 0), 10));
          const rawReason = String(row.alasan || row.reason || row.keterangan || '').trim();
          const rawRef = String(row.referensi || row.reference || row.no_ref || '').trim();

          const isSub = rawType === 'KURANG' || rawType === 'SUBTRACT' || rawType === '-' || rawType === 'KELUAR';
          const qtyDelta = isSub ? -rawQty : rawQty;

          let isValid = true;
          let error = '';

          const matchedProd = productMap.get(rawSku);

          if (!rawSku) {
            isValid = false;
            error = 'SKU wajib diisi';
          } else if (!matchedProd) {
            isValid = false;
            error = `SKU '${rawSku}' tidak terdaftar di Master Produk`;
          } else if (isNaN(rawQty) || rawQty <= 0) {
            isValid = false;
            error = 'Jumlah harus berupa angka lebih dari 0';
          } else if (!rawReason) {
            isValid = false;
            error = 'Alasan penyesuaian wajib diisi';
          }

          return {
            sku: rawSku,
            product_id: matchedProd?.id || '',
            product_name: matchedProd?.name || String(row.nama_produk || '-'),
            type: isSub ? 'KURANG' : 'TAMBAH',
            quantity: rawQty,
            quantity_delta: qtyDelta,
            reason: rawReason,
            reference: rawRef || undefined,
            isValid,
            error,
          };
        });

        setRows(parsedRows);
      } catch (err) {
        toast('Gagal membaca file Excel/CSV. Pastikan format valid.', 'error');
        setRows([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleReset = () => {
    setFileName(null);
    setRows([]);
    setImportSummary(null);
    setProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validRows = rows.filter((r) => r.isValid);
  const invalidRows = rows.filter((r) => !r.isValid);

  const handleStartImport = async () => {
    if (!activeStoreId) {
      toast('Cabang toko aktif belum dipilih.', 'error');
      return;
    }

    if (validRows.length === 0) {
      toast('Tidak ada data valid untuk disesuaikan.', 'warning');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: validRows.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await inventoryApi.adjustStock({
          store_id: activeStoreId,
          product_id: row.product_id,
          quantity_delta: row.quantity_delta,
          reason: row.reason,
          reference: row.reference,
        });
        successCount++;
      } catch {
        failCount++;
      }
      setProgress({ current: i + 1, total: validRows.length });
    }

    setIsProcessing(false);
    setImportSummary({ success: successCount, failed: failCount });

    if (successCount > 0) {
      toast(`Berhasil memproses ${successCount} penyesuaian stok!`, 'success');
      onSuccess();
    } else {
      toast('Gagal memproses penyesuaian stok. Periksa saldo stok atau hak akses.', 'error');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isProcessing) {
          handleReset();
          onClose();
        }
      }}
      title="Import Penyesuaian Stok Langsung (Excel / CSV)"
      description="Tambah atau kurangi stok produk cabang secara massal menggunakan file Excel (.xlsx) atau CSV."
      maxWidth="2xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Download Template:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5 text-emerald-600" />}
              onClick={() => handleDownloadTemplate('xlsx')}
              className="text-xs font-bold"
            >
              Excel (.xlsx)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5 text-emerald-600" />}
              onClick={() => handleDownloadTemplate('csv')}
              className="text-xs font-bold"
            >
              CSV
            </Button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                handleReset();
                onClose();
              }}
              disabled={isProcessing}
            >
              Tutup
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={handleStartImport}
              disabled={validRows.length === 0 || isProcessing}
              isLoading={isProcessing}
              className="font-bold"
            >
              Proses {validRows.length} Penyesuaian
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Branch Context Banner */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
          <StoreIcon className="w-5 h-5 text-emerald-700" />
          <div>
            <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Target Cabang Penyesuaian:</div>
            <div className="text-sm font-black text-emerald-950">{activeStoreName || 'Cabang Aktif'}</div>
          </div>
        </div>

        {/* Step 1: Upload Box */}
        {!fileName ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl p-8 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-3">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-slate-800 text-base">Pilih atau Seret File Excel / CSV</h4>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Gunakan template yang disediakan untuk format kolom <strong>sku</strong>, <strong>tipe_penyesuaian</strong>, <strong>jumlah</strong>, dan <strong>alasan</strong>
            </p>
          </div>
        ) : (
          <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">{fileName}</div>
                <div className="text-xs text-slate-500">
                  Total baris: {rows.length} &bull; Valid: <span className="text-emerald-700 font-bold">{validRows.length}</span> &bull; Error: <span className="text-rose-600 font-bold">{invalidRows.length}</span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4 text-rose-500" />}
              onClick={handleReset}
              disabled={isProcessing}
              className="text-rose-600 hover:bg-rose-50 text-xs font-bold"
            >
              Ganti File
            </Button>
          </div>
        )}

        {/* Progress bar */}
        {progress && (
          <div className="space-y-1.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex justify-between text-xs font-bold text-emerald-900">
              <span>Memproses penyesuaian stok...</span>
              <span>{progress.current} / {progress.total} item</span>
            </div>
            <div className="w-full bg-emerald-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-200"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary notification */}
        {importSummary && (
          <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-slate-800">
                Selesai: <strong className="text-emerald-700 font-bold">{importSummary.success} berhasil</strong>,{' '}
                <strong className="text-rose-600 font-bold">{importSummary.failed} gagal</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Preview Table */}
        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Preview Penyesuaian ({rows.length} baris)
              </span>
              {invalidRows.length > 0 && (
                <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {invalidRows.length} baris tidak valid akan dilewati
                </span>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto border-2 border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Nama Produk</th>
                    <th className="py-2.5 px-3 text-center">Aksi / Qty</th>
                    <th className="py-2.5 px-3">Alasan & Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((r, idx) => (
                    <tr key={idx} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                      <td className="py-2 px-3">
                        {r.isValid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Siap
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold" title={r.error}>
                            <AlertCircle className="w-3.5 h-3.5" /> {r.error}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.sku}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{r.product_name}</td>
                      <td className="py-2 px-3 text-center font-mono font-black text-sm">
                        <span
                          className={`px-2 py-0.5 rounded-lg ${
                            r.type === 'TAMBAH'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.type === 'TAMBAH' ? `+${r.quantity}` : `-${r.quantity}`}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        <div className="font-semibold">{r.reason}</div>
                        {r.reference && <div className="text-slate-400 font-mono text-[10px]">Ref: {r.reference}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
