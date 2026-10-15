/**
 * Permission checks supporting both PRD dot notation and backend colon notation
 */

const PERMISSION_EQUIVALENTS: Record<string, string[]> = {
  'pos.sell': ['pos:checkout', 'pos:quote', 'pos.sell'],
  'pos.discount': ['pos:quote', 'pos.discount'],
  'pos.checkout': ['pos:checkout', 'pos.checkout'],
  'shift.open': ['shift:open', 'shift.open'],
  'shift.close': ['shift:close', 'shift.close'],
  'shift.movement': ['shift:movement', 'shift.movement'],
  'product.read': ['catalog:read', 'product.read'],
  'product.create': ['catalog:write', 'product.create'],
  'product.update': ['catalog:write', 'product.update'],
  'pricing.read': ['price:override', 'catalog:read', 'pricing.read'],
  'pricing.override': ['price:override', 'pricing.override'],
  'inventory.read': ['inventory:read', 'inventory.read'],
  'inventory.adjust': ['inventory:adjust', 'inventory.adjust'],
  'transaction.read': ['pos:quote', 'audit:read', 'transaction.read'],
  'transaction.void': ['pos:void', 'transaction.void'],
  'transaction.refund': ['pos:refund', 'transaction.refund'],
  'approval.create': ['approval:request', 'approval.create'],
  'approval.review': ['approval:review', 'approval.review'],
  'report.sales.read': ['report:read', 'report.sales.read'],
  'report.products.read': ['report:read', 'report.products.read'],
  'store.read': ['org:manage', 'store.read'],
  'store.create': ['org:manage', 'store.create'],
};

export function hasPermission(
  userPermissions: string[] | undefined | null,
  requiredPermission: string,
  userRole?: string
): boolean {
  if (userRole === 'owner' || userRole === 'admin') {
    return true;
  }
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  if (userPermissions.includes('*')) {
    return true;
  }
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check mapped equivalents
  const equivalents = PERMISSION_EQUIVALENTS[requiredPermission];
  if (equivalents) {
    for (const eq of equivalents) {
      if (userPermissions.includes(eq)) {
        return true;
      }
    }
  }

  // Check reversed: if requiredPermission is in colon notation
  const colonToDot = requiredPermission.replace(':', '.');
  if (userPermissions.includes(colonToDot)) {
    return true;
  }

  return false;
}

export function hasAnyPermission(
  userPermissions: string[] | undefined | null,
  requiredPermissions: string[],
  userRole?: string
): boolean {
  if (userRole === 'owner' || userRole === 'admin') return true;
  return requiredPermissions.some((perm) => hasPermission(userPermissions, perm, userRole));
}
