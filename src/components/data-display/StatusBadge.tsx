import React from 'react';
import { Badge } from '../ui/Badge';
import { CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

export interface StatusBadgeProps {
  status: string;
  type?: 'shift' | 'transaction' | 'approval' | 'sync' | 'network';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'transaction', size = 'sm' }) => {
  const norm = (status || '').toUpperCase();

  if (type === 'shift') {
    if (norm === 'OPEN') {
      return (
        <Badge variant="success" size={size} icon={<CheckCircle2 className="w-3 h-3" />}>
          Shift Terbuka
        </Badge>
      );
    }
    return (
      <Badge variant="neutral" size={size} icon={<Clock className="w-3 h-3" />}>
        Shift Ditutup
      </Badge>
    );
  }

  if (type === 'transaction') {
    if (norm === 'COMPLETED' || norm === 'PAID') {
      return (
        <Badge variant="success" size={size} icon={<CheckCircle2 className="w-3 h-3" />}>
          Selesai
        </Badge>
      );
    }
    if (norm === 'VOIDED') {
      return (
        <Badge variant="danger" size={size} icon={<XCircle className="w-3 h-3" />}>
          Di-Void
        </Badge>
      );
    }
    if (norm === 'REFUNDED') {
      return (
        <Badge variant="warning" size={size} icon={<AlertTriangle className="w-3 h-3" />}>
          Di-Refund
        </Badge>
      );
    }
    return <Badge variant="neutral" size={size}>{status}</Badge>;
  }

  if (type === 'approval') {
    if (norm === 'APPROVED') {
      return (
        <Badge variant="success" size={size} icon={<CheckCircle2 className="w-3 h-3" />}>
          Disetujui
        </Badge>
      );
    }
    if (norm === 'REJECTED') {
      return (
        <Badge variant="danger" size={size} icon={<XCircle className="w-3 h-3" />}>
          Ditolak
        </Badge>
      );
    }
    return (
      <Badge variant="warning" size={size} icon={<Clock className="w-3 h-3" />}>
        Menunggu
      </Badge>
    );
  }

  if (type === 'sync') {
    const s = (status || '').toLowerCase();
    if (s === 'synced') {
      return (
        <Badge variant="success" size={size} icon={<CheckCircle2 className="w-3 h-3" />}>
          Tersinkron
        </Badge>
      );
    }
    if (s === 'syncing') {
      return (
        <Badge variant="info" size={size} icon={<RefreshCw className="w-3 h-3 animate-spin" />}>
          Menyinkronkan
        </Badge>
      );
    }
    if (s === 'conflict') {
      return (
        <Badge variant="danger" size={size} icon={<AlertTriangle className="w-3 h-3" />}>
          Konflik
        </Badge>
      );
    }
    if (s === 'failed') {
      return (
        <Badge variant="danger" size={size} icon={<XCircle className="w-3 h-3" />}>
          Gagal
        </Badge>
      );
    }
    return (
      <Badge variant="warning" size={size} icon={<Clock className="w-3 h-3" />}>
        Menunggu Antrean
      </Badge>
    );
  }

  if (type === 'network') {
    if (status === 'online') {
      return (
        <Badge variant="success" size={size} icon={<Wifi className="w-3 h-3" />}>
          Online
        </Badge>
      );
    }
    return (
      <Badge variant="warning" size={size} icon={<WifiOff className="w-3 h-3" />}>
        Offline (Lokal)
      </Badge>
    );
  }

  return <Badge variant="neutral" size={size}>{status}</Badge>;
};
