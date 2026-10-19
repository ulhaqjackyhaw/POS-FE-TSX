import { describe, it, expect } from 'vitest';
import {
  isGlobalRole,
  getFocusMenuForRole,
  canUserSwitchStore,
  isUserBranchDetermined,
} from '../utils/roleNavigation';

describe('roleNavigation utilities', () => {
  it('identifies owner and auditor as global roles', () => {
    expect(isGlobalRole('owner')).toBe(true);
    expect(isGlobalRole('auditor')).toBe(true);
    expect(isGlobalRole('cashier')).toBe(false);
    expect(isGlobalRole('store_manager')).toBe(false);
    expect(isGlobalRole('inventory_staff')).toBe(false);
    expect(isGlobalRole(null)).toBe(false);
  });

  it('maps each role to their respective primary focus menu', () => {
    expect(getFocusMenuForRole('cashier')).toBe('/pos');
    expect(getFocusMenuForRole('inventory_staff')).toBe('/inventory');
    expect(getFocusMenuForRole('store_manager')).toBe('/reports');
    expect(getFocusMenuForRole('supervisor')).toBe('/reports');
    expect(getFocusMenuForRole('auditor')).toBe('/reports');
    expect(getFocusMenuForRole('owner')).toBe('/pos');
  });

  it('prohibits single-store non-global users from switching stores', () => {
    expect(canUserSwitchStore('owner', ['store-1'])).toBe(true);
    expect(canUserSwitchStore('auditor', ['store-1'])).toBe(true);
    expect(canUserSwitchStore('cashier', ['store-1'])).toBe(false);
    expect(canUserSwitchStore('store_manager', ['store-1'])).toBe(false);
    expect(canUserSwitchStore('store_manager', ['store-1', 'store-2'])).toBe(true);
  });

  it('accurately identifies when branch is already determined', () => {
    expect(
      isUserBranchDetermined({ id: '1', username: 'kasir', role: 'cashier', permissions: [], store_ids: ['store-1'] })
    ).toBe(true);

    // Owner is never restricted even with 1 store
    expect(
      isUserBranchDetermined({ id: '2', username: 'owner', role: 'owner', permissions: [], store_ids: ['store-1'] })
    ).toBe(false);

    // Auditor is never restricted
    expect(
      isUserBranchDetermined({ id: '3', username: 'auditor', role: 'auditor', permissions: [], store_ids: ['store-1'] })
    ).toBe(false);
  });
});
