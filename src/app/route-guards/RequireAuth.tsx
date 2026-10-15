import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContextStore } from '../../stores/app-context.store';

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAppContextStore();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
