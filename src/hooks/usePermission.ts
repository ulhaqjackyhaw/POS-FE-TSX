import { useAppContextStore } from '../stores/app-context.store';
import { hasPermission, hasAnyPermission } from '../utils/permissions';

export function usePermission() {
  const { user } = useAppContextStore();

  const check = (permission: string) => {
    return hasPermission(user?.permissions, permission, user?.role);
  };

  const checkAny = (permissions: string[]) => {
    return hasAnyPermission(user?.permissions, permissions, user?.role);
  };

  return {
    check,
    checkAny,
    userRole: user?.role,
    permissions: user?.permissions || [],
    isOwnerOrAdmin: user?.role === 'owner' || user?.role === 'admin',
  };
}
