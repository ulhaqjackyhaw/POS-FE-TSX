import React, { useState, useEffect, useMemo } from 'react';
import { reportsApi } from '../../../api/reports.api';
import { storesApi } from '../../../api/stores.api';
import { SalesReport, TopProductReport, TerminalReportResponse } from '../../../types/api';
import { Store } from '../../../types/store';
import { Card } from '../../../components/ui/Card';
import { MoneyText } from '../../../components/data-display/MoneyText';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { getTodayDateString } from '../../../utils/date';
import { useAppContextStore } from '../../../stores/app-context.store';
import { isGlobalRole } from '../../../utils/roleNavigation';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Percent,
  Coins,
  Award,
  Calendar,
  Store as StoreIcon,
  Monitor,
  Layers,
  ArrowDownRight,
  ShieldAlert,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { user, activeStoreId, activeStoreName } = useAppContextStore();
  const isGlobal = isGlobalRole(user?.role);

  const today = getTodayDateString();
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState(today);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    isGlobal ? '' : (activeStoreId || user?.store_ids?.[0] || '')
  );

  const [activeReportTab, setActiveReportTab] = useState<'terminals' | 'summary'>('terminals');
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');

  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductReport[]>([]);
  const [terminalReport, setTerminalReport] = useState<TerminalReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stores list if global role
  useEffect(() => {
    if (isGlobal) {
      storesApi.listStores().then(setStores).catch(() => {});
    }
  }, [isGlobal]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const storeParam = isGlobal ? selectedStoreId : (activeStoreId || user?.store_ids?.[0] || '');
      const [sales, top, termReport] = await Promise.all([
        reportsApi.getSalesReport({ from: fromDate, to: toDate, store_id: storeParam }),
        reportsApi.getTopProducts({ from: fromDate, to: toDate, store_id: storeParam }),
        reportsApi.getTerminalReports({ from: fromDate, to: toDate, store_id: storeParam }),
      ]);
      setSalesReport(sales);
      setTopProducts(top || []);
      setTerminalReport(termReport);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [fromDate, toDate, selectedStoreId]);

  const filteredDailyBreakdown = useMemo(() => {
    if (!terminalReport?.daily_breakdown) return [];
    if (!selectedTerminalId) return terminalReport.daily_breakdown;
    return terminalReport.daily_breakdown.filter((it) => it.terminal_id === selectedTerminalId);
  }, [terminalReport, selectedTerminalId]);

  const filteredTerminalSummary = useMemo(() => {
    if (!terminalReport?.summary) return [];
    if (!selectedTerminalId) return terminalReport.summary;
    return terminalReport.summary.filter((it) => it.terminal_id === selectedTerminalId);
  }, [terminalReport, selectedTerminalId]);

  const setQuickRange = (preset: 'today' | '7days' | '30days') => {
    const d = new Date();
    const toStr = d.toISOString().slice(0, 10);
    if (preset === 'today') {
      setFromDate(toStr);
      setToDate(toStr);
    } else if (preset === '7days') {
      const from = new Date(d);
      from.setDate(from.getDate() - 7);
      setFromDate(from.toISOString().slice(0, 10));
      setToDate(toStr);
    } else {
      const from = new Date(d);
      from.setDate(from.getDate() - 30);
      setFromDate(from.toISOString().slice(0, 10));
      setToDate(toStr);
    }
  };

  const totals = salesReport?.totals || {
    gross_sales: 0,
    discount: 0,
    tax: 0,
    net_sales: 0,
    transaction_count: 0,
    average_transaction: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header & Date / Branch Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Laporan Analitik & Penjualan Cabang
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Pantau performa penjualan, potongan diskon, dan penerimaan per terminal POS kasir per hari dan tanggal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Filter: Global roles can choose branch or all; Branch roles are locked */}
          {isGlobal ? (
            <div className="flex items-center gap-2 bg-white border-2 border-slate-300 p-2.5 rounded-2xl shadow-sm text-sm font-bold text-slate-800">
              <StoreIcon className="w-5 h-5 text-indigo-600 shrink-0" />
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-1 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">Semua Cabang (Konsolidasi)</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    Cabang {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 border-2 border-emerald-300 px-3.5 py-2 rounded-2xl shadow-sm text-sm font-bold text-emerald-900">
              <StoreIcon className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Cabang: <strong className="font-black">{activeStoreName || 'Cabang Penugasan'}</strong></span>
            </div>
          )}

          {/* Date Filter & Quick Presets */}
          <div className="flex items-center gap-3 bg-white border-2 border-slate-300 p-2 rounded-2xl shadow-sm text-sm font-bold text-slate-800">
            <Calendar className="w-5 h-5 text-emerald-600 shrink-0 ml-1" />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-slate-50 border-2 border-slate-300 rounded-xl px-2.5 py-1 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-slate-500 font-bold">s/d</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-slate-50 border-2 border-slate-300 rounded-xl px-2.5 py-1 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Quick date presets */}
            <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={() => setQuickRange('today')}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 transition-colors"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setQuickRange('7days')}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 transition-colors"
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => setQuickRange('30days')}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 transition-colors"
              >
                30 Hari
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-3">
        <button
          onClick={() => setActiveReportTab('terminals')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm sm:text-base font-bold cursor-pointer transition-all ${
            activeReportTab === 'terminals'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Kinerja Terminal POS & Harian</span>
        </button>

        <button
          onClick={() => setActiveReportTab('summary')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm sm:text-base font-bold cursor-pointer transition-all ${
            activeReportTab === 'summary'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Ringkasan Omzet & Produk Terlaris</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingState message="Menghitung laporan transaksi dan performa terminal..." rows={6} />
      ) : activeReportTab === 'terminals' ? (
        <div className="space-y-6">
          {/* Terminal Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border-2 border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Filter Terminal Kasir</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Lihat performa dari masing-masing kasir / terminal POS di cabang {activeStoreName || 'ini'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Pilih Terminal:</span>
              <select
                value={selectedTerminalId}
                onChange={(e) => setSelectedTerminalId(e.target.value)}
                className="bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">Semua Terminal Kasir ({terminalReport?.summary.length || 0})</option>
                {(terminalReport?.summary || []).map((t) => (
                  <option key={t.terminal_id} value={t.terminal_id}>
                    {t.terminal_code} - {t.terminal_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Terminal Cards Summary */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Ringkasan Omzet & Pengurangan Per Terminal POS
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {filteredTerminalSummary.length} terminal aktif tercatat
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTerminalSummary.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState
                    title="Belum Ada Transaksi Kasir"
                    description="Belum ada transaksi penjualan yang tercatat pada terminal kasir untuk rentang tanggal ini."
                  />
                </div>
              ) : (
                filteredTerminalSummary.map((t) => (
                  <Card key={t.terminal_id} className="p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                          <Monitor className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-black text-slate-950 text-base">{t.terminal_code}</div>
                          <div className="text-xs text-slate-500 font-semibold">{t.terminal_name}</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 font-mono font-black text-xs text-slate-800">
                        {t.transaction_count} Struk
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs sm:text-sm">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Penjualan Kotor (Bruto):</span>
                        <MoneyText amount={t.gross_sales} size="sm" className="font-bold text-slate-900" />
                      </div>

                      <div className="flex justify-between items-center text-amber-700">
                        <span className="flex items-center gap-1 font-semibold">
                          <ArrowDownRight className="w-3.5 h-3.5" /> Pengurangan Diskon:
                        </span>
                        <MoneyText amount={t.total_discount} size="sm" variant="danger" className="font-bold" />
                      </div>

                      {t.void_count > 0 && (
                        <div className="flex justify-between items-center text-rose-700">
                          <span className="flex items-center gap-1 font-semibold">
                            <ShieldAlert className="w-3.5 h-3.5" /> Void / Batal ({t.void_count}):
                          </span>
                          <MoneyText amount={t.void_amount} size="sm" variant="danger" className="font-bold" />
                        </div>
                      )}

                      <div className="flex justify-between items-center text-slate-500 text-xs">
                        <span>PPN 11% (Termasuk):</span>
                        <MoneyText amount={t.total_tax} size="sm" className="font-medium text-slate-600" />
                      </div>
                    </div>

                    <div className="pt-2.5 border-t-2 border-slate-200 flex justify-between items-center bg-emerald-50/70 -mx-5 -mb-5 p-4 rounded-b-2xl">
                      <span className="text-xs font-black uppercase text-emerald-950">Penghasilan Bersih (Net):</span>
                      <MoneyText amount={t.net_sales} size="md" className="font-black text-emerald-950 text-base sm:text-lg" />
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Daily & Terminal Breakdown Table */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  Rincian Penjualan & Pengurangan Per Hari / Tanggal
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Mengetahui penghasilan kotor, potongan pengurangan diskon/void, dan penerimaan bersih dari masing-masing terminal kasir per hari.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto font-mono">
                {filteredDailyBreakdown.length} hari & terminal tercatat
              </span>
            </div>

            {filteredDailyBreakdown.length === 0 ? (
              <EmptyState
                title="Belum Ada Rincian Transaksi Harian"
                description="Tidak ada transaksi yang tercatat pada terminal kasir dalam rentang tanggal yang dipilih."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-800 font-bold uppercase text-xs">
                      <th className="py-3 px-4">Tanggal & Hari</th>
                      <th className="py-3 px-4">Terminal Kasir</th>
                      <th className="py-3 px-4 text-center">Struk Selesai</th>
                      <th className="py-3 px-4 text-right">Penghasilan Kotor</th>
                      <th className="py-3 px-4 text-right">Potongan Diskon</th>
                      <th className="py-3 px-4 text-right">Void / Batal</th>
                      <th className="py-3 px-4 text-right">Penerimaan Bersih (Net)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {filteredDailyBreakdown.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-slate-900 text-sm">{row.date}</div>
                          <div className="text-xs font-bold text-emerald-700">{row.day_name}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium">
                          <span className="font-bold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-xs mr-1.5">
                            {row.terminal_code}
                          </span>
                          <span className="text-slate-600 text-xs">{row.terminal_name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                          {row.transaction_count} struk
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <MoneyText amount={row.gross_sales} size="sm" className="font-bold text-slate-900" />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {row.total_discount > 0 ? (
                            <MoneyText amount={-row.total_discount} size="sm" variant="danger" className="font-bold" />
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {row.void_count > 0 ? (
                            <span className="text-rose-600 font-bold font-mono text-xs">
                              {row.void_count} void (-Rp {row.void_amount.toLocaleString('id-ID')})
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <MoneyText amount={row.net_sales} size="sm" className="font-black text-emerald-700 text-sm sm:text-base" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Summary & Top Products Tab */
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="p-4 sm:p-5 space-y-2 bg-white border-2 border-slate-200 shadow-sm">
              <div className="text-xs sm:text-sm text-slate-600 font-bold flex items-center justify-between">
                <span>Penjualan Kotor</span>
                <DollarSign className="w-4 h-4 text-slate-500" />
              </div>
              <MoneyText amount={totals.gross_sales} size="md" className="font-bold text-slate-900 text-base sm:text-lg" />
            </Card>

            <Card className="p-4 sm:p-5 space-y-2 bg-white border-2 border-slate-200 shadow-sm">
              <div className="text-xs sm:text-sm text-slate-600 font-bold flex items-center justify-between">
                <span>Total Diskon</span>
                <Percent className="w-4 h-4 text-amber-600" />
              </div>
              <MoneyText amount={totals.discount} size="md" variant="danger" className="font-bold text-base sm:text-lg" />
            </Card>

            <Card className="p-4 sm:p-5 space-y-2 bg-white border-2 border-slate-200 shadow-sm">
              <div className="text-xs sm:text-sm text-slate-600 font-bold flex items-center justify-between">
                <span>PPN 11%</span>
                <Coins className="w-4 h-4 text-sky-600" />
              </div>
              <MoneyText amount={totals.tax} size="md" variant="muted" className="font-bold text-base sm:text-lg" />
            </Card>

            <Card className="p-4 sm:p-5 space-y-2 bg-emerald-50 border-2 border-emerald-300 shadow-sm">
              <div className="text-xs sm:text-sm text-emerald-950 font-black flex items-center justify-between uppercase">
                <span>Penjualan Bersih</span>
                <TrendingUp className="w-5 h-5 text-emerald-700" />
              </div>
              <MoneyText amount={totals.net_sales} size="lg" className="font-black text-emerald-950 text-lg sm:text-xl" />
            </Card>

            <Card className="p-4 sm:p-5 space-y-2 bg-white border-2 border-slate-200 shadow-sm">
              <div className="text-xs sm:text-sm text-slate-600 font-bold flex items-center justify-between">
                <span>Total Transaksi</span>
                <Receipt className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
                {totals.transaction_count} struk
              </div>
            </Card>

            <Card className="p-4 sm:p-5 space-y-2 bg-white border-2 border-slate-200 shadow-sm">
              <div className="text-xs sm:text-sm text-slate-600 font-bold flex items-center justify-between">
                <span>Rata-rata Struk</span>
                <DollarSign className="w-4 h-4 text-slate-500" />
              </div>
              <MoneyText amount={totals.average_transaction} size="sm" className="font-bold text-slate-900 text-sm sm:text-base" />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Daily Series Table */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Rincian Penjualan Harian</h3>
                <span className="text-xs font-semibold text-slate-500">
                  {salesReport?.series.length || 0} periode tercatat
                </span>
              </div>

              {!salesReport?.series || salesReport.series.length === 0 ? (
                <EmptyState
                  title="Belum Ada Data Penjualan"
                  description="Tidak ada transaksi yang tercatat dalam rentang tanggal yang dipilih."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-800 font-bold uppercase text-xs">
                        <th className="py-3 px-4">Tanggal / Periode</th>
                        <th className="py-3 px-4 text-center">Jumlah Struk</th>
                        <th className="py-3 px-4 text-right">Total Omzet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {salesReport.series.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">{s.period}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-base text-slate-900">{s.count}</td>
                          <td className="py-3 px-4 text-right">
                            <MoneyText amount={s.total_minor} size="sm" className="font-black text-emerald-700 text-base" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Products Table */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">10 Produk Terlaris</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">Berdasarkan volume</span>
              </div>

              {topProducts.length === 0 ? (
                <EmptyState
                  title="Belum Ada Data Produk Terlaris"
                  description="Data akan terakumulasi setelah transaksi checkout kasir selesai."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-800 font-bold uppercase text-xs">
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Nama Produk</th>
                        <th className="py-3 px-4 text-center">Terjual</th>
                        <th className="py-3 px-4 text-right">Total Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {topProducts.map((tp, idx) => (
                        <tr key={tp.product_id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-black text-slate-500 text-sm">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 text-sm sm:text-base">{tp.name}</td>
                          <td className="py-3 px-4 text-center font-mono font-black text-slate-900 text-base">
                            {tp.quantity_sold}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <MoneyText amount={tp.sales_minor} size="sm" className="font-bold text-slate-900 text-base" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
