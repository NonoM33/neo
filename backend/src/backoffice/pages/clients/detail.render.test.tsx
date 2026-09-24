import { describe, expect, it } from 'bun:test';
import { ClientDetailPage } from './detail';
import type { AdminUser } from '../../middleware/admin-auth';

// Bug remonte en recette (Louei, 2026-08-29) : sur la fiche d'un client tout
// juste cree, la carte Devis n'offrait AUCUN moyen d'ajouter un devis — seule
// la carte Activites avait son bouton "+ Ajouter". Ces tests rejouent la scene
// exacte : un client sans projet, sans devis.

async function renderToString(node: any): Promise<string> {
  return (await node.toString()) as string;
}

const admin: AdminUser = {
  id: 'user-1',
  email: 'admin@neo.fr',
  firstName: 'Renaud',
  lastName: 'Cosson',
  role: 'admin',
  permissions: [],
  isSuperAdmin: true,
};

const auditeur: AdminUser = {
  id: 'user-2',
  email: 'support@neo.fr',
  firstName: 'Sam',
  lastName: 'Support',
  role: 'auditeur',
  permissions: ['support.manage'],
  isSuperAdmin: false,
};

const client = {
  id: 'client-42',
  firstName: 'Test',
  lastName: 'Louei',
  email: 'testlouei@outlook.fr',
  phone: '01122365',
  address: '26 rue anatole',
  city: 'saint denis',
  postalCode: '93000',
  notes: 'budget 10k',
  createdAt: new Date('2026-08-29T10:00:00Z'),
};

function renderFresh(user: AdminUser) {
  return renderToString(
    ClientDetailPage({
      client,
      projects: [],
      quotes: [],
      activities: [],
      tickets: [],
      leads: [],
      comments: [],
      user,
    }) as any
  );
}

describe('ClientDetailPage — creation depuis la fiche client', () => {
  it('propose de creer un devis meme quand le client n a aucun projet', async () => {
    const html = await renderFresh(admin);
    expect(html).toContain('/backoffice/quotes/new?clientId=client-42');
  });

  it('propose de creer un projet', async () => {
    const html = await renderFresh(admin);
    expect(html).toContain('/backoffice/projects/new?clientId=client-42');
  });

  it('garde le bouton Ajouter des activites', async () => {
    const html = await renderFresh(admin);
    expect(html).toContain('/backoffice/activities/new?clientId=client-42');
  });

  it('cache ces raccourcis a un utilisateur qui n a ni Projets ni Devis', async () => {
    const html = await renderFresh(auditeur);
    expect(html).not.toContain('/backoffice/quotes/new');
    expect(html).not.toContain('/backoffice/projects/new');
    // Les activites, elles, restent accessibles.
    expect(html).toContain('/backoffice/activities/new?clientId=client-42');
  });

  // Les deux cartes ne dependent pas de la meme permission : un role qui gere
  // les projets sans gerer les devis ne doit voir qu'un seul des deux boutons.
  it('separe la permission Projets de la permission Devis', async () => {
    const chefProjet: AdminUser = {
      ...auditeur,
      permissions: ['projets.manage'],
    };
    const html = await renderFresh(chefProjet);
    expect(html).toContain('/backoffice/projects/new?clientId=client-42');
    expect(html).not.toContain('/backoffice/quotes/new');

    const commercial: AdminUser = { ...auditeur, permissions: ['devis.manage'] };
    const html2 = await renderFresh(commercial);
    expect(html2).toContain('/backoffice/quotes/new?clientId=client-42');
    expect(html2).not.toContain('/backoffice/projects/new');
  });

  it('rend un devis existant cliquable vers sa fiche', async () => {
    const html = await renderToString(
      ClientDetailPage({
        client,
        projects: [
          { id: 'proj-1', name: 'Installation', status: 'brouillon', createdAt: new Date(), quotesCount: 1, totalTTC: '1200.00' },
        ],
        quotes: [
          {
            id: 'quote-7',
            number: 'DEV-2026-0007',
            status: 'brouillon',
            totalHT: '1000.00',
            totalTTC: '1200.00',
            projectId: 'proj-1',
            projectName: 'Installation',
            createdAt: new Date(),
          },
        ],
        activities: [],
        tickets: [],
        leads: [],
        comments: [],
        user: admin,
      }) as any
    );

    expect(html).toContain('/backoffice/quotes/quote-7');
  });
});
