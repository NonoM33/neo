/**
 * RBAC permission catalog.
 *
 * A permission is a fine-grained capability that can be ticked on a role.
 * Each backoffice section maps to exactly one permission via its route prefix,
 * which lets a single middleware enforce access without touching every handler.
 *
 * Pure module: no DB, no framework. Safe to unit-test in isolation.
 */

export interface Permission {
  /** Stable identifier stored on roles (never displayed raw). */
  key: string;
  /** Human label shown in the backoffice. */
  label: string;
  /** UI grouping (mirrors the sidebar sections). */
  group: string;
  /** Backoffice route prefix this permission guards. */
  path: string;
}

export const PERMISSIONS: Permission[] = [
  // Commerce
  { key: 'commandes.manage', label: 'Commandes', group: 'Commerce', path: '/backoffice/orders' },
  { key: 'factures.manage', label: 'Factures', group: 'Commerce', path: '/backoffice/invoices' },
  { key: 'stock.manage', label: 'Stock', group: 'Commerce', path: '/backoffice/stock' },
  { key: 'achats.manage', label: 'Achats fournisseurs', group: 'Commerce', path: '/backoffice/supplier-orders' },

  // CRM Commercial
  { key: 'crm.manage', label: 'Pipeline & KPIs', group: 'CRM Commercial', path: '/backoffice/crm' },
  { key: 'activites.manage', label: 'Activités', group: 'CRM Commercial', path: '/backoffice/activities' },
  { key: 'objectifs.manage', label: 'Objectifs', group: 'CRM Commercial', path: '/backoffice/objectives' },

  // Support
  { key: 'support.manage', label: 'Support & base de connaissances', group: 'Support', path: '/backoffice/support' },
  { key: 'box.manage', label: 'Box domotiques (flotte)', group: 'Support', path: '/backoffice/boxes' },

  // Communication
  { key: 'newsletter.manage', label: 'Newsletter', group: 'Communication', path: '/backoffice/newsletter' },

  // Gestion
  { key: 'clients.manage', label: 'Clients', group: 'Gestion', path: '/backoffice/clients' },
  { key: 'produits.manage', label: 'Produits', group: 'Gestion', path: '/backoffice/products' },
  { key: 'fournisseurs.manage', label: 'Fournisseurs', group: 'Gestion', path: '/backoffice/suppliers' },
  { key: 'projets.manage', label: 'Projets', group: 'Gestion', path: '/backoffice/projects' },
  { key: 'devis.manage', label: 'Devis', group: 'Gestion', path: '/backoffice/quotes' },

  // Planning
  { key: 'creneaux.manage', label: 'Créneaux de disponibilité', group: 'Planning', path: '/backoffice/creneaux' },

  // Administration (réservé aux admins)
  { key: 'utilisateurs.manage', label: 'Utilisateurs', group: 'Administration', path: '/backoffice/users' },
  { key: 'roles.manage', label: 'Rôles & permissions', group: 'Administration', path: '/backoffice/roles' },
  { key: 'api-tokens.manage', label: 'Jetons API', group: 'Administration', path: '/backoffice/api-tokens' },
];

/**
 * Permissions that, even when ticked on a role, only ever apply to a
 * legacy super-admin. Managing accounts and roles stays admin-only.
 */
export const ADMIN_ONLY_PERMISSIONS: readonly string[] = [
  'utilisateurs.manage',
  'roles.manage',
  'api-tokens.manage',
];

export const PERMISSION_KEYS: readonly string[] = PERMISSIONS.map((p) => p.key);

const PERMISSION_BY_KEY = new Map(PERMISSIONS.map((p) => [p.key, p]));

export function isValidPermission(key: string): boolean {
  return PERMISSION_BY_KEY.has(key);
}

/**
 * Keep only well-known permission keys, de-duplicated, in catalog order.
 * Used to sanitize form input before persisting a role.
 */
export function sanitizePermissions(input: readonly string[]): string[] {
  const wanted = new Set(input);
  return PERMISSIONS.filter((p) => wanted.has(p.key)).map((p) => p.key);
}

/** Union of several roles' permission lists, de-duplicated, in catalog order. */
export function aggregatePermissions(rolePermissionLists: readonly (readonly string[])[]): string[] {
  const wanted = new Set<string>();
  for (const list of rolePermissionLists) {
    for (const key of list) wanted.add(key);
  }
  return PERMISSIONS.filter((p) => wanted.has(p.key)).map((p) => p.key);
}

/**
 * Whether a user holding `userPermissions` may use `permissionKey`.
 * A super-admin (legacy admin role) always passes.
 */
export function hasPermission(
  userPermissions: readonly string[],
  permissionKey: string,
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true;
  return userPermissions.includes(permissionKey);
}

/**
 * Map a backoffice request path to the permission it requires.
 * Returns null for paths that every backoffice user may reach
 * (dashboard, recette, auth). Longest prefix wins.
 */
export function permissionForPath(path: string): string | null {
  let match: Permission | null = null;
  for (const perm of PERMISSIONS) {
    if (path === perm.path || path.startsWith(perm.path + '/')) {
      if (!match || perm.path.length > match.path.length) match = perm;
    }
  }
  return match ? match.key : null;
}

export interface PermissionGroupView {
  group: string;
  permissions: Permission[];
}

/** Permissions grouped by section, in catalog order, for checkbox rendering. */
export function groupedPermissions(): PermissionGroupView[] {
  const groups: PermissionGroupView[] = [];
  for (const perm of PERMISSIONS) {
    let group = groups.find((g) => g.group === perm.group);
    if (!group) {
      group = { group: perm.group, permissions: [] };
      groups.push(group);
    }
    group.permissions.push(perm);
  }
  return groups;
}
