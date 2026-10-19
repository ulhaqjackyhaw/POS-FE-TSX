import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { productsApi } from '../../../api/products.api';
import { useToast } from '../../../components/feedback/Toast';
import {
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface ParsedProductRow {
  sku: string;
  name: string;
  barcode?: string;
  unit: string;
  base_price: number;
  isValid: boolean;
  error?: string;
}

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportProductsModal: React.FC<ImportProductsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedProductRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSummary, setImportSummary] = useState<{ success: number; failed: number } | null>(null);

  const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
    const templateData = [
      {
        sku: 'PRD-SAMPLE-01',
        nama_produk: 'Kopi Robusta Lampung 250gr',
        barcode: '8991001001',
        satuan: 'pack',
        harga_dasar: 25000,
      },
      {
        sku: 'PRD-SAMPLE-02',
        nama_produk: 'Susu UHT Full Cream 1L',
        barcode: '8991001002',
        satuan: 'kotak',
        harga_dasar: 18000,
      },
      {
        sku: 'PRD-SAMPLE-03',
        nama_produk: 'Gula Pasir Kristal 1kg',
        barcode: '8991001003',
        satuan: 'kg',
        harga_dasar: 16500,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master_Produk');

    const extension = format === 'xlsx' ? 'xlsx' : 'csv';
    const bookType = format === 'xlsx' ? 'xlsx' : 'csv';
    XLSX.writeFile(workbook, `template_master_produk.${extension}`, { bookType });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportSummary(null);

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

        const seenSkus = new Set<string>();
        const parsedRows: ParsedProductRow[] = rawJson.map((row) => {
          // Normalize column headers
          const rawSku = String(row.sku || row.SKU || row['Kode Produk'] || '').trim();
          const rawName = String(row.nama_produk || row.name || row.Nama || row['Nama Produk'] || '').trim();
          const rawBarcode = String(row.barcode || row.Barcode || '').trim();
          const rawUnit = String(row.satuan || row.unit || row.Satuan || 'pcs').trim();
          const rawPrice = Number(row.harga_dasar || row.base_price || row.harga || row.Harga || 0);

          let isValid = true;
          let error = '';

          if (!rawSku) {
            isValid = false;
            error = 'SKU wajib diisi';
          } else if (seenSkus.has(rawSku.toUpperCase())) {
            isValid = false;
            error = 'SKU duplikat dalam file';
          } else if (!rawName) {
            isValid = false;
            error = 'Nama produk wajib diisi';
          } else if (isNaN(rawPrice) || rawPrice < 0) {
            isValid = false;
            error = 'Harga dasar tidak valid';
          }

          if (rawSku) {
            seenSkus.add(rawSku.toUpperCase());
          }

          return {
            sku: rawSku.toUpperCase(),
            name: rawName,
            barcode: rawBarcode || undefined,
            unit: rawUnit || 'pcs',
            base_price: isNaN(rawPrice) ? 0 : rawPrice,
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
    if (validRows.length === 0) {
      toast('Tidak ada data valid untuk diimpor.', 'warning');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: validRows.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await productsApi.createProduct({
          sku: row.sku,
          name: row.name,
          barcode: row.barcode,
          unit: row.unit,
          base_price: row.base_price,
          is_active: true,
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
      toast(`Berhasil mengimpor ${successCount} produk baru!`, 'success');
      onSuccess();
    } else {
      toast('Gagal mengimpor produk. Periksa kembali koneksi atau duplikasi SKU.', 'error');
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
      title="Upload Master Produk (Excel / CSV)"
      description="Impor banyak data master produk sekaligus menggunakan template file Excel (.xlsx) atau CSV."
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
              Impor {validRows.length} Produk
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
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
              Mendukung file format <strong>.xlsx</strong>, <strong>.xls</strong>, dan <strong>.csv</strong>
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
              <span>Mengimpor master produk...</span>
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
                Preview Data ({rows.length} baris)
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
                    <th className="py-2.5 px-3">Barcode</th>
                    <th className="py-2.5 px-3">Satuan</th>
                    <th className="py-2.5 px-3 text-right">Harga Dasar</th>
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
                      <td className="py-2 px-3 font-semibold text-slate-800">{r.name}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{r.barcode || '-'}</td>
                      <td className="py-2 px-3 font-semibold text-slate-600">{r.unit}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        Rp {r.base_price.toLocaleString('id-ID')}
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
