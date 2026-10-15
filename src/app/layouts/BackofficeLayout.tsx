import React from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from '../../components/navigation/Topbar';
import { Sidebar } from '../../components/navigation/Sidebar';

export const BackofficeLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Topbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
