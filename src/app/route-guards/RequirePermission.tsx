import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({ permission, children }) => {
  const { check, isOwnerOrAdmin } = usePermission();
  const navigate = useNavigate();

  const hasAccess = isOwnerOrAdmin || check(permission);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-slate-900/60 rounded-2xl border border-slate-800">
        <div className="w-16 h-16 rounded-full bg-rose-950/60 flex items-center justify-center text-rose-400 mb-4 border border-rose-800/60">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Akses Ditolak (403 Forbidden)</h2>
        <p className="text-xs text-slate-400 max-w-md mt-1.5 mb-6">
          Akun Anda tidak memiliki izin untuk mengakses modul ini ({permission}). Hubungi supervisor atau administrator jika Anda memerlukan akses.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          Kembali
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};
