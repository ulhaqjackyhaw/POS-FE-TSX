import React, { useState, useEffect } from 'react';
import { reportsApi } from '../../../api/reports.api';
import { SalesReport, TopProductReport } from '../../../types/api';
import { Card } from '../../../components/ui/Card';
import { MoneyText } from '../../../components/data-display/MoneyText';
import { LoadingState } from '../../../components/feedback/LoadingState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { getTodayDateString } from '../../../utils/date';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Percent,
  Coins,
  Award,
  Calendar,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const today = getTodayDateString();
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState(today);

  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const [sales, top] = await Promise.all([
        reportsApi.getSalesReport({ from: fromDate, to: toDate }),
        reportsApi.getTopProducts({ from: fromDate, to: toDate }),
      ]);
      setSalesReport(sales);
      setTopProducts(top || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [fromDate, toDate]);

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
      {/* Header & Date Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Laporan Analitik & Kinerja Penjualan
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Ringkasan omzet penjualan retail, potongan diskon, kalkulasi pajak, dan ranking produk terlaris.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white border-2 border-slate-300 p-3 rounded-2xl shadow-sm text-sm font-bold text-slate-800">
          <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-slate-500 font-bold">s/d</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Menghitung laporan transaksi toko..." rows={6} />
      ) : (
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
