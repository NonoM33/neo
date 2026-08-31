import { eq } from 'drizzle-orm';
import { db } from '../../config/database';
import { roles } from '../../db/schema';
import { PERMISSION_KEYS, sanitizePermissions } from './permissions';

/**
 * Built-in roles, seeded idempotently at startup. Their names are referenced
 * directly in code (e.g. devis dispatch looks up 'commercial'), so they must
 * always exist and cannot be deleted or renamed from the backoffice.
 */
export interface SystemRoleDef {
  name: string;
  description: string;
  permissions: string[];
}

export const SYSTEM_ROLES: SystemRoleDef[] = [
  {
    name: 'admin',
    description: 'Accès complet au backoffice (super-admin)',
    // Super-admin bypasses permission checks, but we still grant everything
    // for clarity in the roles UI.
    permissions: [...PERMISSION_KEYS],
  },
  {
    name: 'integrateur',
    description: 'Intégrateur : projets, clients, produits et planning',
    permissions: [
      'projets.manage',
      'devis.manage',
      'clients.manage',
      'produits.manage',
      'creneaux.manage',
      'activites.manage',
    ],
  },
  {
    name: 'commercial',
    description: 'Commercial : pipeline CRM, activités, objectifs et clients',
    permissions: [
      'crm.manage',
      'devis.manage',
      'activites.manage',
      'objectifs.manage',
      'clients.manage',
      'creneaux.manage',
    ],
  },
  {
    name: 'auditeur',
    description: 'Auditeur : accès en lecture, sans gestion backoffice',
    permissions: [],
  },
];

/**
 * Ensure every built-in role exists with `isSystem = true`. Creates missing
 * ones and flags pre-existing rows as system without clobbering an admin's
 * manual permission edits.
 */
export async function ensureSystemRoles(): Promise<void> {
  for (const def of SYSTEM_ROLES) {
    const [existing] = await db
      .select({ id: roles.id, isSystem: roles.isSystem })
      .from(roles)
      .where(eq(roles.name, def.name))
      .limit(1);

    if (!existing) {
      await db.insert(roles).values({
        name: def.name,
        description: def.description,
        permissions: sanitizePermissions(def.permissions),
        isSystem: true,
      });
      continue;
    }

    if (!existing.isSystem) {
      await db.update(roles).set({ isSystem: true }).where(eq(roles.id, existing.id));
    }
  }
}
