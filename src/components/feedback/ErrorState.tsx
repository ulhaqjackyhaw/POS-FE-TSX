import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string;
  requestId?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Gagal memuat data',
  message = 'Terjadi kendala saat berkomunikasi dengan server.',
  code,
  requestId,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 bg-rose-50 rounded-2xl border-2 border-rose-200 shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-4 border border-rose-300">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-extrabold text-rose-900">{title}</h3>
      <p className="text-sm font-semibold text-rose-800 max-w-lg mt-1 mb-4 leading-relaxed">
        {message}
      </p>

      {(code || requestId) && (
        <div className="text-xs font-mono font-bold text-rose-900 bg-rose-100 px-4 py-2 rounded-xl border border-rose-200 mb-5">
          {code && <span>Kode: {code} </span>}
          {requestId && <span>| ReqID: {requestId}</span>}
        </div>
      )}

      {onRetry && (
        <Button
          variant="outline"
          size="md"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={onRetry}
          className="border-rose-400 text-rose-900 hover:bg-rose-100"
        >
          Coba Lagi
        </Button>
      )}
    </div>
  );
};
