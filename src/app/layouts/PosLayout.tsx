import React from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from '../../components/navigation/Topbar';

export const PosLayout: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden select-none">
      <Topbar />
      <main className="flex-1 overflow-hidden flex flex-col bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
};
