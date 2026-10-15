import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from '../ui/Button';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Belum ada data',
  description = 'Tidak ada catatan yang ditemukan untuk filter atau kategori ini.',
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-2xl border-2 border-dashed border-slate-300 shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mb-4 border border-slate-200 shadow-inner">
        {icon || <PackageOpen className="w-8 h-8 text-slate-400" />}
      </div>
      <h3 className="text-base sm:text-lg font-extrabold text-slate-900">{title}</h3>
      <p className="text-sm font-medium text-slate-600 max-w-md mt-1.5 mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="outline" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
