import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Soft warm background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-lg z-10">
        <Outlet />
      </main>

      <footer className="mt-8 text-center text-sm font-semibold text-slate-500 z-10">
        Web POS & Backoffice ERP Retail Multi-Outlet &bull; Sistem Terpusat
      </footer>
    </div>
  );
};
