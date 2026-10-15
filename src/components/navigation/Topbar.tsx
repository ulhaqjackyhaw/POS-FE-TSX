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

export const Topbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, activeStoreName, activeTerminalCode, activeStoreId, logout } = useAppContextStore();
  const { activeShift } = useShiftStore();
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline } = useNetworkStore();
  const { pendingCount, conflictCount } = useSyncStore();

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const isPosPage = location.pathname.startsWith('/pos');

  return (
    <>
      <header className="h-20 bg-white border-b-2 border-slate-200 px-4 sm:px-8 flex items-center justify-between z-30 sticky top-0 shrink-0 shadow-sm">
        {/* Left: Store & Terminal Context */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-100 border border-slate-300 text-sm sm:text-base">
            <StoreIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-extrabold text-slate-900">
              {activeStoreName || 'Pilih Cabang'}
            </span>
          </div>

          {activeTerminalCode && (
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-300 text-sm">
              <Monitor className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="font-bold text-slate-800">{activeTerminalCode}</span>
            </div>
          )}

          {/* Quick link between POS and Backoffice */}
          {isPosPage ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Layers className="w-4 h-4 text-slate-700" />}
              onClick={() => navigate('/products')}
              className="hidden md:inline-flex text-sm text-slate-800"
            >
              Backoffice
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ShoppingBag className="w-4 h-4" />}
              onClick={() => navigate('/pos')}
              className="hidden md:inline-flex text-sm"
            >
              Buka POS Kasir
            </Button>
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

          {/* Switch Store */}
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
