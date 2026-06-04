import { describe, expect, it } from 'bun:test';
import {
  PERMISSIONS,
  PERMISSION_KEYS,
  ADMIN_ONLY_PERMISSIONS,
  isValidPermission,
  sanitizePermissions,
  aggregatePermissions,
  hasPermission,
  permissionForPath,
  groupedPermissions,
} from './permissions';

describe('permission catalog', () => {
  it('has unique keys and paths', () => {
    const keys = new Set(PERMISSIONS.map((p) => p.key));
    const paths = new Set(PERMISSIONS.map((p) => p.path));
    expect(keys.size).toBe(PERMISSIONS.length);
    expect(paths.size).toBe(PERMISSIONS.length);
  });

  it('exposes admin-only permissions that exist in the catalog', () => {
    for (const key of ADMIN_ONLY_PERMISSIONS) {
      expect(PERMISSION_KEYS).toContain(key);
    }
  });
});

describe('isValidPermission', () => {
  it('accepts known keys and rejects unknown ones', () => {
    expect(isValidPermission('crm.manage')).toBe(true);
    expect(isValidPermission('nope.invalid')).toBe(false);
    expect(isValidPermission('')).toBe(false);
  });
});

describe('sanitizePermissions', () => {
  it('drops unknown keys, de-duplicates, and orders by catalog', () => {
    const out = sanitizePermissions(['roles.manage', 'bogus', 'crm.manage', 'crm.manage']);
    expect(out).toEqual(['crm.manage', 'roles.manage']);
  });

  it('returns empty for empty input', () => {
    expect(sanitizePermissions([])).toEqual([]);
  });
});

describe('aggregatePermissions', () => {
  it('unions multiple role lists without duplicates, catalog-ordered', () => {
    const out = aggregatePermissions([
      ['crm.manage', 'activites.manage'],
      ['crm.manage', 'stock.manage'],
    ]);
    expect(out).toEqual(['stock.manage', 'crm.manage', 'activites.manage']);
  });

  it('ignores unknown keys', () => {
    expect(aggregatePermissions([['ghost'], ['clients.manage']])).toEqual(['clients.manage']);
  });
});

describe('hasPermission', () => {
  it('grants when the permission is present', () => {
    expect(hasPermission(['crm.manage'], 'crm.manage')).toBe(true);
  });

  it('denies when absent', () => {
    expect(hasPermission(['crm.manage'], 'stock.manage')).toBe(false);
  });

  it('always grants a super-admin', () => {
    expect(hasPermission([], 'roles.manage', true)).toBe(true);
  });
});

describe('permissionForPath', () => {
  it('maps a section path to its permission', () => {
    expect(permissionForPath('/backoffice/orders')).toBe('commandes.manage');
    expect(permissionForPath('/backoffice/orders/123')).toBe('commandes.manage');
    expect(permissionForPath('/backoffice/creneaux')).toBe('creneaux.manage');
    expect(permissionForPath('/backoffice/roles/new')).toBe('roles.manage');
  });

  it('maps nested CRM routes (incl. KPIs) to crm.manage', () => {
    expect(permissionForPath('/backoffice/crm/pipeline')).toBe('crm.manage');
    expect(permissionForPath('/backoffice/crm/kpis')).toBe('crm.manage');
  });

  it('returns null for unguarded paths', () => {
    expect(permissionForPath('/backoffice')).toBeNull();
    expect(permissionForPath('/backoffice/')).toBeNull();
    expect(permissionForPath('/backoffice/recette')).toBeNull();
  });

  it('does not match a path that merely shares a prefix string', () => {
    expect(permissionForPath('/backoffice/ordersXYZ')).toBeNull();
  });
});

describe('groupedPermissions', () => {
  it('groups every permission exactly once', () => {
    const groups = groupedPermissions();
    const flat = groups.flatMap((g) => g.permissions);
    expect(flat.length).toBe(PERMISSIONS.length);
  });
});
