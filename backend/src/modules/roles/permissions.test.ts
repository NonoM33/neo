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
import { SYSTEM_ROLES } from './system-roles';

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

// Avant l'ajout de `devis.manage`, /backoffice/quotes n'etait rattache a
// AUCUNE permission : permissionForPath renvoyait null, donc n'importe quel
// utilisateur du back-office pouvait lire tous les devis et leurs montants.
describe('permission Devis', () => {
  it('protege la section devis', () => {
    expect(permissionForPath('/backoffice/quotes')).toBe('devis.manage');
    expect(permissionForPath('/backoffice/quotes/new')).toBe('devis.manage');
    expect(permissionForPath('/backoffice/quotes/abc/edit')).toBe('devis.manage');
  });

  it('ne deborde pas sur la section projets', () => {
    expect(permissionForPath('/backoffice/projects')).toBe('projets.manage');
    expect(permissionForPath('/backoffice/projects/new')).toBe('projets.manage');
  });

  it('est refusee a qui ne l a pas, accordee au super-admin', () => {
    expect(hasPermission(['support.manage'], 'devis.manage')).toBe(false);
    expect(hasPermission(['devis.manage'], 'devis.manage')).toBe(true);
    expect(hasPermission([], 'devis.manage', true)).toBe(true);
  });
});

// Les roles systeme livres doivent pouvoir travailler : un commercial sans
// acces aux devis n'a plus de metier.
describe('roles systeme', () => {
  it('donne les devis a l integrateur et au commercial', () => {
    const byName = new Map(SYSTEM_ROLES.map((r) => [r.name, r.permissions]));
    expect(byName.get('integrateur')).toContain('devis.manage');
    expect(byName.get('commercial')).toContain('devis.manage');
    expect(byName.get('auditeur')).not.toContain('devis.manage');
  });

  it('ne declare que des permissions du catalogue', () => {
    // sanitizePermissions reordonne selon le catalogue : c'est l'ENSEMBLE qui
    // doit survivre, pas l'ordre de declaration.
    for (const role of SYSTEM_ROLES) {
      expect([...sanitizePermissions(role.permissions)].sort()).toEqual(
        [...role.permissions].sort()
      );
    }
  });
});
