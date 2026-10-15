import React from 'react';

export interface LoadingStateProps {
  message?: string;
  rows?: number;
  type?: 'card' | 'table' | 'spinner';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Memuat data...',
  rows = 5,
  type = 'table',
}) => {
  if (type === 'spinner') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-600">{message}</p>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-44 bg-white rounded-2xl border-2 border-slate-200 p-5 space-y-3 shadow-sm">
            <div className="h-5 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
            <div className="h-8 bg-slate-200 rounded w-1/3 mt-4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 p-6 bg-white rounded-2xl border-2 border-slate-200 shadow-sm animate-pulse">
      <div className="h-8 bg-slate-200 rounded-xl w-1/4 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100">
          <div className="h-5 bg-slate-200 rounded w-16" />
          <div className="h-5 bg-slate-200 rounded flex-1" />
          <div className="h-5 bg-slate-100 rounded w-28" />
          <div className="h-5 bg-slate-200 rounded w-24" />
        </div>
      ))}
    </div>
  );
};
