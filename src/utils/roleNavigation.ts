import { UserSummary } from '../types/auth';

export const GLOBAL_ROLES = ['owner', 'auditor'] as const;

/**
 * Returns true if the role has global store privileges (can view all stores and switch stores freely).
 * Only Owner and Auditor have unrestricted multi-branch switching privileges.
 */
export function isGlobalRole(role?: string | null): boolean {
  if (!role) return false;
  return role === 'owner' || role === 'auditor';
}

/**
 * Returns the primary focus route for each role:
 * - Cashier -> Terminal POS Kasir (/pos)
 * - Inventory Staff -> Inventori Stok (/inventory)
 * - Store Manager / Supervisor -> Laporan Operasional (/reports)
 * - Auditor -> Laporan & Audit (/reports)
 * - Owner -> POS Kasir (/pos)
 */
export function getFocusMenuForRole(role?: string | null): string {
  switch (role) {
    case 'cashier':
      return '/pos';
    case 'inventory_staff':
      return '/inventory';
    case 'store_manager':
    case 'supervisor':
      return '/reports';
    case 'auditor':
      return '/reports';
    case 'owner':
      return '/pos';
    default:
      return '/pos';
  }
}

/**
 * Determines whether a user is allowed to switch between stores.
 * Non-owner/non-auditor users whose branch is determined cannot switch stores.
 */
export function canUserSwitchStore(role?: string | null, storeIds?: string[] | null): boolean {
  if (isGlobalRole(role)) return true;
  // If assigned to more than 1 branch, they can switch only between their assigned branches
  if (storeIds && storeIds.length > 1) return true;
  return false;
}

/**
 * Checks if a user's branch has already been predetermined.
 */
export function isUserBranchDetermined(
  user?: UserSummary | null,
  availableStoresCount?: number
): boolean {
  if (!user) return false;
  if (isGlobalRole(user.role)) return false;
  if (user.store_ids && user.store_ids.length === 1) return true;
  if (availableStoresCount === 1) return true;
  return false;
}
