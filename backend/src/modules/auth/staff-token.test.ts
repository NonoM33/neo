import { describe, expect, it } from 'bun:test';
import { buildStaffTokenPayload } from './auth.service';
import { userHasAnyRole } from '../../middleware/rbac.middleware';

// Le wizard "parcours" du back-office appelle les mêmes endpoints /api protégés
// que l'app de terrain. Il a donc besoin d'un token dont le payload franchit les
// mêmes gardes RBAC qu'un login normal. Ces tests verrouillent ce contrat sans
// base de données : si le payload change de forme, la garde casse ici d'abord.

describe('buildStaffTokenPayload', () => {
  it('produit exactement la forme du payload émis au login', () => {
    const payload = buildStaffTokenPayload({
      userId: 'user-1',
      email: 'commercial@neo.fr',
      role: 'integrateur',
      roles: ['integrateur', 'commercial'],
      permissions: ['crm.manage', 'projets.manage'],
    });

    expect(payload).toEqual({
      userId: 'user-1',
      email: 'commercial@neo.fr',
      role: 'integrateur',
      roles: ['integrateur', 'commercial'],
      permissions: ['crm.manage', 'projets.manage'],
    });
  });

  it('un token admin franchit les gardes pièces/devis du parcours', () => {
    const payload = buildStaffTokenPayload({
      userId: 'admin-1',
      email: 'admin@neo.fr',
      role: 'admin',
      roles: ['admin'],
      permissions: [],
    });

    // requireIntegrateurOrAdmin (projets, pièces, signatures)
    expect(userHasAnyRole(payload, ['admin', 'integrateur'])).toBe(true);
    // requireCRMAccess (devis)
    expect(userHasAnyRole(payload, ['admin', 'commercial', 'integrateur'])).toBe(true);
  });

  it('un commercial pur franchit la garde devis mais pas la garde pièces', () => {
    const payload = buildStaffTokenPayload({
      userId: 'com-1',
      email: 'com@neo.fr',
      role: 'auditeur',
      roles: ['commercial'],
      permissions: ['crm.manage'],
    });

    expect(userHasAnyRole(payload, ['admin', 'commercial', 'integrateur'])).toBe(true);
    expect(userHasAnyRole(payload, ['admin', 'integrateur'])).toBe(false);
  });
});
