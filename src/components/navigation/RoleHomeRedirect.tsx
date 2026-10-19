import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContextStore } from '../../stores/app-context.store';
import { getFocusMenuForRole } from '../../utils/roleNavigation';

export const RoleHomeRedirect: React.FC = () => {
  const { user } = useAppContextStore();
  const target = getFocusMenuForRole(user?.role);
  return <Navigate to={target} replace />;
};
