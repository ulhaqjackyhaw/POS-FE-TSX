import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContextStore } from '../../stores/app-context.store';
import { useShiftStore } from '../../stores/shift.store';
import { useNetworkStore } from '../../stores/network.store';
import { useSyncStore } from '../../stores/sync.store';
import { StatusBadge } from '../data-display/StatusBadge';
import { Button } from '../ui/Button';
import {
  Store as StoreIcon,
  Monitor,
  User,
  LogOut,
  RefreshCw,
  Clock,
  Layers,
  ShoppingBag,
  SlidersHorizontal,
} from 'lucide-react';
import { SyncQueueModal } from '../../features/sync/components/SyncQueueModal';

import { canUserSwitchStore, isGlobalRole } from '../../utils/roleNavigation';
import { usePermission } from '../../hooks/usePermission';

export const Topbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, activeStoreName, activeTerminalCode, activeStoreId, logout } = useAppContextStore();
  const { activeShift } = useShiftStore();
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline } = useNetworkStore();
  const { pendingCount, conflictCount } = useSyncStore();
  const { check, isOwnerOrAdmin } = usePermission();

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const isPosPage = location.pathname.startsWith('/pos');
  const canSwitchBranch = canUserSwitchStore(user?.role, user?.store_ids);
  const isGlobal = isGlobalRole(user?.role);

  const hasBackofficeAccess =
    isOwnerOrAdmin ||
    check('product.read') ||
    check('warehouse.read') ||
    check('inventory.read') ||
    check('report.sales.read') ||
    check('store.read');

  const hasPosAccess =
    isOwnerOrAdmin ||
    check('pos.create') ||
    check('pos:checkout') ||
    check('pos:quote') ||
    user?.role === 'cashier';

  return (
    <>
      <header className="h-20 bg-white border-b-2 border-slate-200 px-4 sm:px-8 flex items-center justify-between z-30 sticky top-0 shrink-0 shadow-sm">
        {/* Left: Store & Terminal Context */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm sm:text-base ${
              !canSwitchBranch
                ? 'bg-slate-50 border-slate-300 text-slate-800'
                : 'bg-emerald-50 border-emerald-300 text-slate-900'
            }`}
            title={!canSwitchBranch ? 'Cabang Penugasan Tetap' : 'Cabang Aktif'}
          >
            <StoreIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-900 leading-tight">
                {activeStoreName || 'Pilih Cabang'}
              </span>
              {!isGlobal && (
                <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                  Cabang Penugasan
                </span>
              )}
            </div>
          </div>

          {activeTerminalCode ? (
            <button
              onClick={() => {
                if (!activeShift) {
                  navigate('/select-terminal');
                }
              }}
              title={
                activeShift
                  ? `Shift aktif pada ${activeTerminalCode}`
                  : 'Klik untuk ganti meja terminal POS kasir'
              }
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm transition-all ${
                !activeShift
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 cursor-pointer shadow-sm'
                  : 'bg-slate-100 border-slate-300 text-slate-800 cursor-default'
              }`}
            >
              <Monitor className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-900 leading-tight">{activeTerminalCode}</span>
                <span className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                  {activeShift ? 'Shift Aktif' : 'Ganti Terminal'}
                </span>
              </div>
            </button>
          ) : user?.role === 'cashier' ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Monitor className="w-4 h-4 text-emerald-600" />}
              onClick={() => navigate('/select-terminal')}
              className="hidden sm:inline-flex border-emerald-500/50 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
            >
              Pilih Terminal POS
            </Button>
          ) : null}

          {/* Quick link between POS and Backoffice */}
          {isPosPage ? (
            hasBackofficeAccess && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Layers className="w-4 h-4 text-slate-700" />}
                onClick={() => navigate('/products')}
                className="hidden md:inline-flex text-sm text-slate-800"
              >
                Backoffice
              </Button>
            )
          ) : (
            hasPosAccess && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<ShoppingBag className="w-4 h-4" />}
                onClick={() => navigate('/pos')}
                className="hidden md:inline-flex text-sm"
              >
                Buka POS Kasir
              </Button>
            )
          )}
        </div>

        {/* Center: Shift status */}
        <div className="hidden lg:flex items-center gap-3">
          <div
            onClick={() => navigate('/shifts')}
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 cursor-pointer transition-colors shadow-sm"
            title="Klik untuk Kelola Shift Kasir"
          >
            <Clock className="w-5 h-5 text-amber-600" />
            <StatusBadge
              status={activeShift ? 'OPEN' : 'CLOSED'}
              type="shift"
              size="md"
            />
          </div>
        </div>

        {/* Right: Network, Sync Queue, User, Logout */}
        <div className="flex items-center gap-3">
          {/* Network & Offline Toggle Button */}
          <button
            onClick={toggleSimulatedOffline}
            className="flex items-center gap-1.5 cursor-pointer focus:outline-none"
            title={
              isSimulatedOffline
                ? 'Mode Offline Simulasi Aktif (Klik untuk Online)'
                : 'Status Jaringan (Klik untuk simulasi Offline)'
            }
          >
            <StatusBadge
              status={isOnline ? 'online' : 'offline'}
              type="network"
              size="md"
            />
          </button>

          {/* Pending Sync Queue Badge Button */}
          {(pendingCount > 0 || conflictCount > 0) && (
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100 border-2 border-amber-300 text-amber-950 text-sm font-extrabold cursor-pointer transition-all shadow-sm animate-pulse"
              title="Antrean Transaksi Offline"
            >
              <RefreshCw className="w-4 h-4 animate-spin text-amber-800" />
              <span>{pendingCount} Pending</span>
              {conflictCount > 0 && (
                <span className="bg-rose-600 text-white text-xs px-2 py-0.5 rounded-full font-black">
                  {conflictCount}
                </span>
              )}
            </button>
          )}

          {/* Switch Store - Only for Owner, Auditor, or multi-store users */}
          {canSwitchBranch && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<SlidersHorizontal className="w-4 h-4 text-slate-700" />}
              onClick={() => navigate('/select-store')}
              title="Ganti Cabang"
              className="hidden sm:inline-flex text-sm text-slate-700 hover:text-slate-900"
            >
              Ganti Cabang
            </Button>
          )}

          {/* User profile info */}
          <div className="flex items-center gap-2.5 pl-3 border-l-2 border-slate-200 text-sm">
            <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-800 font-extrabold border border-slate-300 shadow-sm text-base">
              {user?.full_name ? user.full_name[0].toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-sm font-extrabold text-slate-900 leading-tight">
                {user?.full_name || user?.username}
              </div>
              <div className="text-xs text-slate-600 font-bold capitalize mt-0.5">
                {user?.role}
              </div>
            </div>
          </div>

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title="Keluar dari Akun"
            className="text-slate-600 hover:text-rose-600 p-2.5"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Sync Queue Modal */}
      <SyncQueueModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        storeId={activeStoreId || undefined}
      />
    </>
  );
};
