import React from 'react';
import { NavLink } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';
import { useAppContextStore } from '../../stores/app-context.store';
import {
  ShoppingBag,
  Clock,
  Package,
  Tags,
  Boxes,
  Receipt,
  CheckSquare,
  BarChart3,
  Building2,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { check, isOwnerOrAdmin } = usePermission();
  const { activeStoreId } = useAppContextStore();

  const navItems = [
    {
      label: 'Terminal POS Kasir',
      path: '/pos',
      icon: <ShoppingBag className="w-5 h-5 text-emerald-600" />,
      allowed: true,
    },
    {
      label: 'Shift Kasir & Saldo',
      path: '/shifts',
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      allowed: isOwnerOrAdmin || check('shift.open') || check('shift.close'),
    },
    {
      label: 'Master Produk',
      path: '/products',
      icon: <Package className="w-5 h-5 text-sky-600" />,
      allowed: isOwnerOrAdmin || check('product.read') || check('catalog:read'),
    },
    {
      label: 'Harga Cabang Khusus',
      path: activeStoreId ? `/stores/${activeStoreId}/pricing` : '/select-store',
      icon: <Tags className="w-5 h-5 text-purple-600" />,
      allowed: isOwnerOrAdmin || check('pricing.read') || check('pricing.override') || check('price:override'),
    },
    {
      label: 'Inventori & Ledger Stok',
      path: '/inventory',
      icon: <Boxes className="w-5 h-5 text-teal-600" />,
      allowed: isOwnerOrAdmin || check('inventory.read') || check('inventory.adjust'),
    },
    {
      label: 'Riwayat Transaksi',
      path: '/transactions',
      icon: <Receipt className="w-5 h-5 text-blue-600" />,
      allowed: isOwnerOrAdmin || check('transaction.read') || check('pos:quote'),
    },
    {
      label: 'Approval Tindakan',
      path: '/approvals',
      icon: <CheckSquare className="w-5 h-5 text-indigo-600" />,
      allowed: isOwnerOrAdmin || check('approval.review') || check('approval:review'),
    },
    {
      label: 'Laporan Penjualan',
      path: '/reports',
      icon: <BarChart3 className="w-5 h-5 text-orange-600" />,
      allowed: isOwnerOrAdmin || check('report.sales.read') || check('report:read'),
    },
    {
      label: 'Pengaturan Cabang',
      path: '/settings/stores',
      icon: <Building2 className="w-5 h-5 text-slate-700" />,
      allowed: isOwnerOrAdmin || check('store.read') || check('org:manage'),
    },
  ];

  return (
    <aside className="w-72 bg-white border-r-2 border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-5rem)] shadow-sm">
      <div className="p-4 flex-1 space-y-1.5">
        <div className="text-xs font-black text-slate-500 uppercase tracking-wider px-3 mb-3">
          Menu Navigasi
        </div>

        {navItems
          .filter((item) => item.allowed)
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm sm:text-base font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 font-extrabold border-2 border-emerald-500/40 shadow-sm'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
      </div>

      <div className="p-4 border-t-2 border-slate-200 text-xs font-bold text-slate-500 flex items-center justify-between bg-slate-50">
        <span>Web POS ERP Retail</span>
        <span className="font-mono text-xs text-slate-600">v1.0</span>
      </div>
    </aside>
  );
};
