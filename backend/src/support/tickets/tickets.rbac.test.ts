import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { errorHandler } from '../../middleware/error.middleware';
import type { JWTPayload } from '../../middleware/auth.middleware';
import { supportStaffAcces, supportStaffEcriture } from './tickets.routes';

/**
 * Qui a le droit d'ouvrir le module Support, et pour y faire quoi.
 *
 * La regle vient de la definition des roles (`modules/roles/system-roles.ts`),
 * pas des gardes : « auditeur : acces en LECTURE, sans gestion backoffice ».
 * Un auditeur consulte donc les tickets ; il n'en cree pas, n'en assigne pas
 * et ne touche pas aux categories. Admin et integrateur gardent tout.
 *
 * Paye le 2026-09-24 : l'onglet Support est affiche a l'auditeur dans
 * l'application, et CHAQUE appel repondait 403 « Role requis: admin ou
 * integrateur ».
 *
 * Les gardes testes sont les instances EXPORTEES par le routeur, pas une
 * chaine recopiee ici : une copie heriterait des memes erreurs et les
 * confirmerait. L'authentification n'est pas rejouee — ce test ne juge que
 * les roles, et bouchonner le middleware partage le casserait pour les
 * autres fichiers de la suite.
 */

const app = new Hono();
app.onError(errorHandler);

let courant: JWTPayload;
app.use('*', async (c, next) => {
  c.set('user', courant);
  await next();
});
app.use('*', supportStaffAcces);
app.use('*', supportStaffEcriture);
app.all('/*', (c) => c.json({ ok: true }));

const profil = (role: string): JWTPayload => ({
  userId: `u-${role}`,
  email: `${role}@neo-domotique.fr`,
  role: role as JWTPayload['role'],
  roles: [role as JWTPayload['role']],
  permissions: [],
});

async function appel(role: string, method: string, chemin: string) {
  courant = profil(role);
  const res = await app.request(chemin, { method });
  return res.status;
}

describe('Support : qui peut lire, qui peut gerer', () => {
  const LECTURES = ['/', '/stats', '/categories', '/un-identifiant', '/un-identifiant/history'];

  it("l'auditeur consulte les tickets", async () => {
    for (const chemin of LECTURES) {
      expect([chemin, await appel('auditeur', 'GET', chemin)]).toEqual([chemin, 200]);
    }
  });

  it("l'integrateur et l'admin consultent aussi", async () => {
    for (const role of ['integrateur', 'admin']) {
      expect([role, await appel(role, 'GET', '/')]).toEqual([role, 200]);
    }
  });

  it("l'auditeur ne modifie rien", async () => {
    const ecritures: Array<[string, string]> = [
      ['POST', '/'],
      ['PUT', '/un-identifiant'],
      ['PUT', '/un-identifiant/assign'],
      ['PUT', '/un-identifiant/escalate'],
      ['POST', '/un-identifiant/comments'],
      ['POST', '/categories'],
      ['DELETE', '/categories/abc'],
    ];
    for (const [method, chemin] of ecritures) {
      expect([method, chemin, await appel('auditeur', method, chemin)])
        .toEqual([method, chemin, 403]);
    }
  });

  it("l'integrateur, lui, modifie", async () => {
    expect(await appel('integrateur', 'POST', '/')).toBe(200);
  });

  it('le commercial reste hors du module Support', async () => {
    expect(await appel('commercial', 'GET', '/')).toBe(403);
  });
});

describe('Le routeur emploie bien ces gardes', () => {
  // Les gardes ci-dessus ne valent que s'ils sont POSES sur le routeur reel.
  const source = readFileSync(
    new URL('./tickets.routes.ts', import.meta.url),
    'utf8'
  );

  it('la porte d entree et le filtre d ecriture sont montes', () => {
    expect(source).toContain("staffTickets.use('*', authMiddleware, supportStaffAcces)");
    expect(source).toContain("staffTickets.use('*', supportStaffEcriture)");
  });

  it('aucun garde du module ne reste pose a la main', () => {
    // Un `requireIntegrateurOrAdmin()` ecrit en dur sur le routeur
    // recloisonnerait le module et re-exclurait l'auditeur sans bruit.
    expect(source).not.toContain("staffTickets.use('*', authMiddleware, requireIntegrateurOrAdmin())");
  });
});
