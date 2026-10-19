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

  it('matches warehouse permissions correctly', () => {
    const managerPerms = ['org:manage'];
    expect(hasPermission(managerPerms, 'warehouse.read')).toBe(true);
    expect(hasPermission(managerPerms, 'warehouse.create')).toBe(true);
    expect(hasPermission(managerPerms, 'warehouse.update')).toBe(true);
    expect(hasPermission(managerPerms, 'warehouse.delete')).toBe(true);

    const inventoryPerms = ['inventory:read'];
    expect(hasPermission(inventoryPerms, 'warehouse.read')).toBe(true);
    expect(hasPermission(inventoryPerms, 'warehouse.create')).toBe(false);
  });

  it('matches user management permissions correctly', () => {
    const adminPerms = ['org:manage'];
    expect(hasPermission(adminPerms, 'user.read')).toBe(true);
    expect(hasPermission(adminPerms, 'user.create')).toBe(true);
    expect(hasPermission(adminPerms, 'user.update')).toBe(true);
    expect(hasPermission(adminPerms, 'user.delete')).toBe(true);

    const cashierPerms = ['pos:checkout'];
    expect(hasPermission(cashierPerms, 'user.read')).toBe(false);
    expect(hasPermission(cashierPerms, 'user.create')).toBe(false);
  });
});
