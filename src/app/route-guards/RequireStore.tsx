import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContextStore } from '../../stores/app-context.store';

export const RequireStore: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeStoreId } = useAppContextStore();
  const location = useLocation();

  if (!activeStoreId) {
    return <Navigate to="/select-store" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
