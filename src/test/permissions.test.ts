import { describe, it, expect } from 'vitest';
import { hasPermission, hasAnyPermission } from '../utils/permissions';

describe('Permissions & RBAC Utilities', () => {
  it('allows owner or admin full access', () => {
    expect(hasPermission([], 'pos.sell', 'owner')).toBe(true);
    expect(hasPermission([], 'inventory.adjust', 'admin')).toBe(true);
  });

  it('matches permissions with colon and dot equivalents', () => {
    const cashierPerms = ['pos:checkout', 'pos:quote', 'shift:open', 'shift:close'];

    // PRD dot notation mapped to backend colon
    expect(hasPermission(cashierPerms, 'pos.sell')).toBe(true);
    expect(hasPermission(cashierPerms, 'pos.checkout')).toBe(true);
    expect(hasPermission(cashierPerms, 'shift.open')).toBe(true);
    expect(hasPermission(cashierPerms, 'inventory.adjust')).toBe(false);
  });

  it('checks hasAnyPermission correctly', () => {
    const perms = ['catalog:read'];
    expect(hasAnyPermission(perms, ['product.read', 'pricing.override'])).toBe(true);
    expect(hasAnyPermission(perms, ['inventory.adjust', 'shift.close'])).toBe(false);
  });
});
